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
const FIELD_TARGET_READINESS_SCHEMA = "innerworld-field-target-readiness/v1";

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
  const hardwareIds = list(summary?.hardware_calibrated_anchor_ids);
  const hardwareModes = list(summary?.hardware_tracking_modes).length
    ? list(summary.hardware_tracking_modes)
    : HARDWARE_TRACKING_MODES;
  const modeReady = REQUIRED_ANCHOR_IDS.every((anchorId) => hardwareIds.includes(anchorId));

  return gate({
    id: "hardware_alignment",
    title: "Hardware wall lock",
    status: modeReady ? "ready" : "pending",
    summary: modeReady
      ? "A1/A2/A3 have QR/image tracking/SLAM alignment observations."
      : `${hardwareIds.length}/3 hardware observations accepted; simulator/manual cannot satisfy this gate.`,
    source: "/api/calibration/wall runtime.summary.hardware_calibrated_anchor_ids",
    required: HARDWARE_TRACKING_MODES,
    requiredTrackingModes: HARDWARE_TRACKING_MODES,
    evidence: {
      hardware_alignment_ready: modeReady,
      hardware_calibrated_anchor_count: Number(summary?.hardware_calibrated_anchor_count) || 0,
      hardware_calibrated_anchor_ids: hardwareIds,
      hardware_tracking_modes: hardwareModes,
      simulator_manual_excluded: true
    }
  });
}

function trustedHardwareSessionGate(summary) {
  const trustedIds = list(summary?.trusted_hardware_calibrated_anchor_ids);
  const trustedSessions = list(summary?.trusted_hardware_sessions);
  const untrustedIds = list(summary?.untrusted_hardware_anchor_ids);
  const trustedReady = summary?.ready_for_hardware === true
    && REQUIRED_ANCHOR_IDS.every((anchorId) => trustedIds.includes(anchorId));

  return gate({
    id: "trusted_hardware_session",
    title: "Trusted SDK live session",
    status: trustedReady ? "ready" : "pending",
    summary: trustedReady
      ? "A1/A2/A3 hardware observations are tied to an online Rokid SDK live session."
      : `${trustedIds.length}/3 trusted hardware observations; script-posted tracking modes are not accepted.`,
    source: "/api/device/sessions + /api/calibration/wall runtime.summary.trusted_hardware_*",
    required: ["operator_paired_session", "online_device_session", "sdk_binding_status.live_binding_ready", "input_binding_ready", "overlay_binding_ready"],
    evidence: {
      trusted_hardware_ready: trustedReady,
      ready_for_hardware: trustedReady,
      sdk_live_binding_required: summary?.sdk_live_binding_required !== false,
      operator_pairing_required: true,
      trusted_hardware_calibrated_anchor_count: Number(summary?.trusted_hardware_calibrated_anchor_count) || 0,
      trusted_hardware_calibrated_anchor_ids: trustedIds,
      trusted_hardware_session_count: Number(summary?.trusted_hardware_session_count) || trustedSessions.length,
      trusted_hardware_sessions: trustedSessions,
      untrusted_hardware_anchor_ids: untrustedIds,
      hardware_tracking_modes: list(summary?.hardware_tracking_modes).length ? list(summary.hardware_tracking_modes) : HARDWARE_TRACKING_MODES
    }
  });
}

function missionLoopGate(space, state, ledgerSummary) {
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
  const writeBackBeacons = runtimeBeacons.filter((item) => item?.layer === "time_capsule" || item?.anchor_id === "A3");
  const activeUser = String(runtimeState.active_user || "").trim();
  const userBReadbackReady = activeUser.toUpperCase() === "B"
    && runtimeState.mission_state === ACCEPTANCE_TARGETS.completed_state
    && writeBackBeacons.length > 0;
  const complete = runtimeState.mission_state === ACCEPTANCE_TARGETS.completed_state
    && missingSteps.length === 0
    && runtimeBeacons.length >= ACCEPTANCE_TARGETS.completed_beacons
    && userBReadbackReady
    && ledgerSummary?.trusted_mission_provenance?.ready === true;
  const trustedProvenance = ledgerSummary?.trusted_mission_provenance || {
    ready: false,
    missing: ["trusted_mission_provenance_missing"]
  };

  return gate({
    id: "mission_loop",
    title: "Mission/write-back loop",
    status: complete ? "ready" : "pending",
    summary: complete
      ? "Read, service action, write-back, and User B readback loop are complete."
      : `${done.length}/${requiredStepIds.length} mission steps complete; ${runtimeBeacons.length}/${ACCEPTANCE_TARGETS.completed_beacons} beacons; User B readback ${userBReadbackReady ? "ready" : "pending"}; trusted mission provenance ${trustedProvenance.ready === true ? "ready" : "pending"}.`,
    source: "/api/state",
    required: [...requiredStepIds, "user_b_readback"],
    evidence: {
      mission_state: runtimeState.mission_state || null,
      active_user: activeUser || null,
      required_active_user: "B",
      completed_steps: done,
      missing_steps: missingSteps,
      beacon_count: runtimeBeacons.length,
      write_back_beacons: writeBackBeacons.length,
      user_b_readback_ready: userBReadbackReady,
      trusted_mission_provenance_ready: trustedProvenance.ready === true,
      trusted_mission_provenance: trustedProvenance
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
  const trustedHardwareReady = gateById.get("trusted_hardware_session")?.status === "ready";
  const missionReady = gateById.get("mission_loop")?.status === "ready";
  const sqliteReady = gateById.get("sqlite_evidence")?.status === "ready";
  const releaseReady = gateById.get("release_chain")?.status === "ready";
  const kitReady = gateById.get("hardware_kit")?.status === "ready";

  if (printReady && hardwareReady && trustedHardwareReady && missionReady && sqliteReady && releaseReady && kitReady) return "hardware_acceptance_ready";
  if (printReady && rehearsalReady) return "rehearsal_ready";
  if (printReady) return "site_install_ready";
  return "pending";
}

function gateById(gates, id) {
  return list(gates).find((item) => item?.id === id) || null;
}

function gateReady(gates, id) {
  return gateById(gates, id)?.status === "ready";
}

function missingAnchorIds(anchorIds) {
  const ids = list(anchorIds);
  return REQUIRED_ANCHOR_IDS.filter((anchorId) => !ids.includes(anchorId));
}

function missionEvidence(acceptance) {
  return gateById(acceptance?.gates, "mission_loop")?.evidence || {};
}

function uniqueBlockers(values) {
  return unique(values.map((value) => String(value || "").trim()).filter(Boolean));
}

export function buildFieldTargetReadiness({
  baseUrl,
  fieldAcceptance,
  generatedAt = new Date().toISOString()
}) {
  const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
  const endpoints = buildEndpointMap(publicBaseUrl, fieldAcceptance?.space_id);
  const gates = list(fieldAcceptance?.gates);
  const hardwareGate = gateById(gates, "hardware_alignment");
  const trustedGate = gateById(gates, "trusted_hardware_session");
  const missionGate = gateById(gates, "mission_loop");
  const hardwareEvidence = hardwareGate?.evidence || {};
  const trustedEvidence = trustedGate?.evidence || {};
  const mission = missionEvidence(fieldAcceptance);
  const hardwareAnchorIds = list(hardwareEvidence.hardware_calibrated_anchor_ids);
  const trustedAnchorIds = list(trustedEvidence.trusted_hardware_calibrated_anchor_ids);
  const trustedSessionCount = Number(trustedEvidence.trusted_hardware_session_count) || 0;
  const missionReady = missionGate?.status === "ready";
  const physicalAcceptanceReady = fieldAcceptance?.ready === true
    && fieldAcceptance?.status === "hardware_acceptance_ready";
  const precheckOk = gateReady(gates, "print_kit")
    && gateReady(gates, "hardware_kit")
    && trustedSessionCount > 0;

  const physicalBlockers = [];
  if (precheckOk !== true) physicalBlockers.push("target_api_precheck_missing");
  if (missingAnchorIds(hardwareAnchorIds).length) physicalBlockers.push("raw_a1_a2_a3_hardware_observations_missing");
  if (missingAnchorIds(trustedAnchorIds).length) physicalBlockers.push("trusted_a1_a2_a3_observations_missing");
  if (!missionReady) physicalBlockers.push("p0_mission_writeback_user_b_loop_missing");
  if (!physicalAcceptanceReady) physicalBlockers.push("field_acceptance_not_ready");
  for (const item of list(fieldAcceptance?.blocking_items)) {
    if (item?.gate_id) physicalBlockers.push(`${item.gate_id}_pending`);
  }

  return {
    ok: true,
    schema: FIELD_TARGET_READINESS_SCHEMA,
    generated_at: generatedAt,
    endpoint: endpoints.field_target_readiness,
    source_of_truth: {
      field_acceptance: endpoints.field_acceptance,
      wall_calibration: endpoints.wall_calibration,
      mission_state: endpoints.state
    },
    precheck_ok: precheckOk,
    physical_acceptance_ready: physicalAcceptanceReady,
    hardware_ready_claim_allowed: physicalAcceptanceReady,
    physical_blockers: uniqueBlockers(physicalBlockers),
    target_summary: {
      required_anchor_ids: REQUIRED_ANCHOR_IDS,
      hardware_anchor_count: hardwareAnchorIds.length,
      hardware_anchor_ids: hardwareAnchorIds,
      missing_hardware_anchor_ids: missingAnchorIds(hardwareAnchorIds),
      trusted_anchor_count: trustedAnchorIds.length,
      trusted_anchor_ids: trustedAnchorIds,
      missing_trusted_anchor_ids: missingAnchorIds(trustedAnchorIds),
      trusted_hardware_session_count: trustedSessionCount,
      hardware_tracking_modes: list(trustedEvidence.hardware_tracking_modes).length
        ? list(trustedEvidence.hardware_tracking_modes)
        : HARDWARE_TRACKING_MODES
    },
    mission_loop: {
      ready: missionReady,
      mission_state: mission.mission_state || null,
      active_user: mission.active_user || null,
      required_active_user: mission.required_active_user || "B",
      completed_steps: list(mission.completed_steps),
      missing_steps: list(mission.missing_steps),
      beacon_count: Number(mission.beacon_count) || 0,
      write_back_beacons: Number(mission.write_back_beacons) || 0,
      user_b_readback_ready: mission.user_b_readback_ready === true
    },
    field_acceptance: {
      schema: fieldAcceptance?.schema || null,
      status: fieldAcceptance?.status || "pending",
      ready: fieldAcceptance?.ready === true,
      generated_at: fieldAcceptance?.generated_at || null,
      blocking_items: list(fieldAcceptance?.blocking_items)
    },
    privacy: {
      raw_device_ids_included: false,
      raw_session_ids_included: false,
      raw_pairing_codes_included: false,
      private_ips_included: false,
      raw_logcat_included: false
    },
    operator_note: "Read-only field status. Run target-pass and A1/A2/A3 scanning from the terminal/runbook; this endpoint never creates simulator/manual observations and never mutates mission state."
  };
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
    trustedHardwareSessionGate(summary),
    missionLoopGate(space, state, ledgerSummary),
    ledgerGate(ledgerSummary),
    releaseGate(opsStatus),
    hardwareKitGate(opsStatus)
  ];
  const status = acceptanceStatus(gates);
  const hardwareGate = gates.find((item) => item.id === "hardware_alignment");
  const trustedHardwareGate = gates.find((item) => item.id === "trusted_hardware_session");
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
      ready_for_hardware: trustedHardwareGate?.evidence?.ready_for_hardware === true,
      hardware_evidence_count: Number(hardwareGate?.evidence?.hardware_calibrated_anchor_count) || 0,
      trusted_hardware_evidence_count: Number(trustedHardwareGate?.evidence?.trusted_hardware_calibrated_anchor_count) || 0,
      trusted_hardware_session_count: Number(trustedHardwareGate?.evidence?.trusted_hardware_session_count) || 0,
      trusted_hardware_ready: trustedHardwareGate?.evidence?.trusted_hardware_ready === true,
      sdk_live_binding_required: trustedHardwareGate?.evidence?.sdk_live_binding_required !== false,
      operator_pairing_required: trustedHardwareGate?.evidence?.operator_pairing_required === true,
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
