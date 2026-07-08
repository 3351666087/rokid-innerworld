const base = process.env.BASE_URL || "http://localhost:5177";
const spaceId = "innerworld_campus_wall";
const resetAfter = process.argv.includes("--reset-after");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertJsonHeaders(res, label) {
  const contentType = res.headers.get("content-type") || "";
  const cacheControl = res.headers.get("cache-control") || "";
  const corsOrigin = res.headers.get("access-control-allow-origin") || "";
  assert(contentType.includes("application/json"), `${label} content-type check failed`);
  assert(cacheControl.includes("no-store"), `${label} cache-control check failed`);
  assert(corsOrigin === "*", `${label} CORS origin check failed`);
}

async function fetchJson(path, label) {
  const res = await fetch(`${base}${path}`);
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed: ${body.error || res.status}`);
  return body;
}

async function postJson(path, label, payload = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed: ${body.error || res.status}`);
  return body;
}

function sceneActionById(actions, actionId) {
  const action = actions.find((item) => item.action_id === actionId);
  assert(action, `scene action missing: ${actionId}`);
  assert(action.task_target, `scene action task_target missing: ${actionId}`);
  assert(action.task_target.requires_trusted_shiyao_scan === true, `trusted shiyao scan guard missing: ${actionId}`);
  assert(action.task_target.fallback_no_hardware_claim === true, `fallback_no_hardware_claim guard missing: ${actionId}`);
  assert(Array.isArray(action.task_target.endpoint_sequence), `endpoint_sequence missing: ${actionId}`);
  return action;
}

function trustedScanRehearsalPayload(action, step = {}) {
  return {
    source: "check-scene-targets rehearsal",
    scene_action_id: action.action_id,
    target_id: action.task_target.target_id,
    shiyao_handoff_required: true,
    fallback_no_hardware_claim: true,
    trusted_hardware_session: false,
    trusted_scan_observed: false,
    hardware_ready_claim_allowed: false,
    endpoint_key: step.endpoint_key
  };
}

async function executeEndpointStep(action, step) {
  const endpointKey = step.endpoint_key;
  assert(typeof endpointKey === "string" && endpointKey.length > 0, `${action.action_id} endpoint key missing`);

  if (endpointKey === "local_unity") {
    return {
      endpoint_key: endpointKey,
      ok: true,
      mode: "rehearsal",
      note: "Unity local confirmation is intentionally recorded without a hardware-ready claim.",
      fallback_no_hardware_claim: true,
      hardware_ready_claim_allowed: false
    };
  }

  if (endpointKey === "interactions") {
    return postJson("/api/interactions", `${action.action_id}:${endpointKey}:${step.step_id}`, {
      user_id: step.user_id || "A",
      anchor_id: step.anchor_id || action.anchor_id,
      step_id: step.step_id,
      mission_state: step.mission_state || "active",
      input_source: "scene_target_rehearsal",
      ...trustedScanRehearsalPayload(action, step)
    });
  }

  if (endpointKey === "service_actions") {
    return postJson("/api/service-actions", `${action.action_id}:${endpointKey}:${step.action_id}`, {
      user_id: step.user_id || "A",
      anchor_id: step.anchor_id || action.anchor_id || "A3",
      action_id: step.action_id,
      label: action.task_target.display_label,
      note: "Scene target rehearsal outbox record. Not hardware-ready evidence.",
      ...trustedScanRehearsalPayload(action, step)
    });
  }

  if (endpointKey === "write_back") {
    return postJson(`/api/spaces/${spaceId}/beacons`, `${action.action_id}:${endpointKey}`, {
      user_id: step.user_id || "A",
      anchor_id: step.anchor_id || action.anchor_id || "A3",
      title: step.title || "Rokid TimeMark",
      text: "User A left a controlled TimeMark from the scene target rehearsal.",
      ...trustedScanRehearsalPayload(action, step)
    });
  }

  if (endpointKey === "state") {
    return postJson("/api/interactions", `${action.action_id}:${endpointKey}:${step.step_id}`, {
      user_id: step.user_id || "B",
      anchor_id: step.anchor_id || action.anchor_id || "A3",
      step_id: step.step_id || "user_b_readback",
      mission_state: step.mission_state || "complete",
      input_source: "scene_target_rehearsal",
      ...trustedScanRehearsalPayload(action, step)
    });
  }

  throw new Error(`Unsupported scene target endpoint key: ${endpointKey}`);
}

async function executeSceneAction(action) {
  const results = [];
  for (const step of action.task_target.endpoint_sequence) {
    results.push(await executeEndpointStep(action, step));
  }
  return results;
}

function assertNoFallbackHardwareClaim(readiness, acceptance) {
  const text = JSON.stringify({ readiness, acceptance }).toLowerCase();
  assert(!text.includes('"hardware_ready":true'), "fallback path must not report hardware_ready=true");
  assert(!text.includes('"physical_acceptance_ready":true'), "fallback path must not report physical_acceptance_ready=true");
  assert(!text.includes('"release_ready":true'), "fallback path must not report release_ready=true");
}

function countWriteBackBeacons(state, space) {
  const a3 = space.anchors?.find((anchor) => anchor.anchor_id === "A3");
  return (state.beacons || []).filter((beacon) => {
    return beacon.anchor_id === "A3" && (beacon.layer === "time_capsule" || beacon.title === "Rokid TimeMark" || a3?.kind === "write_back");
  }).length;
}

async function main() {
  await postJson("/api/reset", "reset");

  const space = await fetchJson(`/api/spaces/${spaceId}`, "space");
  const sceneActions = space.scene_actions || [];
  assert(sceneActions.length === 4, "scene_actions must contain the four P0 scene action targets");

  const orderedActions = [
    sceneActionById(sceneActions, "A1_CHECK_IN_STAMP"),
    sceneActionById(sceneActions, "A2_MEMORY_VIEW_AND_COLLECT"),
    sceneActionById(sceneActions, "A3_TIMEMARK_WRITE_BACK"),
    sceneActionById(sceneActions, "USER_B_READBACK_PASS")
  ];

  const execution = [];
  for (const action of orderedActions) {
    execution.push({
      action_id: action.action_id,
      target_id: action.task_target.target_id,
      endpoint_keys: action.task_target.endpoint_sequence.map((step) => step.endpoint_key),
      results: await executeSceneAction(action)
    });
  }

  const state = await fetchJson("/api/state", "state");
  const readiness = await fetchJson("/api/field/target-readiness", "field_target_readiness");
  const acceptance = await fetchJson("/api/field/acceptance", "field_acceptance");
  const ledger = await fetchJson("/api/ledger/summary", "ledger_summary");
  const completedSteps = state.completed_steps || [];
  const requiredSteps = ["read", "find_year", "service_action", "write_back", "user_b_readback"];
  for (const stepId of requiredSteps) {
    assert(completedSteps.includes(stepId), `completed step missing after scene target execution: ${stepId}`);
  }
  assert(state.mission_state === "complete", "mission state must be complete after User B readback target");
  assert(state.active_user === "B", "active user must switch to B for readback proof");
  const writeBackCount = countWriteBackBeacons(state, space);
  assert(writeBackCount >= 1, "A3 TimeMark write-back beacon missing after scene target execution");
  assert(Number(ledger.by_type?.interaction || 0) >= 3, "ledger interaction count too low for scene target rehearsal");
  assert(Number(ledger.by_type?.service_action || 0) >= 1, "ledger service action count missing for scene target rehearsal");
  assert(Number(ledger.by_type?.write_back || 0) >= 1, "ledger write_back count missing for scene target rehearsal");
  assertNoFallbackHardwareClaim(readiness, acceptance);

  const result = {
    ok: true,
    check: "scene-targets",
    mode: "rehearsal",
    shiyao_handoff_required: true,
    fallback_no_hardware_claim: true,
    trusted_hardware_session: false,
    hardware_ready_claim_allowed: false,
    action_targets: execution.map((item) => ({
      action_id: item.action_id,
      target_id: item.target_id,
      endpoint_keys: item.endpoint_keys
    })),
    completed_steps: completedSteps,
    write_back_count: writeBackCount,
    user_b_readback: {
      active_user: state.active_user,
      mission_state: state.mission_state,
      ready_for_shiyao_hardware_retest: true,
      hardware_ready_claim_allowed: false
    },
    field_readiness_status: readiness.status || readiness.summary?.status || "unknown",
    field_acceptance_status: acceptance.status || "unknown",
    ledger_by_type: ledger.by_type || {}
  };

  if (resetAfter) {
    await postJson("/api/reset", "reset_after");
    result.reset_after = true;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, check: "scene-targets", error: error.message }, null, 2));
  process.exit(1);
});
