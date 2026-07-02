import {
  ACCEPTANCE_TARGETS,
  FIELD_ACCEPTANCE_SCHEMA,
  anchors,
  beacons,
  buildEndpointMap,
  cleanPublicBaseUrl,
  completedSteps,
  missionSteps,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";

const REQUIRED_ANCHOR_IDS = ["A1", "A2", "A3"];
const REQUIRED_MARKER_IDS = ["A1:qr-entry", "A2:image-target", "A3:image-target"];
const HARDWARE_TRACKING_MODES = ["qr", "image_tracking", "slam"];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countStatus(gates, status) {
  return gates.filter((gate) => gate.status === status).length;
}

function gate({ id, title, status, summary, source, required = [], evidence = {}, requiredTrackingModes = null }) {
  const payload = {
    id,
    label: title,
    title,
    status,
    summary,
    source,
    required,
    evidence
  };
  if (requiredTrackingModes) {
    payload.required_tracking_modes = requiredTrackingModes;
  }
  return payload;
}

function markerIds(fieldMarkers) {
  return list(fieldMarkers?.markers).map((marker) => marker?.marker?.marker_id).filter(Boolean).sort();
}

function fieldMarkerGate(fieldMarkers) {
  const ids = markerIds(fieldMarkers);
  const missing = REQUIRED_MARKER_IDS.filter((markerId) => !ids.includes(markerId));
  const markers = list(fieldMarkers?.markers);
  const expectedPoseCount = markers.filter((marker) => marker?.expected_pose?.position && marker?.expected_pose?.rotation).length;
  const ready = fieldMarkers?.ok === true
    && fieldMarkers?.schema === "innerworld-field-markers/v1"
    && missing.length === 0
    && expectedPoseCount >= REQUIRED_ANCHOR_IDS.length
    && fieldMarkers?.acceptance?.runtime_fields_bound_to_wall_calibration === true;

  return gate({
    id: "print_kit",
    title: "Printable field kit",
    status: ready ? "ready" : "pending",
    summary: ready
      ? "A1/A2/A3 marker cards are bound to wall calibration and printable."
      : `Missing marker contract: ${missing.join(", ") || "expected pose/runtime binding"}.`,
    source: "/api/field/markers",
    required: REQUIRED_MARKER_IDS,
    evidence: {
      schema: fieldMarkers?.schema || null,
      marker_ids: ids,
      expected_pose_count: expectedPoseCount,
      required_marker_ids: REQUIRED_MARKER_IDS,
      runtime_fields_bound_to_wall_calibration: Boolean(fieldMarkers?.acceptance?.runtime_fields_bound_to_wall_calibration)
    }
  });
}

function wallRehearsalGate(summary) {
  const rehearsalReady = summary?.rehearsal_ready === true;
  const calibrated = list(summary?.calibrated_anchor_ids);
  return gate({
    id: "simulator_rehearsal",
    title: "Simulator/manual rehearsal",
    status: rehearsalReady ? "ready" : "pending",
    summary: rehearsalReady
      ? "A1/A2/A3 have latest accepted/warning rehearsal observations."
      : `${calibrated.length}/3 anchors have accepted/warning rehearsal observations.`,
    source: "/api/calibration/wall runtime.summary.rehearsal_ready",
    required: REQUIRED_ANCHOR_IDS,
    evidence: {
      rehearsal_ready: rehearsalReady,
      calibrated_anchor_count: Number(summary?.calibrated_anchor_count) || 0,
      calibrated_anchor_ids: calibrated
    }
  });
}

function hardwareAlignmentGate(summary) {
  const hardwareReady = summary?.ready_for_hardware === true;
  const hardwareIds = list(summary?.hardware_calibrated_anchor_ids);
  const hardwareModes = list(summary?.hardware_tracking_modes).length
    ? list(summary.hardware_tracking_modes)
    : HARDWARE_TRACKING_MODES;

  return gate({
    id: "hardware_alignment",
    title: "Hardware wall lock",
    status: hardwareReady ? "ready" : "pending",
    summary: hardwareReady
      ? "A1/A2/A3 are locked by QR/image tracking/SLAM hardware observations."
      : `${hardwareIds.length}/3 hardware observations accepted; simulator/manual cannot satisfy this gate.`,
    source: "/api/calibration/wall runtime.summary.ready_for_hardware",
    required: HARDWARE_TRACKING_MODES,
    requiredTrackingModes: HARDWARE_TRACKING_MODES,
    evidence: {
      ready_for_hardware: hardwareReady,
      hardware_calibrated_anchor_count: Number(summary?.hardware_calibrated_anchor_count) || 0,
      hardware_calibrated_anchor_ids: hardwareIds,
      hardware_tracking_modes: hardwareModes
    }
  });
}

function missionLoopGate(space, state) {
  const runtimeState = state && typeof state === "object"
    ? {
        ...state,
        completed_steps: completedSteps(state).slice(),
        beacons: beacons(state).slice()
      }
    : {};
  normalizeMissionState(space, runtimeState);
  const steps = missionSteps(space);
  const done = completedSteps(runtimeState);
  const doneSet = new Set(done);
  const requiredStepIds = steps.map((step) => step.step_id);
  const missingSteps = requiredStepIds.filter((stepId) => !doneSet.has(stepId));
  const runtimeBeacons = beacons(runtimeState);
  const complete = runtimeState.mission_state === ACCEPTANCE_TARGETS.completed_state
    && missingSteps.length === 0
    && runtimeBeacons.length >= ACCEPTANCE_TARGETS.completed_beacons;

  return gate({
    id: "mission_loop",
    title: "Mission/write-back loop",
    status: complete ? "ready" : "pending",
    summary: complete
      ? "Read, service action, write-back, and User B readback loop are complete."
      : `${done.length}/${requiredStepIds.length} mission steps complete; ${runtimeBeacons.length}/${ACCEPTANCE_TARGETS.completed_beacons} beacons.`,
    source: "/api/state",
    required: requiredStepIds,
    evidence: {
      mission_state: runtimeState.mission_state || null,
      completed_steps: done,
      missing_steps: missingSteps,
      beacon_count: runtimeBeacons.length,
      write_back_beacons: runtimeBeacons.filter((item) => item?.layer === "time_capsule" || item?.anchor_id === "A3").length
    }
  });
}

function ledgerGate(ledgerSummary) {
  const checks = ledgerSummary?.checks || {};
  const ready = checks.has_interaction === true
    && checks.has_service_action === true
    && checks.has_write_back === true;

  return gate({
    id: "sqlite_evidence",
    title: "SQLite evidence ledger",
    status: ready ? "ready" : "pending",
    summary: ready
      ? "Mission ledger contains interaction, service action, and write-back evidence."
      : "Mission ledger still needs interaction, service action, or write-back evidence.",
    source: "/api/ledger/summary",
    required: ["interaction", "service_action", "write_back"],
    evidence: {
      engine: ledgerSummary?.engine || null,
      checks,
      event_count: ledgerSummary?.audit?.event_count || 0
    }
  });
}

function releaseGate(opsStatus) {
  const deployOk = opsStatus?.deploy_dry_run?.ok === true;
  const releaseOk = opsStatus?.release_index?.ok === true;
  const ready = deployOk || releaseOk;
  return gate({
    id: "release_chain",
    title: "Release/deploy chain",
    status: deployOk ? "ready" : releaseOk ? "warn" : "pending",
    summary: deployOk
      ? "Server deploy dry-run is verified."
      : releaseOk
        ? "Release index exists; deploy dry-run should be refreshed before handoff."
        : "Release index or deploy dry-run evidence is missing.",
    source: "/api/ops/status",
    required: ["release_index", "deploy_dry_run"],
    evidence: {
      ready,
      release_index_ok: releaseOk,
      deploy_dry_run_ok: deployOk,
      release_generated_at: opsStatus?.release_index?.generated_at || null,
      deploy_generated_at: opsStatus?.deploy_dry_run?.generated_at || null
    }
  });
}

function hardwareKitGate(opsStatus) {
  const devices = list(opsStatus?.hardware?.devices);
  const models = devices.map((device) => device?.model).filter(Boolean);
  const ready = opsStatus?.hardware?.fit === "fit"
    && models.includes("RA202")
    && models.includes("RAS201");

  return gate({
    id: "hardware_kit",
    title: "Rokid AR Studio kit",
    status: ready ? "ready" : "pending",
    summary: ready
      ? "Applied hardware lane is RA202 + RAS201."
      : "Rokid Max Pro / Station Pro applied hardware record is incomplete.",
    source: "/api/ops/status",
    required: ["RA202", "RAS201"],
    evidence: {
      fit: opsStatus?.hardware?.fit || null,
      models,
      borrow_deadline: opsStatus?.hardware?.borrow_deadline || null
    }
  });
}

function acceptanceStatus(gates) {
  const gateById = new Map(gates.map((item) => [item.id, item]));
  const printReady = gateById.get("print_kit")?.status === "ready";
  const rehearsalReady = gateById.get("simulator_rehearsal")?.status === "ready";
  const hardwareReady = gateById.get("hardware_alignment")?.status === "ready";
  const missionReady = gateById.get("mission_loop")?.status === "ready";
  const sqliteReady = gateById.get("sqlite_evidence")?.status === "ready";
  const releaseReady = gateById.get("release_chain")?.status === "ready";
  const kitReady = gateById.get("hardware_kit")?.status === "ready";

  if (printReady && hardwareReady && missionReady && sqliteReady && releaseReady && kitReady) return "hardware_acceptance_ready";
  if (printReady && rehearsalReady) return "rehearsal_ready";
  if (printReady) return "site_install_ready";
  return "pending";
}

export function buildFieldAcceptance({
  baseUrl,
  space,
  state,
  wallCalibration,
  fieldMarkers,
  ledgerSummary,
  opsStatus,
  generatedAt = new Date().toISOString()
}) {
  const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
  const endpoints = buildEndpointMap(publicBaseUrl, space?.space_id);
  const summary = wallCalibration?.runtime?.summary || {};
  const gates = [
    fieldMarkerGate(fieldMarkers),
    wallRehearsalGate(summary),
    hardwareAlignmentGate(summary),
    missionLoopGate(space, state),
    ledgerGate(ledgerSummary),
    releaseGate(opsStatus),
    hardwareKitGate(opsStatus)
  ];
  const status = acceptanceStatus(gates);
  const hardwareGate = gates.find((item) => item.id === "hardware_alignment");
  const blockingItems = gates
    .filter((item) => item.status === "pending" || item.status === "blocked")
    .map((item) => ({
      gate_id: item.id,
      title: item.title,
      summary: item.summary
    }));

  return {
    ok: true,
    schema: FIELD_ACCEPTANCE_SCHEMA,
    generated_at: generatedAt,
    endpoint: endpoints.field_acceptance,
    base_url: publicBaseUrl,
    space_id: space?.space_id || "innerworld_campus_wall",
    status,
    ready: status === "hardware_acceptance_ready",
    summary: {
      ready_gates: countStatus(gates, "ready"),
      warn_gates: countStatus(gates, "warn"),
      pending_gates: countStatus(gates, "pending"),
      blocked_gates: countStatus(gates, "blocked"),
      ready_for_hardware: hardwareGate?.evidence?.ready_for_hardware === true,
      hardware_evidence_count: Number(hardwareGate?.evidence?.hardware_calibrated_anchor_count) || 0,
      all_simulator_ready_for_hardware: false,
      simulator_rehearsal_is_not_hardware_ready: true
    },
    source_of_truth: {
      field_markers: endpoints.field_markers,
      wall_calibration: endpoints.wall_calibration,
      calibration_observations: endpoints.wall_calibration_observations,
      mission_state: endpoints.state,
      ledger_summary: endpoints.ledger_summary,
      ops_status: endpoints.ops_status,
      evidence_chain: endpoints.evidence_chain
    },
    gates,
    blocking_items: blockingItems,
    next_actions: blockingItems.slice(0, 5).map((item) => item.summary),
    hardware_modes_required: HARDWARE_TRACKING_MODES,
    required_marker_ids: REQUIRED_MARKER_IDS,
    privacy: "Field acceptance is public operational metadata. It excludes raw chat exports, private evidence, device serials, SSIDs, MACs, IPs, tokens, phone numbers, and addresses.",
    debug: {
      gate_ids: gates.map((item) => item.id),
      required_anchor_ids: REQUIRED_ANCHOR_IDS,
      required_sources: unique(gates.map((item) => item.source))
    }
  };
}
