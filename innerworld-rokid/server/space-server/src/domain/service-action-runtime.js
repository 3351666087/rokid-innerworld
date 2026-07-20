export const SERVICE_ACTION_RECORD_SCHEMA = "innerworld-service-action-record/v1";
export const SERVICE_ACTION_OUTBOX_SCHEMA = "innerworld-service-action-outbox/v1";

export const SERVICE_ACTION_STATUSES = Object.freeze([
  "pending",
  "acknowledged",
  "failed",
  "cancelled"
]);

const SENSITIVE_SERVICE_ACTION_KEYS = new Set([
  "access_token",
  "address",
  "bssid",
  "device_id",
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
  "session_id",
  "ssid",
  "token"
]);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function nowIso() {
  return new Date().toISOString();
}

function clampLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(number)));
}

function trimText(value, maxLength = 160) {
  return redactSensitiveText(String(value || "").trim()).slice(0, maxLength);
}

function cleanToken(value, fallback, maxLength = 80) {
  const candidate = trimText(value, maxLength);
  return candidate || fallback;
}

function redactSensitiveText(value) {
  return String(value || "")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[redacted_ip]")
    .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, "[redacted_mac]")
    .replace(/\b[A-Z0-9._:-]*(?:token|secret)[A-Z0-9._:-]*\b/gi, "[redacted_secret]")
    .replace(/\bSN[-_A-Z0-9]*\b/gi, "[redacted_serial]")
    .replace(/\bprivate[-_\w]*wifi\b/gi, "[redacted_ssid]");
}

export function normalizeServiceActionStatus(value, fallback = "pending") {
  const status = String(value || "").trim().toLowerCase();
  if (status === "all") return "all";
  if (SERVICE_ACTION_STATUSES.includes(status)) return status;
  return fallback;
}

export function normalizeServiceActionOutboxQuery({ limit = DEFAULT_LIMIT, status = "pending" } = {}) {
  return {
    limit: clampLimit(limit),
    status: normalizeServiceActionStatus(status)
  };
}

export function sanitizeServiceActionValue(value, depth = 0, keyHint = "") {
  const normalizedKey = String(keyHint || "").toLowerCase();
  if (SENSITIVE_SERVICE_ACTION_KEYS.has(normalizedKey) || normalizedKey.includes("token") || normalizedKey.includes("secret")) {
    return "[redacted]";
  }

  if (depth > 5) return "[max_depth]";
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return redactSensitiveText(value).slice(0, 400);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeServiceActionValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const clean = {};
    for (const [key, nested] of Object.entries(value)) {
      clean[key] = sanitizeServiceActionValue(nested, depth + 1, key);
    }
    return clean;
  }
  return redactSensitiveText(String(value)).slice(0, 160);
}

function knownServiceAction(space, actionId) {
  const actions = Array.isArray(space?.service_actions) ? space.service_actions : [];
  return actions.find((action) => action.action_id === actionId) || actions[0] || null;
}

function buildRecordId(actionId, createdAt) {
  const prefix = cleanToken(actionId, "service_action", 40).replace(/[^A-Za-z0-9_.:-]/g, "_");
  const time = Date.parse(createdAt) || Date.now();
  return `svc-${prefix}-${time.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createServiceActionRecord({
  body = {},
  space = {},
  state = {},
  createdAt = nowIso()
} = {}) {
  const requestedActionId = cleanToken(body.action_id, "", 80);
  const known = knownServiceAction(space, requestedActionId);
  const actionId = cleanToken(requestedActionId || known?.action_id, "FIELD_SERVICE_ACTION", 80);
  const payload = sanitizeServiceActionValue(body) || {};

  return publicServiceActionRecord({
    schema: SERVICE_ACTION_RECORD_SCHEMA,
    action_record_id: buildRecordId(actionId, createdAt),
    action_id: actionId,
    status: "pending",
    space_id: cleanToken(body.space_id || space?.space_id, null, 80),
    mission_id: cleanToken(space?.mission?.mission_id, null, 80),
    user_id: cleanToken(body.user_id || state?.active_user, "A", 40),
    anchor_id: cleanToken(body.anchor_id || known?.anchor_id, null, 40),
    step_id: cleanToken(body.step_id, "service_action", 48),
    label: trimText(body.label || known?.label || actionId, 120),
    payload,
    ack: null,
    attempts: 0,
    created_at: createdAt,
    updated_at: createdAt,
    acknowledged_at: null
  });
}

export function buildServiceActionAck({
  body = {},
  record = {},
  createdAt = nowIso()
} = {}) {
  const acknowledgedBy = cleanToken(body.ack_by || body.device_id || body.user_id, "field_operator", 80);
  return sanitizeServiceActionValue({
    schema: `${SERVICE_ACTION_RECORD_SCHEMA}/ack`,
    action_record_id: record.action_record_id || body.action_record_id || null,
    action_id: record.action_id || body.action_id || null,
    acknowledged_by: acknowledgedBy,
    device_id: body.device_id || null,
    status: "acknowledged",
    note: body.note || body.message || "",
    received_at: createdAt,
    payload: body
  });
}

export function publicServiceActionRecord(record = {}) {
  const status = normalizeServiceActionStatus(record.status, "pending");
  return {
    schema: record.schema || SERVICE_ACTION_RECORD_SCHEMA,
    action_record_id: cleanToken(record.action_record_id, "", 120),
    action_id: cleanToken(record.action_id, "FIELD_SERVICE_ACTION", 80),
    status,
    space_id: cleanToken(record.space_id, null, 80),
    mission_id: cleanToken(record.mission_id, null, 80),
    user_id: cleanToken(record.user_id, "A", 40),
    anchor_id: cleanToken(record.anchor_id, null, 40),
    step_id: cleanToken(record.step_id, "service_action", 48),
    label: trimText(record.label || record.action_id || "Service action", 120),
    payload: sanitizeServiceActionValue(record.payload || {}),
    ack: record.ack ? sanitizeServiceActionValue(record.ack) : null,
    attempts: Math.max(0, Number(record.attempts || 0)),
    created_at: record.created_at || nowIso(),
    updated_at: record.updated_at || record.created_at || nowIso(),
    acknowledged_at: record.acknowledged_at || null
  };
}
