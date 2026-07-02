export const INNERWORLD_SPACE_ID = "innerworld_campus_wall";
export const INNERWORLD_SERVICE_NAME = "innerworld-space-server";
export const DEVICE_BOOTSTRAP_PROTOCOL = "innerworld-device-bootstrap/v1";
export const DEVICE_RUNTIME_MANIFEST_SCHEMA = "innerworld-device-runtime-manifest/v1";
export const DEVICE_RUNTIME_SESSION_PROTOCOL = "innerworld-device-runtime-session/v1";
export const WALL_CALIBRATION_SCHEMA = "innerworld-wall-calibration/v1";
export const WALL_CALIBRATION_OBSERVATION_SCHEMA = "innerworld-wall-calibration-observation/v1";
export const FIELD_MARKER_SCHEMA = "innerworld-field-markers/v1";
export const DEFAULT_DEVICE_PROFILE = "rokid-ar";
export const DEFAULT_PORT = 5177;
export const EVIDENCE_CHAIN_SCHEMA = "innerworld-evidence-chain/v1";
export const SESSION_PLAN_SCHEMA = "innerworld-session-plan/v1";

export const FIELD_SESSION_STAGE_IDS = Object.freeze([
  "opening",
  "read",
  "service",
  "writeback",
  "handoff"
]);

export const MISSION_STEP_IDS = Object.freeze([
  "read",
  "find_year",
  "service_action",
  "write_back"
]);

export const MISSION_STATES = Object.freeze([
  "entered",
  "reading",
  "doing",
  "service_ready",
  "writing",
  "complete"
]);

export const ACCEPTANCE_TARGETS = Object.freeze({
  initial_state: "entered",
  initial_beacons: 2,
  completed_state: "complete",
  completed_beacons: 3
});

export function trimSlashes(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function joinUrl(baseUrl, pathValue) {
  const base = trimSlashes(baseUrl);
  const path = String(pathValue || "/").startsWith("/") ? String(pathValue || "/") : `/${pathValue}`;
  return `${base}${path}`;
}

export function cleanPublicBaseUrl(value, fallback = `http://localhost:${DEFAULT_PORT}`) {
  const candidate = trimSlashes(value || fallback);
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return trimSlashes(fallback);
}

export function apiEndpoint(baseUrl, pathValue, method = "GET") {
  return {
    method,
    path: pathValue,
    url: joinUrl(baseUrl, pathValue)
  };
}

export function buildEndpointMap(baseUrl, spaceId = INNERWORLD_SPACE_ID) {
  return {
    health: apiEndpoint(baseUrl, "/api/health"),
    ops_status: apiEndpoint(baseUrl, "/api/ops/status"),
    store_status: apiEndpoint(baseUrl, "/api/store/status"),
    dataset_catalog: apiEndpoint(baseUrl, "/api/datasets/catalog"),
    dataset_call: apiEndpoint(baseUrl, "/api/datasets/call", "POST"),
    ledger_summary: apiEndpoint(baseUrl, "/api/ledger/summary"),
    ledger_events: apiEndpoint(baseUrl, "/api/ledger/events"),
    evidence_chain: apiEndpoint(baseUrl, "/api/evidence/chain"),
    session_plan: apiEndpoint(baseUrl, "/api/session/plan"),
    wall_calibration: apiEndpoint(baseUrl, "/api/calibration/wall"),
    wall_calibration_observations: apiEndpoint(baseUrl, "/api/calibration/observations", "POST"),
    field_markers: apiEndpoint(baseUrl, "/api/field/markers"),
    device_bootstrap: apiEndpoint(baseUrl, "/api/device/bootstrap"),
    device_manifest: apiEndpoint(baseUrl, "/api/device/manifest"),
    device_register: apiEndpoint(baseUrl, "/api/device/register", "POST"),
    device_heartbeat: apiEndpoint(baseUrl, "/api/device/heartbeat", "POST"),
    device_sessions: apiEndpoint(baseUrl, "/api/device/sessions"),
    service_actions_outbox: apiEndpoint(baseUrl, "/api/service-actions/outbox"),
    service_action_ack_template: apiEndpoint(baseUrl, "/api/service-actions/{action_record_id}/ack", "POST"),
    ai_schema: apiEndpoint(baseUrl, "/api/ai/schema"),
    ai_prompt: apiEndpoint(baseUrl, "/api/ai/prompt"),
    ai_hud: apiEndpoint(baseUrl, "/api/ai/hud", "POST"),
    space: apiEndpoint(baseUrl, `/api/spaces/${spaceId}`),
    state: apiEndpoint(baseUrl, "/api/state"),
    nearby_pins: apiEndpoint(baseUrl, "/api/pins/nearby?radius=20"),
    interactions: apiEndpoint(baseUrl, "/api/interactions", "POST"),
    service_actions: apiEndpoint(baseUrl, "/api/service-actions", "POST"),
    write_back: apiEndpoint(baseUrl, `/api/spaces/${spaceId}/beacons`, "POST"),
    reset: apiEndpoint(baseUrl, "/api/reset", "POST")
  };
}

export function missionSteps(space) {
  return Array.isArray(space?.mission?.steps) ? space.mission.steps : [];
}

export function anchors(space) {
  return Array.isArray(space?.anchors) ? space.anchors : [];
}

export function beacons(stateOrSpace) {
  return Array.isArray(stateOrSpace?.beacons) ? stateOrSpace.beacons : [];
}

export function completedSteps(state) {
  return Array.isArray(state?.completed_steps) ? state.completed_steps : [];
}

export function aiDisplayTextMaxLength(aiSchema) {
  return aiSchema?.properties?.display_text?.maxLength || 54;
}

export function normalizeMissionState(space, state) {
  if (!state || typeof state !== "object") return state;

  const steps = missionSteps(space);
  const done = completedSteps(state);
  const completed = new Set(done);
  const allStepsDone = steps.length > 0 && steps.every((step) => completed.has(step.step_id));

  if (allStepsDone || completed.has("write_back")) {
    state.mission_state = "complete";
    state.current_step_index = Math.max(0, steps.length - 1);
  } else if (typeof state.current_step_index !== "number") {
    state.current_step_index = Math.min(done.length, Math.max(0, steps.length - 1));
  }

  return state;
}

export function buildDemoStatus(space, state) {
  normalizeMissionState(space, state);
  const spaceAnchors = anchors(space);
  const steps = missionSteps(space);
  const runtimeBeacons = beacons(state);
  const done = completedSteps(state);

  return {
    demo_ready: Boolean(space?.space_id && spaceAnchors.length > 0 && steps.length > 0 && runtimeBeacons.length > 0),
    space_id: space?.space_id,
    space_version: space?.version,
    anchor_count: spaceAnchors.length,
    beacon_count: runtimeBeacons.length,
    mission_state: state?.mission_state || space?.mission?.state || "unknown",
    current_step_index: state?.current_step_index ?? 0,
    mission_step_count: steps.length,
    completed_step_count: done.length,
    cache_safe_note: "API JSON responses use Cache-Control: no-store; Unity clients should re-fetch after writeback or reset."
  };
}

export function buildDeviceBootstrap({
  baseUrl,
  profile = DEFAULT_DEVICE_PROFILE,
  space,
  state,
  aiSchema,
  generatedAt = new Date().toISOString()
}) {
  const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
  const spaceId = space?.space_id || INNERWORLD_SPACE_ID;
  const endpoints = buildEndpointMap(publicBaseUrl, spaceId);
  const steps = missionSteps(space);

  return {
    ok: true,
    protocol_version: DEVICE_BOOTSTRAP_PROTOCOL,
    generated_at: generatedAt,
    profile,
    service: INNERWORLD_SERVICE_NAME,
    base_url: publicBaseUrl,
    space: {
      space_id: spaceId,
      name: space?.name,
      version: space?.version,
      entry: space?.entry,
      grid: space?.grid,
      layers: space?.layers,
      display_rule: space?.display_rule
    },
    anchors: anchors(space).map((anchor) => ({
      anchor_id: anchor.anchor_id,
      label: anchor.label,
      kind: anchor.kind,
      pose: anchor.pose,
      grid_pos: anchor.grid_pos,
      default_state: anchor.default_state
    })),
    mission: {
      mission_id: space?.mission?.mission_id,
      title: space?.mission?.title,
      state: state?.mission_state || space?.mission?.state,
      current_step_index: state?.current_step_index ?? 0,
      steps: steps.map((step) => ({
        step_id: step.step_id,
        label: step.label,
        anchor_id: step.anchor_id,
        hint: step.hint
      }))
    },
    runtime: {
      active_user: state?.active_user,
      mission_state: state?.mission_state,
      completed_steps: completedSteps(state),
      beacon_count: beacons(state).length
    },
    endpoints,
    ai: {
      output_schema_title: aiSchema?.title,
      output_schema_url: endpoints.ai_schema.url,
      prompt_url: endpoints.ai_prompt.url,
      display_text_max_length: aiDisplayTextMaxLength(aiSchema)
    },
    client_hints: {
      poll_interval_ms: 1000,
      health_interval_ms: 3000,
      request_timeout_ms: 5000,
      json_cache_policy: "no-store",
      cleartext_http_required_for_lan: publicBaseUrl.startsWith("http://"),
      write_back_anchor_id: "A3"
    },
    unity_compat: {
      config: {
        base_url: publicBaseUrl,
        space_id: spaceId
      }
    },
    acceptance: {
      ...ACCEPTANCE_TARGETS,
      completed_steps: steps.length
    }
  };
}

export async function parseJsonResponse(res, fallbackMessage = "request_failed") {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body;
}

export function createInnerWorldClient({
  baseUrl = "",
  spaceId = INNERWORLD_SPACE_ID,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is required for InnerWorld client");
  }

  const request = async (pathValue, options = {}, fallbackMessage = "request_failed") => {
    const res = await fetchImpl(joinUrl(baseUrl, pathValue), options);
    return parseJsonResponse(res, fallbackMessage);
  };

  return {
    spaceId,
    endpoints(base = baseUrl) {
      return buildEndpointMap(cleanPublicBaseUrl(base), spaceId);
    },
    getHealth() {
      return request("/api/health", {}, "health_failed");
    },
    getSpace() {
      return request(`/api/spaces/${spaceId}`, {}, "space_failed");
    },
    getState() {
      return request("/api/state", {}, "state_failed");
    },
    getOpsStatus() {
      return request("/api/ops/status", {}, "ops_status_failed");
    },
    getStoreStatus() {
      return request("/api/store/status", {}, "store_status_failed");
    },
    getDatasetCatalog() {
      return request("/api/datasets/catalog", {}, "dataset_catalog_failed");
    },
    callDataset(payload) {
      return request("/api/datasets/call", jsonPost(payload), "dataset_call_failed");
    },
    getLedgerSummary() {
      return request("/api/ledger/summary", {}, "ledger_summary_failed");
    },
    getLedgerEvents({ limit = 25, type = "" } = {}) {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      if (type) params.set("type", String(type));
      const query = params.toString();
      return request(`/api/ledger/events${query ? `?${query}` : ""}`, {}, "ledger_events_failed");
    },
    getEvidenceChain() {
      return request("/api/evidence/chain", {}, "evidence_chain_failed");
    },
    getSessionPlan() {
      return request("/api/session/plan", {}, "session_plan_failed");
    },
    getWallCalibration() {
      return request("/api/calibration/wall", {}, "wall_calibration_failed");
    },
    submitWallCalibrationObservation(payload) {
      return request("/api/calibration/observations", jsonPost(payload), "wall_calibration_observation_failed");
    },
    getFieldMarkers() {
      return request("/api/field/markers", {}, "field_markers_failed");
    },
    getDeviceBootstrap(profile = DEFAULT_DEVICE_PROFILE) {
      return request(`/api/device/bootstrap?profile=${encodeURIComponent(profile)}`, {}, "device_bootstrap_failed");
    },
    getDeviceManifest() {
      return request("/api/device/manifest", {}, "device_manifest_failed");
    },
    registerDevice(payload) {
      return request("/api/device/register", jsonPost(payload), "device_register_failed");
    },
    sendDeviceHeartbeat(payload) {
      return request("/api/device/heartbeat", jsonPost(payload), "device_heartbeat_failed");
    },
    getDeviceSessions() {
      return request("/api/device/sessions", {}, "device_sessions_failed");
    },
    getServiceActionOutbox({ limit = 25, status = "pending" } = {}) {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      if (status) params.set("status", status);
      const query = params.toString();
      return request(`/api/service-actions/outbox${query ? `?${query}` : ""}`, {}, "service_actions_outbox_failed");
    },
    ackServiceAction(actionRecordId, payload = {}) {
      const recordId = encodeURIComponent(String(actionRecordId || ""));
      return request(`/api/service-actions/${recordId}/ack`, jsonPost(payload), "service_action_ack_failed");
    },
    generateHud(payload) {
      return request("/api/ai/hud", jsonPost(payload), "ai_hud_failed");
    },
    reset() {
      return request("/api/reset", { method: "POST" }, "reset_failed");
    },
    interact(payload) {
      return request("/api/interactions", jsonPost(payload), "interaction_failed");
    },
    serviceAction(payload) {
      return request("/api/service-actions", jsonPost(payload), "service_action_failed");
    },
    writeBack(payload) {
      return request(`/api/spaces/${spaceId}/beacons`, jsonPost(payload), "write_back_failed");
    }
  };
}

export function jsonPost(payload) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  };
}
