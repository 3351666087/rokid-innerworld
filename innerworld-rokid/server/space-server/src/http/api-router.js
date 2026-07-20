import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import {
  INNERWORLD_SERVICE_NAME,
  buildDemoStatus,
  buildDeviceBootstrap as buildDeviceBootstrapPayload,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";
import { buildDeviceManifest, buildRokidLiveAdapterChecklist, createDeviceRuntimeStore } from "../domain/device-runtime.js";
import { buildEvidenceChain } from "../domain/evidence-chain.js";
import { buildFieldAcceptance, buildFieldTargetReadiness } from "../domain/field-acceptance.js";
import { buildFieldMarkerManifest } from "../domain/field-markers.js";
import { buildFieldOperatorPlan } from "../domain/field-operator-plan.js";
import { buildSessionPlan } from "../domain/session-planner.js";
import { applyInteraction, applyServiceAction, applyWriteBack } from "../domain/mission-engine.js";
import { buildServiceActionAck, createServiceActionRecord, sanitizeServiceActionValue } from "../domain/service-action-runtime.js";
import { buildWallCalibrationManifest, createWallCalibrationObservation } from "../domain/wall-calibration.js";
import { generateHudOutput } from "../domain/hud-generator.js";
import { readJson } from "../lib/json-file.js";
import { readBody, sendError, sendJson } from "./response.js";

const HARDWARE_OBSERVATION_TRACKING_MODES = new Set(["qr", "image_tracking", "slam"]);
const OPERATOR_PAIRING_PIN_ENV = "INNERWORLD_OPERATOR_PIN";

function getRequestBaseUrl(req, url, port) {
  const explicitBaseUrl = url.searchParams.get("base_url") || url.searchParams.get("public_url");
  if (explicitBaseUrl && /^https?:\/\//i.test(explicitBaseUrl)) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }
  return new URL("/", `http://${req.headers.host || `localhost:${port}`}`).origin;
}

function normalizeRemoteAddress(value) {
  return String(value || "").trim().replace(/^::ffff:/i, "");
}

function isLoopbackAddress(value) {
  const address = normalizeRemoteAddress(value);
  return address === "::1" || address === "localhost" || address === "127.0.0.1" || /^127\./.test(address);
}

function readOperatorPin(req, body) {
  const headerValue = req.headers["x-innerworld-operator-pin"];
  const value = body?.operator_pin ?? body?.operatorPin ?? body?.operator?.pin ?? headerValue;
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function timingSafeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  try {
    return leftBuffer.length > 0 && timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function buildPairingGateState({ status, mode, remoteAddress, issues = [] }) {
  return {
    schema: "innerworld-device-pairing-operator-gate/v1",
    status,
    mode,
    remote: isLoopbackAddress(remoteAddress) ? "loopback" : "non_loopback",
    issue_endpoint_default: "loopback_windows_host_only",
    lan_override_env: OPERATOR_PAIRING_PIN_ENV,
    pin_persisted: false,
    issues
  };
}

export function authorizeDevicePairingIssue(req, body) {
  const remoteAddress = normalizeRemoteAddress(req.socket?.remoteAddress);
  if (isLoopbackAddress(remoteAddress)) {
    return {
      ok: true,
      operator_gate: buildPairingGateState({ status: "passed", mode: "loopback", remoteAddress })
    };
  }

  const configuredPin = String(process.env[OPERATOR_PAIRING_PIN_ENV] || "").trim();
  if (!configuredPin) {
    return {
      ok: false,
      status: 403,
      error: "device_pairing_operator_gate_failed",
      issues: ["non_loopback_pairing_requires_operator_pin_config"],
      operator_gate: buildPairingGateState({
        status: "rejected",
        mode: "operator_pin_required",
        remoteAddress,
        issues: ["non_loopback_pairing_requires_operator_pin_config"]
      })
    };
  }

  const submittedPin = readOperatorPin(req, body);
  if (!timingSafeTextEqual(submittedPin, configuredPin)) {
    return {
      ok: false,
      status: 403,
      error: "device_pairing_operator_gate_failed",
      issues: ["operator_pin_missing_or_invalid"],
      operator_gate: buildPairingGateState({
        status: "rejected",
        mode: "operator_pin_required",
        remoteAddress,
        issues: ["operator_pin_missing_or_invalid"]
      })
    };
  }

  return {
    ok: true,
    operator_gate: buildPairingGateState({ status: "passed", mode: "operator_pin", remoteAddress })
  };
}

function missionResultSummary(type, updated) {
  if (type === "write_back") {
    return updated.result || {};
  }
  return {
    mission_state: updated.state?.mission_state || null,
    current_step_index: updated.state?.current_step_index ?? 0,
    completed_steps: Array.isArray(updated.state?.completed_steps) ? updated.state.completed_steps.slice() : [],
    beacon_count: Array.isArray(updated.state?.beacons) ? updated.state.beacons.length : 0
  };
}

function missionActionAnchor(body = {}, fallback = "A1") {
  return String(body.anchor_id || body.anchorId || fallback || "").trim();
}

function trustedMissionProvenance(deviceRuntime, body = {}, actionType, fallbackAnchorId = "A1") {
  const anchorId = missionActionAnchor(body, fallbackAnchorId);
  return deviceRuntime.resolveTrustedMissionProvenance({
    sessionId: body.session_id || body.sessionId,
    deviceId: body.device_id || body.deviceId,
    anchorId,
    actionType,
    source: body.source
  });
}

function missionProvenanceSource(body = {}, provenance = {}) {
  if (provenance.trusted === true) return "trusted_hardware";
  if (body.trusted_hardware_session === true || body.hardware_ready_claim_allowed === true) return "claimed_hardware_untrusted";
  if (body.fallback_no_hardware_claim === true || body.source === "check-scene-targets rehearsal") return "rehearsal";
  return "untrusted_client";
}

function applyMissionProvenanceSummary(state, body = {}, provenance = {}, actionType = "interaction", anchorId = "A1") {
  const sourceStatus = missionProvenanceSource(body, provenance);
  const trusted = provenance.trusted === true;
  const previous = state.mission_provenance || {};
  const mutationCount = Number(previous.mutation_count || 0) + 1;
  const trustedMutationCount = Number(previous.trusted_mutation_count || 0) + (trusted ? 1 : 0);
  const rehearsalMutationCount = Number(previous.rehearsal_mutation_count || 0) + (trusted ? 0 : 1);
  state.mission_provenance = {
    schema: "innerworld-mission-provenance/v1",
    state_provenance_status: trusted ? "trusted_hardware" : "rehearsal",
    last_mutation_source_status: sourceStatus,
    last_action_type: actionType,
    last_anchor_id: anchorId,
    last_source: String(body.source || "").trim() || "unknown_client",
    trusted_hardware_session: trusted,
    trusted_mission_provenance: trusted,
    rehearsal_complete_allowed: true,
    hardware_ready_claim_allowed: trusted,
    fallback_no_hardware_claim: !trusted,
    mutation_count: mutationCount,
    trusted_mutation_count: trustedMutationCount,
    rehearsal_mutation_count: rehearsalMutationCount,
    blockers: Array.isArray(provenance.blockers) ? provenance.blockers.slice(0, 8) : []
  };
  return state.mission_provenance;
}

function buildNearbyAnchorPin(anchor, state) {
  return {
    ...anchor,
    pin_id: anchor.anchor_id,
    pin_kind: "anchored",
    pin_type: "anchor",
    kind: anchor.kind || "anchor",
    anchor_mode: "wall_anchor",
    beacons: state.beacons.filter((beacon) => beacon.anchor_id === anchor.anchor_id)
  };
}

function buildNearbySemanticPin(pin) {
  return {
    ...pin,
    pin_kind: pin.pin_kind || "semantic",
    anchor_id: pin.anchor_id || null,
    kind: pin.kind || pin.pin_type || "semantic",
    label: pin.label || pin.title || pin.pin_id,
    default_state: pin.default_state || "available",
    pose: pin.pose || pin.spatial?.local_pose || null,
    grid_pos: pin.grid_pos || null,
    beacons: Array.isArray(pin.beacons) ? pin.beacons : []
  };
}

export function createApiRouter({
  aiPromptPath,
  aiSchemaPath,
  buildOpsStatus,
  fieldMarkersPath,
  fieldTargetAssetsDir,
  loadSpace,
  loadState,
  port,
  resetState,
  sqliteStore,
  updateState
}) {
  const deviceRuntime = createDeviceRuntimeStore({
    restoreSnapshot: !sqliteStore,
    sessionStore: sqliteStore
  });

  async function loadDeviceBootstrap(req, url) {
    const [space, state, aiSchema] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath)
    ]);
    const baseUrl = getRequestBaseUrl(req, url, port);
    return buildDeviceBootstrapPayload({
      baseUrl,
      profile: url.searchParams.get("profile") || "rokid-ar",
      space,
      state,
      aiSchema
    });
  }

  async function loadDeviceManifest(req, url) {
    const [space, state, aiSchema] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath)
    ]);
    return buildDeviceManifest({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      aiSchema
    });
  }

  async function loadDeviceAdapterChecklist(req, url, opsStatus = null) {
    const [wallCalibration, fieldMarkers, resolvedOpsStatus] = await Promise.all([
      loadWallCalibration(req, url),
      loadFieldMarkers(req, url),
      opsStatus ? Promise.resolve(opsStatus) : buildOpsStatus()
    ]);
    return buildRokidLiveAdapterChecklist({
      baseUrl: getRequestBaseUrl(req, url, port),
      deviceSessions: deviceRuntime.sessionsSummary(),
      wallCalibration,
      fieldMarkers,
      opsStatus: resolvedOpsStatus
    });
  }

  async function loadEvidenceChain(req, url) {
    const [space, state, aiSchema, opsStatus] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath),
      buildOpsStatus()
    ]);
    return buildEvidenceChain({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      aiSchema,
      opsStatus
    });
  }

  async function loadSessionPlan(req, url) {
    const [space, state, aiSchema] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath)
    ]);
    return buildSessionPlan({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      aiSchema
    });
  }

  async function loadWallCalibration(req, url) {
    const [space, state] = await Promise.all([
      loadSpace(),
      loadState()
    ]);
    return buildWallCalibrationManifest({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      summary: sqliteStore?.wallCalibrationSummary?.() || null
    });
  }

  async function loadFieldMarkers(req, url) {
    const [space, state, markerConfig] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(fieldMarkersPath)
    ]);
    const baseUrl = getRequestBaseUrl(req, url, port);
    const wallCalibration = buildWallCalibrationManifest({
      baseUrl,
      space,
      state,
      summary: sqliteStore?.wallCalibrationSummary?.() || null
    });
    return buildFieldMarkerManifest({
      baseUrl,
      space,
      markerConfig,
      wallCalibration
    });
  }

  async function loadFieldAcceptance(req, url) {
    const [space, state, markerConfig, opsStatus] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(fieldMarkersPath),
      buildOpsStatus()
    ]);
    const baseUrl = getRequestBaseUrl(req, url, port);
    const wallCalibration = buildWallCalibrationManifest({
      baseUrl,
      space,
      state,
      summary: sqliteStore?.wallCalibrationSummary?.() || null
    });
    const fieldMarkers = buildFieldMarkerManifest({
      baseUrl,
      space,
      markerConfig,
      wallCalibration
    });
    const ledgerSummary = sqliteStore?.missionLedgerSummary?.() || null;

    return buildFieldAcceptance({
      baseUrl,
      space,
      state,
      wallCalibration,
      fieldMarkers,
      ledgerSummary,
      opsStatus
    });
  }

  async function loadFieldTargetReadiness(req, url) {
    const baseUrl = getRequestBaseUrl(req, url, port);
    const fieldAcceptance = await loadFieldAcceptance(req, url);
    return buildFieldTargetReadiness({
      baseUrl,
      fieldAcceptance
    });
  }

  async function loadFieldOperatorPlan(req, url) {
    const [space, state, markerConfig, opsStatus] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(fieldMarkersPath),
      buildOpsStatus()
    ]);
    const baseUrl = getRequestBaseUrl(req, url, port);
    const wallCalibration = buildWallCalibrationManifest({
      baseUrl,
      space,
      state,
      summary: sqliteStore?.wallCalibrationSummary?.() || null
    });
    const fieldMarkers = buildFieldMarkerManifest({
      baseUrl,
      space,
      markerConfig,
      wallCalibration
    });
    const fieldAcceptance = buildFieldAcceptance({
      baseUrl,
      space,
      state,
      wallCalibration,
      fieldMarkers,
      ledgerSummary: sqliteStore?.missionLedgerSummary?.() || null,
      opsStatus
    });
    const targetReadiness = buildFieldTargetReadiness({
      baseUrl,
      fieldAcceptance
    });
    const deviceSessions = deviceRuntime.sessionsSummary();
    const adapterChecklist = buildRokidLiveAdapterChecklist({
      baseUrl,
      deviceSessions,
      wallCalibration,
      fieldMarkers,
      opsStatus
    });

    return buildFieldOperatorPlan({
      space,
      state,
      fieldAcceptance,
      targetReadiness,
      deviceSessions,
      adapterChecklist,
      wallCalibration,
      opsStatus
    });
  }

  function serveFieldTargetAsset(res, fileName) {
    if (!fieldTargetAssetsDir || !fileName) {
      sendError(res, 404, "field_target_asset_not_found");
      return;
    }

    const decoded = decodeURIComponent(fileName);
    if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) {
      sendError(res, 400, "field_target_asset_invalid");
      return;
    }

    const target = path.resolve(fieldTargetAssetsDir, decoded);
    const root = path.resolve(fieldTargetAssetsDir);
    if (!target.startsWith(root + path.sep) || !existsSync(target)) {
      sendError(res, 404, "field_target_asset_not_found");
      return;
    }

    const ext = path.extname(target).toLowerCase();
    const contentType = ext === ".svg"
      ? "image/svg+xml; charset=utf-8"
      : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "";
    if (!contentType) {
      sendError(res, 415, "field_target_asset_unsupported_type");
      return;
    }

    res.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    createReadStream(target).pipe(res);
  }

  return async function routeApi(req, res, url) {
    if (req.method === "GET" && url.pathname === "/api/health") {
      const space = await loadSpace();
      const state = await loadState();
      sendJson(res, 200, {
        ok: true,
        service: INNERWORLD_SERVICE_NAME,
        port,
        time: new Date().toISOString(),
        ...buildDemoStatus(space, state)
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      sendJson(res, 200, await loadState());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ops/status") {
      const opsStatus = await buildOpsStatus();
      const adapterChecklist = await loadDeviceAdapterChecklist(req, url, opsStatus);
      sendJson(res, 200, {
        ...opsStatus,
        adapter_checklist: {
          schema: adapterChecklist.schema,
          endpoint: adapterChecklist.endpoint,
          status: adapterChecklist.status,
          ready: adapterChecklist.ready,
          summary: adapterChecklist.summary,
          blocking_items: adapterChecklist.blocking_items.slice(0, 5),
          final_direction: adapterChecklist.final_direction,
          generic_tour_or_ugc: adapterChecklist.scope_guard.generic_tour_or_ugc
        }
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/store/status") {
      sendJson(res, 200, sqliteStore?.status?.() || {
        ok: false,
        error: "sqlite_store_unavailable"
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/datasets/catalog") {
      sendJson(res, 200, sqliteStore?.catalog?.() || {
        ok: false,
        error: "dataset_store_unavailable"
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/datasets/call") {
      const body = await readBody(req);
      const result = sqliteStore?.datasetCall?.(body) || {
        ok: false,
        status: 503,
        error: "dataset_store_unavailable"
      };
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "dataset_call_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ledger/summary") {
      sendJson(res, 200, sqliteStore?.missionLedgerSummary?.() || {
        ok: false,
        error: "mission_ledger_unavailable"
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ledger/events") {
      const result = sqliteStore?.missionLedgerEvents?.({
        limit: url.searchParams.get("limit") || 50,
        type: url.searchParams.get("type") || ""
      }) || {
        ok: false,
        status: 503,
        error: "mission_ledger_unavailable"
      };
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "ledger_events_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/evidence/chain") {
      sendJson(res, 200, await loadEvidenceChain(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/session/plan") {
      sendJson(res, 200, await loadSessionPlan(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/calibration/wall") {
      sendJson(res, 200, await loadWallCalibration(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/field/markers") {
      sendJson(res, 200, await loadFieldMarkers(req, url));
      return;
    }

    const fieldAssetMatch = url.pathname.match(/^\/api\/field\/assets\/([^/]+)$/);
    if (req.method === "GET" && fieldAssetMatch) {
      serveFieldTargetAsset(res, fieldAssetMatch[1]);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/field/acceptance") {
      sendJson(res, 200, await loadFieldAcceptance(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/field/target-readiness") {
      sendJson(res, 200, await loadFieldTargetReadiness(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/field/operator-plan") {
      sendJson(res, 200, await loadFieldOperatorPlan(req, url));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/calibration/observations") {
      const [space, body] = await Promise.all([
        loadSpace(),
        readBody(req)
      ]);
      const trackingMode = String(body.tracking_mode || "").trim().toLowerCase();
      const hardwareObservationProof = HARDWARE_OBSERVATION_TRACKING_MODES.has(trackingMode)
        ? deviceRuntime.resolveHardwareObservationProof({
            sessionId: body.session_id,
            deviceId: body.device_id,
            anchorId: body.anchor_id,
            trackingMode: body.tracking_mode,
            referenceTime: new Date()
          })
        : null;
      const observation = createWallCalibrationObservation({
        body,
        space,
        receivedAt: new Date().toISOString(),
        hardwareObservationProof
      });
      const stored = sqliteStore?.appendWallCalibrationObservation?.(observation) || observation;
      sendJson(res, 201, {
        ok: true,
        observation: stored,
        summary: sqliteStore?.wallCalibrationSummary?.() || null
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/bootstrap") {
      sendJson(res, 200, await loadDeviceBootstrap(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/manifest") {
      sendJson(res, 200, await loadDeviceManifest(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/adapter-checklist") {
      sendJson(res, 200, await loadDeviceAdapterChecklist(req, url));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/device/register") {
      const [space, state, aiSchema, body] = await Promise.all([
        loadSpace(),
        loadState(),
        readJson(aiSchemaPath),
        readBody(req)
      ]);
      const result = deviceRuntime.register({
        body,
        baseUrl: getRequestBaseUrl(req, url, port),
        space,
        state,
        aiSchema
      });
      if (result.ok === false) {
        sendJson(res, result.status || 400, {
          ok: false,
          error: result.error || "device_register_failed",
          issues: result.issues,
          pairing: result.pairing
        });
        return;
      }
      sendJson(res, 201, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/device/pairing") {
      const body = await readBody(req);
      const operatorGate = authorizeDevicePairingIssue(req, body);
      if (!operatorGate.ok) {
        sendJson(res, operatorGate.status || 403, {
          ok: false,
          error: operatorGate.error || "device_pairing_operator_gate_failed",
          issues: operatorGate.issues,
          operator_gate: operatorGate.operator_gate,
          privacy: "Operator PINs and pairing codes are never echoed back or persisted."
        });
        return;
      }
      sendJson(res, 201, deviceRuntime.issuePairing({ body, operatorGate: operatorGate.operator_gate }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/device/heartbeat") {
      const [space, state, body] = await Promise.all([
        loadSpace(),
        loadState(),
        readBody(req)
      ]);
      const result = deviceRuntime.heartbeat({
        body,
        baseUrl: getRequestBaseUrl(req, url, port),
        space,
        state
      });
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "device_heartbeat_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/sessions") {
      sendJson(res, 200, deviceRuntime.sessionsSummary());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ai/schema") {
      sendJson(res, 200, await readJson(aiSchemaPath));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ai/prompt") {
      const prompt = await readFile(aiPromptPath, "utf8");
      sendJson(res, 200, {
        ok: true,
        title: "InnerWorld HUD Prompt",
        format: "markdown",
        prompt: prompt.replace(/^\uFEFF/, "")
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/hud") {
      const [space, state, aiSchema, body] = await Promise.all([
        loadSpace(),
        loadState(),
        readJson(aiSchemaPath),
        readBody(req)
      ]);
      sendJson(res, 200, generateHudOutput({ space, state, aiSchema, body }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reset") {
      const state = await resetState();
      sendJson(res, 200, state);
      return;
    }

    const spaceMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)$/);
    if (req.method === "GET" && spaceMatch) {
      const space = await loadSpace();
      const state = await loadState();
      if (spaceMatch[1] !== space.space_id) {
        sendError(res, 404, "space_not_found");
        return;
      }
      normalizeMissionState(space, state);
      sendJson(res, 200, {
        ...space,
        runtime: {
          active_user: state.active_user,
          mission_state: state.mission_state,
          current_step_index: state.current_step_index,
          completed_steps: state.completed_steps,
          mission_provenance: state.mission_provenance || null
        },
        beacons: state.beacons
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/pins/nearby") {
      const space = await loadSpace();
      const state = await loadState();
      const anchoredPins = space.anchors.map((anchor) => buildNearbyAnchorPin(anchor, state));
      const semanticPins = Array.isArray(space.semantic_pins)
        ? space.semantic_pins.map((pin) => buildNearbySemanticPin(pin))
        : [];
      sendJson(res, 200, {
        space_id: space.space_id,
        radius_m: Number(url.searchParams.get("radius") || 20),
        p0_anchor_count: anchoredPins.length,
        semantic_preview_count: semanticPins.filter((pin) => pin.controlled_demo === true && pin.open_ugc_allowed === false).length,
        pin_counts: {
          anchored: anchoredPins.length,
          semantic: semanticPins.length,
          total: anchoredPins.length + semanticPins.length
        },
        pins: [...anchoredPins, ...semanticPins]
      });
      return;
    }

    const beaconsMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)\/beacons$/);
    if (req.method === "POST" && beaconsMatch) {
      const space = await loadSpace();
      if (beaconsMatch[1] !== space.space_id) {
        sendError(res, 404, "space_not_found");
        return;
      }
      const body = await readBody(req);
      const text = String(body.text || "").trim();
      if (!text) {
        sendError(res, 400, "text_required");
        return;
      }
      const provenance = trustedMissionProvenance(deviceRuntime, body, "write_back", "A3");
      const updated = await updateState((state, latestSpace) => {
        const beacon = applyWriteBack({ state, space: latestSpace, body, text });
        applyMissionProvenanceSummary(state, body, provenance, "write_back", "A3");
        return beacon;
      });
      const ledger = sqliteStore?.appendMissionLedgerEvent?.({
        type: "write_back",
        space: updated.space,
        payload: {
          ...body,
          trusted_mission_provenance: provenance
        },
        result: {
          ...missionResultSummary("write_back", updated),
          trusted_mission_provenance: provenance
        },
        state: updated.state
      }) || null;
      sendJson(res, 201, { ok: true, beacon: updated.result, state: updated.state, ledger });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/interactions") {
      const body = await readBody(req);
      const provenance = trustedMissionProvenance(deviceRuntime, body, "interaction", missionActionAnchor(body, body.user_id === "B" ? "A3" : "A2"));
      const provenanceAnchor = missionActionAnchor(body, body.user_id === "B" ? "A3" : "A2");
      const updated = await updateState((state, space) => {
        const result = applyInteraction({ state, space, body });
        applyMissionProvenanceSummary(state, body, provenance, "interaction", provenanceAnchor);
        return result;
      });
      const ledger = sqliteStore?.appendMissionLedgerEvent?.({
        type: "interaction",
        space: updated.space,
        payload: {
          ...body,
          trusted_mission_provenance: provenance
        },
        result: {
          ...missionResultSummary("interaction", updated),
          trusted_mission_provenance: provenance
        },
        state: updated.state
      }) || null;
      sendJson(res, 200, { ok: true, state: updated.state, ledger });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/service-actions/outbox") {
      const result = sqliteStore?.listServiceActionOutbox?.({
        limit: url.searchParams.get("limit") || 50,
        status: url.searchParams.get("status") || "pending"
      }) || {
        ok: false,
        status: 503,
        error: "service_action_outbox_unavailable"
      };
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "service_action_outbox_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    const serviceActionAckMatch = url.pathname.match(/^\/api\/service-actions\/([^/]+)\/ack$/);
    if (req.method === "POST" && serviceActionAckMatch) {
      const body = await readBody(req);
      const actionRecordId = decodeURIComponent(serviceActionAckMatch[1]);
      const createdAt = new Date().toISOString();
      const ack = buildServiceActionAck({ body, record: { action_record_id: actionRecordId }, createdAt });
      const result = sqliteStore?.ackServiceActionRecord?.({ actionRecordId, ack, createdAt }) || {
        ok: false,
        status: 503,
        error: "service_action_outbox_unavailable"
      };
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "service_action_ack_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/service-actions") {
      const body = await readBody(req);
      const createdAt = new Date().toISOString();
      const safeBody = sanitizeServiceActionValue(body) || {};
      const provenance = trustedMissionProvenance(deviceRuntime, body, "service_action", missionActionAnchor(safeBody, "A3"));
      const provenanceAnchor = missionActionAnchor(safeBody, "A3");
      const updated = await updateState((state, space) => {
        const result = applyServiceAction({ state, space, body: safeBody, createdAt });
        applyMissionProvenanceSummary(state, body, provenance, "service_action", provenanceAnchor);
        return result;
      });
      const record = createServiceActionRecord({
        body,
        space: updated.space,
        state: updated.state,
        createdAt
      });
      const storedRecord = sqliteStore?.appendServiceActionRecord?.(record) || record;
      const ledger = sqliteStore?.appendMissionLedgerEvent?.({
        type: "service_action",
        space: updated.space,
        payload: {
          ...storedRecord.payload,
          action_record_id: storedRecord.action_record_id,
          service_action_status: storedRecord.status,
          trusted_mission_provenance: provenance
        },
        result: {
          ...missionResultSummary("service_action", updated),
          action_record_id: storedRecord.action_record_id,
          service_action_status: storedRecord.status,
          created_at: storedRecord.created_at,
          trusted_mission_provenance: provenance
        },
        state: updated.state
      }) || null;
      sendJson(res, 200, {
        ok: true,
        action: storedRecord.payload,
        record: storedRecord,
        outbox: {
          status: storedRecord.status,
          action_record_id: storedRecord.action_record_id
        },
        state: sanitizeServiceActionValue(updated.state),
        ledger
      });
      return;
    }

    sendError(res, 404, "api_route_not_found");
  };
}
