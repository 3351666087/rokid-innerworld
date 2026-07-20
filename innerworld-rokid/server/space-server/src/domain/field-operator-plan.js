import {
  ACCEPTANCE_TARGETS,
  beacons,
  completedSteps,
  missionSteps,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";

export const FIELD_OPERATOR_PLAN_SCHEMA = "innerworld-field-operator-plan/v1";

const REQUIRED_ANCHOR_IDS = ["A1", "A2", "A3"];
const PHASE_IDS = ["preflight", "a1_entry", "a2_read", "a3_write_back", "user_b_readback", "closeout"];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function gateById(fieldAcceptance, id) {
  return list(fieldAcceptance?.gates).find((gate) => gate?.id === id) || null;
}

function gateReady(fieldAcceptance, id) {
  return gateById(fieldAcceptance, id)?.status === "ready";
}

function gateSummary(fieldAcceptance, id, fallback) {
  return gateById(fieldAcceptance, id)?.summary || fallback;
}

function normalizedRuntimeState(space, state) {
  const runtimeState = state && typeof state === "object"
    ? {
        ...state,
        completed_steps: completedSteps(state).slice(),
        beacons: beacons(state).slice()
      }
    : {};
  normalizeMissionState(space, runtimeState);
  return runtimeState;
}

function trustedAnchorIds(targetReadiness, wallCalibration) {
  const targetIds = list(targetReadiness?.target_summary?.trusted_anchor_ids);
  if (targetIds.length) return targetIds;
  return list(wallCalibration?.runtime?.summary?.trusted_hardware_calibrated_anchor_ids);
}

function hardwareAnchorIds(targetReadiness, wallCalibration) {
  const targetIds = list(targetReadiness?.target_summary?.hardware_anchor_ids);
  if (targetIds.length) return targetIds;
  return list(wallCalibration?.runtime?.summary?.hardware_calibrated_anchor_ids);
}

function missingAnchors(anchorIds) {
  return REQUIRED_ANCHOR_IDS.filter((anchorId) => !list(anchorIds).includes(anchorId));
}

function phaseStatus({ complete, enabled, blockers }) {
  if (complete) return "ready";
  if (!enabled) return "pending";
  return list(blockers).length ? "blocked" : "active";
}

function phase({ id, label, anchorId = null, complete, enabled, requiredEvidence, blockers, operatorActions, mutatesState = false }) {
  return {
    id,
    label,
    anchor_id: anchorId,
    status: phaseStatus({ complete, enabled, blockers }),
    required_evidence: requiredEvidence,
    blockers: unique(blockers),
    operator_actions: operatorActions,
    mutates_state: Boolean(mutatesState)
  };
}

function releaseReady(fieldAcceptance, opsStatus) {
  if (gateReady(fieldAcceptance, "release_chain")) return true;
  return opsStatus?.deploy_dry_run?.ok === true;
}

function writeBackBeaconCount(runtimeState, targetReadiness) {
  const missionCount = Number(targetReadiness?.mission_loop?.write_back_beacons);
  if (Number.isFinite(missionCount)) return missionCount;
  return beacons(runtimeState).filter((item) => item?.layer === "time_capsule" || item?.anchor_id === "A3").length;
}

function requiredMissionStepIds(space) {
  const ids = missionSteps(space).map((step) => step?.step_id).filter(Boolean);
  return ids.length ? ids : ["read", "find_year", "service_action", "write_back"];
}

function adapterSummary(adapterChecklist, deviceSessions) {
  const checklistSummary = adapterChecklist?.summary || {};
  const sessionRows = list(deviceSessions?.sessions);
  const pairedSessionCount = Number(checklistSummary.paired_session_count)
    || Number(deviceSessions?.pairing?.paired_sessions)
    || sessionRows.filter((session) => session?.pairing_status === "operator_paired" || session?.hardware_acceptance_eligible === true).length;
  const liveSdkSessionCount = Number(checklistSummary.live_sdk_session_count)
    || sessionRows.filter((session) => session?.session_status === "online" && session?.sdk_binding_status?.live_binding_ready === true).length;
  const onlineSessionCount = Number(checklistSummary.online_session_count)
    || sessionRows.filter((session) => session?.session_status === "online").length;

  return {
    ready: adapterChecklist?.ready === true,
    paired_session_count: pairedSessionCount,
    live_sdk_session_count: liveSdkSessionCount,
    online_session_count: onlineSessionCount,
    live_session_ready: pairedSessionCount > 0 && liveSdkSessionCount > 0
  };
}

function buildReadiness({
  fieldAcceptance,
  targetReadiness,
  adapter,
  trustedIds,
  runtimeState,
  releaseIsReady
}) {
  const missionLoop = targetReadiness?.mission_loop || {};
  const writeBackCount = writeBackBeaconCount(runtimeState, targetReadiness);
  const trustedReady = targetReadiness?.mission_loop?.trusted_a1_a2_a3_ready === true
    || (targetReadiness?.target_summary?.trusted_anchor_count >= REQUIRED_ANCHOR_IDS.length && missingAnchors(trustedIds).length === 0)
    || fieldAcceptance?.summary?.trusted_hardware_ready === true;
  const userBReady = missionLoop.user_b_readback_ready === true;
  const missionLoopReady = missionLoop.ready === true;
  const physicalAcceptanceReady = targetReadiness?.physical_acceptance_ready === true
    || (fieldAcceptance?.ready === true && fieldAcceptance?.status === "hardware_acceptance_ready");

  return {
    precheck_ok: targetReadiness?.precheck_ok === true || (gateReady(fieldAcceptance, "print_kit") && gateReady(fieldAcceptance, "hardware_kit")),
    physical_acceptance_ready: physicalAcceptanceReady,
    live_session_ready: adapter.live_session_ready,
    trusted_a1_a2_a3_ready: trustedReady,
    mission_loop_ready: missionLoopReady,
    user_b_readback_ready: userBReady,
    release_ready: releaseIsReady,
    hardware_ready_claim_allowed: targetReadiness?.hardware_ready_claim_allowed === true
      || (physicalAcceptanceReady && missionLoopReady && trustedReady && userBReady && writeBackCount > 0)
  };
}

function buildPreflightBlockers({ readiness, fieldAcceptance, adapter }) {
  const blockers = [];
  if (!readiness.precheck_ok) {
    if (!gateReady(fieldAcceptance, "print_kit")) {
      blockers.push(gateSummary(fieldAcceptance, "print_kit", "A1/A2/A3 printable field kit is not ready."));
    }
    if (!gateReady(fieldAcceptance, "hardware_kit")) {
      blockers.push(gateSummary(fieldAcceptance, "hardware_kit", "Rokid RA202/RAS201 hardware kit record is not ready."));
    }
  }
  if (!adapter.live_session_ready) {
    blockers.push("Operator-paired live Rokid SDK session is not online yet.");
  }
  return blockers;
}

function trustedAnchorBlocker(anchorId, trustedIds) {
  return list(trustedIds).includes(anchorId)
    ? null
    : `Trusted ${anchorId} hardware observation is missing from the operator-paired live session.`;
}

function buildPhases({
  space,
  runtimeState,
  fieldAcceptance,
  targetReadiness,
  adapter,
  readiness,
  trustedIds,
  releaseIsReady,
  trustedMissionProvenanceReady
}) {
  const done = new Set(completedSteps(runtimeState));
  const writeBackCount = writeBackBeaconCount(runtimeState, targetReadiness);
  const requiredSteps = requiredMissionStepIds(space);
  const a1Complete = trustedIds.includes("A1");
  const a2ReadComplete = trustedIds.includes("A2") && done.has("read") && done.has("find_year");
  const a3WriteBackComplete = trustedIds.includes("A3") && done.has("service_action") && done.has("write_back") && writeBackCount > 0;
  const userBComplete = readiness.user_b_readback_ready;
  const closeoutComplete = readiness.hardware_ready_claim_allowed && releaseIsReady;

  const preflightBlockers = buildPreflightBlockers({ readiness, fieldAcceptance, adapter });
  const a1Blockers = [
    !readiness.precheck_ok ? "Preflight API and hardware kit checks are not ready." : null,
    !adapter.live_session_ready ? "Operator-paired live SDK session is required before A1 can count." : null,
    trustedAnchorBlocker("A1", trustedIds)
  ];
  const missingA2Steps = ["read", "find_year"].filter((stepId) => !done.has(stepId));
  const a2Blockers = [
    !a1Complete ? "A1 entry lock must be trusted first." : null,
    trustedAnchorBlocker("A2", trustedIds),
    missingA2Steps.length ? `A2 memory read progress missing: ${missingA2Steps.join(", ")}.` : null
  ];
  const a3Blockers = [
    !a2ReadComplete ? "A2 memory read must complete before A3 TimeMark write-back." : null,
    trustedAnchorBlocker("A3", trustedIds),
    !done.has("service_action") ? "Controlled service action has not been completed before write-back." : null,
    !done.has("write_back") ? "A3 TimeMark write-back has not been committed." : null,
    writeBackCount <= 0 ? "No A3/time_capsule write-back beacon is visible in state." : null,
    !trustedMissionProvenanceReady ? "Trusted mission provenance for the write-back loop is not ready." : null
  ];
  const userBBlockers = [
    !a3WriteBackComplete ? "A3 TimeMark write-back must be visible before User B readback." : null,
    String(runtimeState.active_user || "").toUpperCase() !== "B" ? "Active user is not B for readback." : null,
    runtimeState.mission_state !== ACCEPTANCE_TARGETS.completed_state ? "Mission state is not complete." : null
  ];
  const closeoutBlockers = [
    !userBComplete ? "User B readback is not ready." : null,
    !releaseIsReady ? gateSummary(fieldAcceptance, "release_chain", "Release/deploy dry-run evidence is not ready.") : null,
    !readiness.physical_acceptance_ready ? "Physical field acceptance is not hardware-ready." : null,
    ...list(targetReadiness?.physical_blockers).slice(0, 5)
  ];

  return [
    phase({
      id: "preflight",
      label: "Preflight",
      complete: readiness.precheck_ok && adapter.live_session_ready,
      enabled: true,
      requiredEvidence: ["print_kit", "hardware_kit", "operator_paired_live_sdk_session", "adapter_checklist_summary"],
      blockers: preflightBlockers,
      operatorActions: [
        "Confirm the A1/A2/A3 field kit and Rokid RA202/RAS201 kit are present.",
        "Pair one operator-approved Rokid session and wait for live SDK input plus overlay binding."
      ]
    }),
    phase({
      id: "a1_entry",
      label: "A1 Spatial Entry",
      anchorId: "A1",
      complete: a1Complete,
      enabled: readiness.precheck_ok && adapter.live_session_ready,
      requiredEvidence: ["trusted_a1_observation", "operator_paired_session", "live_sdk_binding"],
      blockers: a1Blockers,
      operatorActions: [
        "Stand at the campus wall and lock A1 through the paired Rokid session.",
        "Refresh this plan after A1 appears in trusted hardware observations."
      ]
    }),
    phase({
      id: "a2_read",
      label: "A2 Memory Read",
      anchorId: "A2",
      complete: a2ReadComplete,
      enabled: a1Complete,
      requiredEvidence: ["trusted_a2_observation", "read_step", "find_year_step"],
      blockers: a2Blockers,
      operatorActions: [
        "Have User A read the A2 memory HUD on the wall.",
        "Confirm the existing mission flow records read and find_year progress."
      ],
      mutatesState: true
    }),
    phase({
      id: "a3_write_back",
      label: "A3 TimeMark Write-Back",
      anchorId: "A3",
      complete: a3WriteBackComplete,
      enabled: a2ReadComplete,
      requiredEvidence: ["trusted_a3_observation", "write_back_step", "a3_time_capsule_beacon", "trusted_mission_provenance"],
      blockers: a3Blockers,
      operatorActions: [
        "Have User A leave one short place-related TimeMark at A3 through the existing trusted device flow.",
        "Refresh state and verify one A3/time_capsule beacon is visible."
      ],
      mutatesState: true
    }),
    phase({
      id: "user_b_readback",
      label: "User B Readback",
      anchorId: "A3",
      complete: userBComplete,
      enabled: a3WriteBackComplete,
      requiredEvidence: ["active_user_b", "complete_mission_state", "write_back_beacon_visible"],
      blockers: userBBlockers,
      operatorActions: [
        "Switch to User B and verify the new TimeMark is readable from the same wall layer.",
        "Keep the proof on shared mission state and field acceptance, not a separate guide app."
      ],
      mutatesState: true
    }),
    phase({
      id: "closeout",
      label: "Closeout",
      complete: closeoutComplete,
      enabled: userBComplete,
      requiredEvidence: ["field_acceptance_ready", "release_ready", ...requiredSteps],
      blockers: closeoutBlockers,
      operatorActions: [
        "Use /api/field/acceptance as the hardware-ready source of truth.",
        "Claim hardware-ready only when this plan allows it and /api/field/acceptance is ready."
      ]
    })
  ];
}

function nextActions(phases) {
  const current = phases.find((item) => item.status !== "ready") || phases[phases.length - 1];
  if (!current) return [];
  const blockers = list(current.blockers);
  if (blockers.length) return blockers.slice(0, 3);
  return list(current.operator_actions).slice(0, 3);
}

function trustedMissionProvenanceReady(fieldAcceptance) {
  const evidence = gateById(fieldAcceptance, "mission_loop")?.evidence || {};
  return evidence.trusted_mission_provenance_ready === true
    || evidence.trusted_mission_provenance?.ready === true;
}

export function buildFieldOperatorPlan({
  space,
  state,
  fieldAcceptance,
  targetReadiness,
  deviceSessions,
  adapterChecklist,
  wallCalibration,
  opsStatus,
  generatedAt = new Date().toISOString()
}) {
  const runtimeState = normalizedRuntimeState(space, state);
  const adapter = adapterSummary(adapterChecklist, deviceSessions);
  const trustedIds = trustedAnchorIds(targetReadiness, wallCalibration);
  const hardwareIds = hardwareAnchorIds(targetReadiness, wallCalibration);
  const releaseIsReady = releaseReady(fieldAcceptance, opsStatus);
  const provenanceReady = trustedMissionProvenanceReady(fieldAcceptance);
  const readiness = buildReadiness({
    fieldAcceptance,
    targetReadiness,
    adapter,
    trustedIds,
    runtimeState,
    releaseIsReady
  });
  const phases = buildPhases({
    space,
    runtimeState,
    fieldAcceptance,
    targetReadiness,
    adapter,
    readiness,
    trustedIds,
    releaseIsReady,
    trustedMissionProvenanceReady: provenanceReady
  });
  const currentPhaseIndex = phases.findIndex((item) => item.status !== "ready");
  const resolvedPhaseIndex = currentPhaseIndex === -1 ? phases.length - 1 : currentPhaseIndex;

  return {
    ok: true,
    schema: FIELD_OPERATOR_PLAN_SCHEMA,
    generated_at: generatedAt,
    endpoint: {
      method: "GET",
      path: "/api/field/operator-plan"
    },
    space_id: space?.space_id || fieldAcceptance?.space_id || "innerworld_campus_wall",
    current_phase: phases[resolvedPhaseIndex]?.id || PHASE_IDS[0],
    phase_index: resolvedPhaseIndex + 1,
    total_phases: phases.length,
    phases,
    next_actions: nextActions(phases),
    readiness,
    source_of_truth: {
      field_acceptance: "/api/field/acceptance",
      field_target_readiness: "/api/field/target-readiness",
      device_adapter_checklist: "/api/device/adapter-checklist",
      device_sessions: "/api/device/sessions",
      wall_calibration: "/api/calibration/wall",
      mission_state: "/api/state",
      ops_status: "/api/ops/status"
    },
    sanitized_summary: {
      hardware_anchor_count: hardwareIds.length,
      trusted_anchor_count: trustedIds.length,
      missing_trusted_anchor_ids: missingAnchors(trustedIds),
      paired_session_count: adapter.paired_session_count,
      live_sdk_session_count: adapter.live_sdk_session_count,
      mission_state: runtimeState.mission_state || null,
      completed_step_count: completedSteps(runtimeState).length,
      write_back_beacon_count: writeBackBeaconCount(runtimeState, targetReadiness),
      field_acceptance_status: fieldAcceptance?.status || "pending"
    },
    privacy: {
      read_only_endpoint: true,
      mission_state_mutated: false,
      evidence_files_written: false,
      simulator_or_manual_observations_created: false,
      adb_or_logcat_run: false,
      raw_serials_included: false,
      usb_ids_included: false,
      session_ids_included: false,
      device_ids_included: false,
      private_ips_included: false,
      pairing_codes_included: false,
      raw_pose_or_ray_included: false,
      raw_logcat_or_dumpsys_included: false
    },
    scope_guard: {
      p0_only: true,
      campus_wall_only: true,
      a1_a2_a3_user_b_only: true,
      guide_app_or_ppt: false,
      phone_page: false,
      open_ugc: false,
      backend_expansion: false,
      broad_route: false
    }
  };
}
