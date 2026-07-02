export function missionLastIndex(space) {
  const steps = Array.isArray(space?.mission?.steps) ? space.mission.steps : [];
  return Math.max(0, steps.length - 1);
}

export function ensureRuntimeArrays(state) {
  state.beacons = Array.isArray(state.beacons) ? state.beacons : [];
  state.completed_steps = Array.isArray(state.completed_steps) ? state.completed_steps : [];
  state.events = Array.isArray(state.events) ? state.events : [];
}

const SENSITIVE_EVENT_KEYS = new Set([
  "access_token",
  "address",
  "bssid",
  "gateway",
  "ip",
  "ip_address",
  "ipv4",
  "ipv6",
  "mac",
  "mac_address",
  "phone",
  "recipient",
  "serial",
  "serial_number",
  "ssid",
  "token"
]);

export function sanitizeEventPayload(value, depth = 0) {
  if (depth > 5) return "[max_depth]";
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, 400);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeEventPayload(item, depth + 1));
  }
  if (typeof value === "object") {
    const clean = {};
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = String(key).toLowerCase();
      if (SENSITIVE_EVENT_KEYS.has(normalizedKey)) continue;
      if (normalizedKey.includes("token") || normalizedKey.includes("secret")) continue;
      clean[key] = sanitizeEventPayload(nested, depth + 1);
    }
    return clean;
  }
  return String(value).slice(0, 160);
}

export function makeEvent(type, payload, createdAt = new Date().toISOString()) {
  return {
    event_id: `${Date.now()}_${type}`,
    type,
    payload: sanitizeEventPayload(payload),
    created_at: createdAt
  };
}

export function applyInteraction({ state, space, body, createdAt = new Date().toISOString() }) {
  ensureRuntimeArrays(state);
  const lastIndex = missionLastIndex(space);

  if (body.user_id) state.active_user = String(body.user_id);
  if (body.mission_state) state.mission_state = String(body.mission_state);
  if (body.step_id && !state.completed_steps.includes(body.step_id)) {
    state.completed_steps.push(body.step_id);
    state.current_step_index = Math.min(state.completed_steps.length, lastIndex);
  } else if (body.step_id === "write_back") {
    state.current_step_index = lastIndex;
  }

  state.events.push(makeEvent("interaction", body, createdAt));
  return state;
}

export function applyServiceAction({ state, space, body, createdAt = new Date().toISOString() }) {
  ensureRuntimeArrays(state);
  state.mission_state = "service_ready";
  if (!state.completed_steps.includes("service_action")) {
    state.completed_steps.push("service_action");
  }
  state.current_step_index = missionLastIndex(space);
  state.events.push(makeEvent("service_action", body, createdAt));
  return state;
}

export function applyWriteBack({ state, space, body, text, createdAt = new Date().toISOString() }) {
  ensureRuntimeArrays(state);
  const cleanText = String(text || "").trim();
  const beacon = {
    beacon_id: `B_WRITE_${Date.now()}`,
    anchor_id: body.anchor_id || "A3",
    layer: "time_capsule",
    title: body.title || "后来者留言",
    body: cleanText,
    display_text: cleanText.length > 24 ? `${cleanText.slice(0, 24)}...` : cleanText,
    source: body.user_id || state.active_user || "A",
    created_at: createdAt
  };

  state.beacons.push(beacon);
  state.mission_state = "complete";
  state.current_step_index = missionLastIndex(space);
  if (!state.completed_steps.includes("write_back")) {
    state.completed_steps.push("write_back");
  }
  state.events.push(makeEvent("write_back", beacon, createdAt));
  return beacon;
}
