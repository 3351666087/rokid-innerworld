import { readFile } from "node:fs/promises";
import {
  INNERWORLD_SERVICE_NAME,
  buildDemoStatus,
  buildDeviceBootstrap as buildDeviceBootstrapPayload,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";
import { buildDeviceManifest, createDeviceRuntimeStore } from "../domain/device-runtime.js";
import { buildEvidenceChain } from "../domain/evidence-chain.js";
import { buildFieldAcceptance } from "../domain/field-acceptance.js";
import { buildFieldMarkerManifest } from "../domain/field-markers.js";
import { buildSessionPlan } from "../domain/session-planner.js";
import { applyInteraction, applyServiceAction, applyWriteBack } from "../domain/mission-engine.js";
import { buildServiceActionAck, createServiceActionRecord, sanitizeServiceActionValue } from "../domain/service-action-runtime.js";
import { buildWallCalibrationManifest, createWallCalibrationObservation } from "../domain/wall-calibration.js";
import { generateHudOutput } from "../domain/hud-generator.js";
import { readJson } from "../lib/json-file.js";
import { readBody, sendError, sendJson } from "./response.js";

const HARDWARE_OBSERVATION_TRACKING_MODES = new Set(["qr", "image_tracking", "slam"]);

function getRequestBaseUrl(req, url, port) {
  const explicitBaseUrl = url.searchParams.get("base_url") || url.searchParams.get("public_url");
  if (explicitBaseUrl && /^https?:\/\//i.test(explicitBaseUrl)) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }
  return new URL("/", `http://${req.headers.host || `localhost:${port}`}`).origin;
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

export function createApiRouter({
  aiPromptPath,
  aiSchemaPath,
  buildOpsStatus,
  fieldMarkersPath,
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
      sendJson(res, 200, await buildOpsStatus());
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

    if (req.method === "GET" && url.pathname === "/api/field/acceptance") {
      sendJson(res, 200, await loadFieldAcceptance(req, url));
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
      sendJson(res, 201, deviceRuntime.issuePairing({ body }));
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
          completed_steps: state.completed_steps
        },
        beacons: state.beacons
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/pins/nearby") {
      const space = await loadSpace();
      const state = await loadState();
      sendJson(res, 200, {
        space_id: space.space_id,
        radius_m: Number(url.searchParams.get("radius") || 20),
        pins: space.anchors.map((anchor) => ({
          ...anchor,
          beacons: state.beacons.filter((beacon) => beacon.anchor_id === anchor.anchor_id)
        }))
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
      const updated = await updateState((state, latestSpace) => {
        return applyWriteBack({ state, space: latestSpace, body, text });
      });
      const ledger = sqliteStore?.appendMissionLedgerEvent?.({
        type: "write_back",
        space: updated.space,
        payload: body,
        result: missionResultSummary("write_back", updated),
        state: updated.state
      }) || null;
      sendJson(res, 201, { ok: true, beacon: updated.result, state: updated.state, ledger });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/interactions") {
      const body = await readBody(req);
      const updated = await updateState((state, space) => {
        return applyInteraction({ state, space, body });
      });
      const ledger = sqliteStore?.appendMissionLedgerEvent?.({
        type: "interaction",
        space: updated.space,
        payload: body,
        result: missionResultSummary("interaction", updated),
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
      const updated = await updateState((state, space) => {
        return applyServiceAction({ state, space, body: safeBody, createdAt });
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
          service_action_status: storedRecord.status
        },
        result: {
          ...missionResultSummary("service_action", updated),
          action_record_id: storedRecord.action_record_id,
          service_action_status: storedRecord.status,
          created_at: storedRecord.created_at
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
