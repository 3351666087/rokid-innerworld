import {
  DEFAULT_DEVICE_PROFILE,
  DEVICE_RUNTIME_MANIFEST_SCHEMA,
  DEVICE_RUNTIME_SESSION_PROTOCOL,
  INNERWORLD_SERVICE_NAME,
  anchors,
  beacons,
  buildEndpointMap,
  cleanPublicBaseUrl,
  completedSteps,
  missionSteps,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";
import fs from "node:fs";
import path from "node:path";

const DEVICE_ID_MAX_LENGTH = 48;
const CLIENT_VERSION_MAX_LENGTH = 40;
const SESSION_RETENTION_LIMIT = 40;
const EVENT_RETENTION_LIMIT = 120;
const SESSION_STALE_AFTER_MS = 15_000;
const SESSION_EXPIRES_AFTER_MS = 60_000;
const DEVICE_RUNTIME_SNAPSHOT_SCHEMA = "innerworld-device-runtime-snapshot/v1";
const DEFAULT_SNAPSHOT_PATH = path.join(process.cwd(), "output", "runtime", "device-runtime-snapshot.json");
const ROKID_SDK_BINDING_SCHEMA = "innerworld-rokid-sdk-binding/v1";
const ROKID_UXR_DEFINE_SYMBOL = "ROKID_UXR";
const HARDWARE_OBSERVATION_TRACKING_MODES = new Set(["qr", "image_tracking", "slam"]);

const SDK_BINDING_STAGES = Object.freeze([
  "fallback_only",
  "boundary_compiled",
  "package_detected",
  "live_binding_ready"
]);

const REQUIRED_CAPABILITIES = Object.freeze([
  {
    id: "display.hud_overlay",
    label: "HUD overlay display",
    required_for: ["RA202"],
    reason: "Render low-distraction memory, hint, service, and write-back text in the glasses."
  },
  {
    id: "pose.head_tracking",
    label: "Head pose tracking",
    required_for: ["RA202"],
    reason: "Keep anchors stable against the real campus wall."
  },
  {
    id: "input.gaze_or_touch",
    label: "Gaze, touch, or controller input",
    required_for: ["RA202", "RAS201"],
    reason: "Advance mission steps and select service/write-back actions."
  },
  {
    id: "network.http_json",
    label: "HTTP JSON client",
    required_for: ["RAS201"],
    reason: "Poll localhost/LAN APIs and post runtime state."
  },
  {
    id: "anchors.local_alignment",
    label: "Local anchor alignment",
    required_for: ["RA202"],
    reason: "Map A1/A2/A3 to the physical wall without storing private room data."
  },
  {
    id: "telemetry.battery",
    label: "Battery telemetry",
    required_for: ["RA202", "RAS201"],
    reason: "Warn operators before a field demo loses power."
  }
]);

const OPTIONAL_CAPABILITIES = Object.freeze([
  "voice.short_dictation",
  "camera.marker_scan",
  "audio.spatial_prompt",
  "storage.ephemeral_cache",
  "diagnostics.fps"
]);

const ADAPTER_SLOTS = Object.freeze([
  {
    slot_id: "rokid_arstudio_input",
    role: "Rokid AR Studio input bridge",
    expected_owner: "Unity runtime",
    accepts: ["gaze", "touchpad", "controller", "voice_short_text"],
    endpoint: "/api/interactions"
  },
  {
    slot_id: "rokid_pose_provider",
    role: "Pose and active-anchor provider",
    expected_owner: "RA202 glasses runtime",
    accepts: ["head_pose", "active_anchor", "confidence"],
    endpoint: "/api/device/heartbeat"
  },
  {
    slot_id: "station_network_client",
    role: "RAS201 LAN/localhost HTTP client",
    expected_owner: "Rokid Station Pro",
    accepts: ["manifest_fetch", "register", "heartbeat", "state_poll"],
    endpoint: "/api/device/register"
  },
  {
    slot_id: "unity_overlay_renderer",
    role: "HUD/overlay renderer",
    expected_owner: "Unity scene",
    accepts: ["ai_hud_output", "mission_snapshot", "pending_actions"],
    endpoint: "/api/ai/hud"
  }
]);

const SENSITIVE_NETWORK_KEYS = new Set([
  "address",
  "addresses",
  "bssid",
  "gateway",
  "ip",
  "ip_address",
  "ipv4",
  "ipv6",
  "mac",
  "mac_address",
  "phone",
  "serial",
  "serial_number",
  "ssid",
  "token"
]);

function trimText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function sanitizeDeviceId(value, { allowFallback = true } = {}) {
  const cleaned = trimText(redactSensitiveText(value, DEVICE_ID_MAX_LENGTH), DEVICE_ID_MAX_LENGTH)
    .replace(/[^\w.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || (allowFallback ? `device-${Math.random().toString(36).slice(2, 8)}` : null);
}

function sanitizeProfile(value) {
  const profile = trimText(value, 32).replace(/[^\w.-]+/g, "-");
  return profile || DEFAULT_DEVICE_PROFILE;
}

function sanitizeClientVersion(value) {
  const version = trimText(value, CLIENT_VERSION_MAX_LENGTH).replace(/[^\w.+:-]+/g, "-");
  return version || "unknown";
}

function sanitizeCapabilityId(value) {
  return trimText(value, 64).replace(/[^\w.:-]+/g, "_");
}

function normalizeCapabilities(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeCapabilityId).filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1)
      .map(([key]) => sanitizeCapabilityId(key))
      .filter(Boolean);
  }

  return [];
}

function sanitizeNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
}

function sanitizeBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
}

function sanitizeEnumText(value, maxLength = 32) {
  const cleaned = trimText(value, maxLength).replace(/[^\w.+:-]+/g, "-");
  return cleaned || null;
}

function redactSensitiveText(value, maxLength = 180) {
  let text = trimText(value, maxLength);
  if (!text) return "";

  text = text
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-ip]")
    .replace(/\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b/gi, "[redacted-mac]")
    .replace(/\bSN[-_:]?[A-Z0-9][A-Z0-9._:-]{2,}\b/g, "[redacted-serial]")
    .replace(/(?<!redacted-)\bserial[-_:][A-Za-z0-9._:-]+\b/gi, "[redacted-serial]")
    .replace(/\b[A-Za-z0-9._:-]*(?:token|secret|password|api[-_]?key|access[-_]?key)[A-Za-z0-9._:-]*\b/gi, "[redacted-secret]")
    .replace(/\b[A-Za-z0-9._:-]*(?:ssid|wifi|wi-fi|phone|address)[A-Za-z0-9._:-]*\b/gi, "[redacted-private]");

  return trimText(text, maxLength);
}

function sanitizeProofId(value, maxLength = 64) {
  const redacted = redactSensitiveText(value, maxLength)
    .replace(/\[redacted-([a-z]+)\]/gi, "redacted-$1");
  return trimText(redacted, maxLength)
    .replace(/[^\w.:-]+/g, "-")
    .replace(/^-+|-+$/g, "") || null;
}

function normalizeSdkBindingStage(value, fallback = "fallback_only") {
  const clean = sanitizeEnumText(value, 32);
  const normalized = clean
    ? clean.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/-/g, "_").toLowerCase()
    : null;
  return SDK_BINDING_STAGES.includes(normalized) ? normalized : fallback;
}

function sanitizeStringList(value, maxItems = 12, maxLength = 96) {
  if (!Array.isArray(value)) return [];
  const rows = [];
  for (const item of value) {
    const clean = redactSensitiveText(item, maxLength).replace(/[^\w.+:\[\]-]+/g, "-");
    if (clean && !rows.includes(clean)) rows.push(clean);
    if (rows.length >= maxItems) break;
  }
  return rows;
}

function buildDefaultSdkBindingStatus(source = "server_manifest") {
  return {
    schema: ROKID_SDK_BINDING_SCHEMA,
    source,
    define_symbol: ROKID_UXR_DEFINE_SYMBOL,
    stage: "fallback_only",
    boundary_compiled: false,
    package_detected: false,
    input_binding_ready: false,
    overlay_binding_ready: false,
    live_binding_ready: false,
    candidate_assemblies: [],
    candidate_types: [],
    message: "Awaiting Unity-side SDK binding report; server keeps the Space API stable while fallback runs.",
    proof_required: [
      "Unity reports ROKID_UXR boundary compiled",
      "official Rokid UXR package assembly/type detected",
      "input adapter maps gaze/ray/gesture/voice into IRokidInputSource",
      "overlay adapter renders HUD through IRokidOverlayRenderer",
      "device heartbeat remains healthy over LAN"
    ]
  };
}

function sanitizeSdkBindingStatus(value, source = "device_report") {
  if (!value || typeof value !== "object") {
    return buildDefaultSdkBindingStatus("not_reported");
  }

  const boundaryCompiled = sanitizeBoolean(value.boundary_compiled ?? value.is_rokid_uxr_compiled ?? value.compiled) === true;
  const packageDetected = sanitizeBoolean(value.package_detected ?? value.sdk_package_detected) === true;
  const inputBindingReady = sanitizeBoolean(value.input_binding_ready ?? value.input_ready) === true;
  const overlayBindingReady = sanitizeBoolean(value.overlay_binding_ready ?? value.overlay_ready) === true;
  const liveBindingReady = sanitizeBoolean(value.live_binding_ready ?? value.sdk_live_binding_ready) === true
    || (inputBindingReady && overlayBindingReady);
  const explicitStage = value.stage || value.binding_stage || value.sdk_binding_stage;
  let stage = normalizeSdkBindingStage(explicitStage, "fallback_only");
  if (!explicitStage) {
    if (liveBindingReady) stage = "live_binding_ready";
    else if (packageDetected) stage = "package_detected";
    else if (boundaryCompiled) stage = "boundary_compiled";
  }

  return {
    schema: ROKID_SDK_BINDING_SCHEMA,
    source,
    define_symbol: trimText(value.define_symbol || value.defineSymbol || ROKID_UXR_DEFINE_SYMBOL, 32) || ROKID_UXR_DEFINE_SYMBOL,
    stage,
    boundary_compiled: boundaryCompiled,
    package_detected: packageDetected,
    input_binding_ready: inputBindingReady,
    overlay_binding_ready: overlayBindingReady,
    live_binding_ready: liveBindingReady,
    candidate_assemblies: sanitizeStringList(value.candidate_assemblies || value.candidateAssemblies),
    candidate_types: sanitizeStringList(value.candidate_types || value.candidateTypes),
    message: redactSensitiveText(value.message || value.status_message, 180) || buildDefaultSdkBindingStatus(source).message,
    proof_required: buildDefaultSdkBindingStatus(source).proof_required
  };
}

function summarizeSdkBindingStatus(status) {
  const binding = status && typeof status === "object" ? status : buildDefaultSdkBindingStatus("not_reported");
  return {
    stage: binding.stage || "fallback_only",
    boundary_compiled: binding.boundary_compiled === true,
    package_detected: binding.package_detected === true,
    live_binding_ready: binding.live_binding_ready === true,
    message: trimText(binding.message, 180)
  };
}

function summarizeSdkBindingAcrossSessions(rows = []) {
  const statuses = rows.map((row) => row?.sdk_binding_status).filter(Boolean);
  return {
    schema: ROKID_SDK_BINDING_SCHEMA,
    reported_sessions: statuses.length,
    boundary_compiled_sessions: statuses.filter((status) => status.boundary_compiled === true).length,
    package_detected_sessions: statuses.filter((status) => status.package_detected === true).length,
    live_bound_sessions: statuses.filter((status) => status.live_binding_ready === true).length,
    latest_stage: statuses[0]?.stage || "fallback_only",
    latest_message: statuses[0]?.message || "No Unity SDK binding report has been received yet."
  };
}

function sanitizeNetwork(value) {
  if (!value || typeof value !== "object") {
    return {
      online: null,
      transport: null,
      rtt_ms: null,
      lan_reachable: null,
      http_cleartext_allowed: null
    };
  }

  const network = {};
  const allowed = {
    captive_portal: "boolean",
    dns_ok: "boolean",
    http_cleartext_allowed: "boolean",
    lan_reachable: "boolean",
    metered: "boolean",
    online: "boolean",
    rtt_ms: "number",
    signal_level: "number",
    transport: "text",
    type: "text",
    wifi_band: "text"
  };

  for (const [key, kind] of Object.entries(allowed)) {
    if (SENSITIVE_NETWORK_KEYS.has(key) || value[key] === undefined) continue;
    if (kind === "boolean") network[key] = sanitizeBoolean(value[key]);
    if (kind === "number") network[key] = sanitizeNumber(value[key], key === "signal_level" ? -120 : 0, key === "signal_level" ? 0 : 60000);
    if (kind === "text") network[key] = sanitizeEnumText(value[key]);
  }

  return network;
}

function sanitizeBattery(value) {
  if (!value || typeof value !== "object") return null;
  return {
    level_percent: sanitizeNumber(value.level_percent ?? value.percent ?? value.level, 0, 100),
    charging: sanitizeBoolean(value.charging),
    temperature_c: sanitizeNumber(value.temperature_c, -20, 80)
  };
}

function sanitizePose(value) {
  if (!value || typeof value !== "object") return null;
  const confidence = sanitizeNumber(value.confidence, 0, 1);
  const position = value.position && typeof value.position === "object"
    ? {
        x: sanitizeNumber(value.position.x, -1000, 1000),
        y: sanitizeNumber(value.position.y, -1000, 1000),
        z: sanitizeNumber(value.position.z, -1000, 1000)
      }
    : null;
  const rotation = value.rotation && typeof value.rotation === "object"
    ? {
        x: sanitizeNumber(value.rotation.x, -360, 360),
        y: sanitizeNumber(value.rotation.y, -360, 360),
        z: sanitizeNumber(value.rotation.z, -360, 360),
        w: sanitizeNumber(value.rotation.w, -1, 1)
      }
    : null;

  return {
    confidence,
    position: position && Object.values(position).some((item) => item !== null) ? position : null,
    rotation: rotation && Object.values(rotation).some((item) => item !== null) ? rotation : null
  };
}

function generateSessionId(createdAt = new Date()) {
  const stamp = createdAt.toISOString().replace(/\D/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 10);
  return `iw-${stamp}-${random}`;
}

function nowMs(value = new Date()) {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

function ageMs(timestamp, referenceTime = new Date()) {
  const seenAt = nowMs(timestamp);
  return Math.max(0, nowMs(referenceTime) - seenAt);
}

export function getDeviceSessionStatus(session, referenceTime = new Date()) {
  if (!session?.last_seen_at) return "unknown";
  const age = ageMs(session.last_seen_at, referenceTime);
  if (age > SESSION_EXPIRES_AFTER_MS) return "expired";
  if (age > SESSION_STALE_AFTER_MS) return "stale";
  return "online";
}

function sessionExpiresAt(session) {
  const lastSeen = nowMs(session?.last_seen_at);
  return new Date(lastSeen + SESSION_EXPIRES_AFTER_MS).toISOString();
}

function buildRequiredCapabilityStatus(capabilities) {
  const declared = new Set(capabilities);
  const required = REQUIRED_CAPABILITIES.map((capability) => ({
    ...capability,
    present: declared.has(capability.id)
  }));
  const missing = required.filter((capability) => !capability.present).map((capability) => capability.id);

  return {
    required,
    declared: capabilities,
    missing_required: missing,
    ok: missing.length === 0
  };
}

function buildWarnings({ capabilities, network, profile, sdkBindingStatus }) {
  const warnings = [];
  const status = buildRequiredCapabilityStatus(capabilities);
  if (!status.ok) {
    warnings.push({
      code: "missing_required_capabilities",
      severity: "warn",
      message: `Missing required capabilities: ${status.missing_required.join(", ")}`
    });
  }
  if (network?.online === false) {
    warnings.push({
      code: "network_offline",
      severity: "error",
      message: "Device declared network offline; polling will fail until LAN or localhost access is restored."
    });
  }
  if (network?.http_cleartext_allowed === false) {
    warnings.push({
      code: "cleartext_http_blocked",
      severity: "warn",
      message: "Current localhost/LAN demo uses http://; enable cleartext for the dev profile or proxy through HTTPS."
    });
  }
  if (!["rokid-ar", "rokid-unity", "RA202", "RAS201"].includes(profile)) {
    warnings.push({
      code: "unknown_profile",
      severity: "info",
      message: "Profile accepted, but field defaults are tuned for RA202 glasses plus RAS201 station."
    });
  }
  if (sdkBindingStatus?.boundary_compiled && !sdkBindingStatus.live_binding_ready) {
    warnings.push({
      code: "sdk_binding_not_live",
      severity: sdkBindingStatus.package_detected ? "warn" : "info",
      message: "ROKID_UXR boundary is present, but the live SDK input/overlay binding is not proven yet."
    });
  }
  return warnings;
}

function summarizeAnchor(anchor) {
  return {
    anchor_id: anchor.anchor_id,
    label: anchor.label,
    kind: anchor.kind,
    default_state: anchor.default_state,
    grid_pos: anchor.grid_pos,
    has_pose: Boolean(anchor.pose)
  };
}

function buildMissionSnapshot(space, state, activeAnchor = null) {
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
  const currentStepIndex = Math.min(Math.max(runtimeState.current_step_index ?? 0, 0), Math.max(steps.length - 1, 0));
  const currentStep = steps[currentStepIndex] || null;
  const nextStep = steps.find((step) => !done.includes(step.step_id)) || currentStep;
  const spaceAnchors = anchors(space);
  const activeAnchorRecord = spaceAnchors.find((anchor) => anchor.anchor_id === activeAnchor) || null;

  return {
    space_id: space?.space_id || null,
    space_version: space?.version || null,
    mission_id: space?.mission?.mission_id || null,
    title: space?.mission?.title || null,
    state: runtimeState.mission_state || space?.mission?.state || "unknown",
    current_step_index: currentStepIndex,
    current_step: currentStep
      ? {
          step_id: currentStep.step_id,
          label: currentStep.label,
          anchor_id: currentStep.anchor_id,
          hint: currentStep.hint
        }
      : null,
    next_step: nextStep
      ? {
          step_id: nextStep.step_id,
          label: nextStep.label,
          anchor_id: nextStep.anchor_id
        }
      : null,
    completed_steps: done,
    active_user: runtimeState.active_user || null,
    active_anchor: activeAnchorRecord ? summarizeAnchor(activeAnchorRecord) : null,
    anchors: spaceAnchors.map(summarizeAnchor),
    beacon_count: beacons(runtimeState).length
  };
}

function deriveHealthSeverity({ capabilityStatus, network, battery, activeAnchorKnown }) {
  if (network?.online === false) return "critical";
  if (battery?.level_percent !== null && battery?.level_percent <= 10) return "critical";
  if (!activeAnchorKnown) return "error";
  if (!capabilityStatus.ok) return "warn";
  if (battery?.level_percent !== null && battery?.level_percent <= 25) return "warn";
  if (network?.rtt_ms !== null && network?.rtt_ms > 1500) return "warn";
  return "ok";
}

function buildPendingActions({ capabilityStatus, network, battery, activeAnchorKnown, missionSnapshot, sdkBindingStatus }) {
  const actions = [];
  if (!capabilityStatus.ok) {
    actions.push({
      action_id: "declare_required_capabilities",
      priority: "high",
      label: "Declare missing device capabilities",
      missing: capabilityStatus.missing_required
    });
  }
  if (network?.http_cleartext_allowed === false) {
    actions.push({
      action_id: "enable_cleartext_http",
      priority: "medium",
      label: "Allow http:// localhost or provide an HTTPS proxy"
    });
  }
  if (battery?.level_percent !== null && battery?.level_percent <= 25) {
    actions.push({
      action_id: "prepare_power",
      priority: battery.level_percent <= 10 ? "high" : "medium",
      label: "Prepare charger or swap demo device"
    });
  }
  if (!activeAnchorKnown) {
    actions.push({
      action_id: "realign_anchor",
      priority: "high",
      label: "Re-align to A1/A2/A3 before showing HUD content"
    });
  }
  if (sdkBindingStatus?.boundary_compiled && !sdkBindingStatus.live_binding_ready) {
    actions.push({
      action_id: "bind_rokid_sdk_live_adapter",
      priority: sdkBindingStatus.package_detected ? "high" : "medium",
      label: "Finish live Rokid SDK input and overlay binding",
      binding_stage: sdkBindingStatus.stage
    });
  }
  if (missionSnapshot?.next_step?.anchor_id) {
    actions.push({
      action_id: "render_next_mission_step",
      priority: "normal",
      label: `Render next step at ${missionSnapshot.next_step.anchor_id}`,
      step_id: missionSnapshot.next_step.step_id,
      anchor_id: missionSnapshot.next_step.anchor_id
    });
  }
  return actions;
}

function endpointSubset(endpoints) {
  return {
    manifest: endpoints.device_manifest,
    register: endpoints.device_register,
    heartbeat: endpoints.device_heartbeat,
    sessions: endpoints.device_sessions,
    bootstrap: endpoints.device_bootstrap,
    state: endpoints.state,
    ai_hud: endpoints.ai_hud,
    interactions: endpoints.interactions,
    service_actions: endpoints.service_actions,
    write_back: endpoints.write_back
  };
}

function buildPollIntervals(capabilityStatus) {
  return {
    heartbeat_ms: capabilityStatus.ok ? 1200 : 900,
    state_ms: 1000,
    action_ms: 600,
    manifest_refresh_ms: 300000
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readSnapshot(snapshotPath) {
  try {
    if (!snapshotPath || !fs.existsSync(snapshotPath)) return null;
    const raw = fs.readFileSync(snapshotPath, "utf8");
    const snapshot = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (snapshot?.schema !== DEVICE_RUNTIME_SNAPSHOT_SCHEMA) return null;
    return snapshot;
  } catch {
    return null;
  }
}

function publicSnapshotPath(snapshotPath) {
  if (!snapshotPath) return null;
  const relative = path.relative(process.cwd(), snapshotPath);
  return relative && !relative.startsWith("..") ? relative.replace(/\\/g, "/") : path.basename(snapshotPath);
}

function writeSnapshot(snapshotPath, snapshot) {
  if (!snapshotPath) return { ok: false, path: null };
  try {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    const tmpPath = `${snapshotPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    fs.renameSync(tmpPath, snapshotPath);
    return { ok: true, path: publicSnapshotPath(snapshotPath), written_at: snapshot.generated_at };
  } catch (error) {
    return {
      ok: false,
      path: publicSnapshotPath(snapshotPath),
      error: error?.code || "snapshot_write_failed"
    };
  }
}

function serializeMap(map) {
  return Array.from(map.values()).map((item) => cloneJson(item));
}

function hydrateMap(rows, key) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row && row[key]) map.set(row[key], row);
  }
  return map;
}

function buildRuntimeSnapshot({ devices, sessions, events, snapshotPath, generatedAt = new Date() }) {
  return {
    schema: DEVICE_RUNTIME_SNAPSHOT_SCHEMA,
    generated_at: generatedAt.toISOString(),
    snapshot_path: publicSnapshotPath(snapshotPath),
    retention: {
      sessions: SESSION_RETENTION_LIMIT,
      events: EVENT_RETENTION_LIMIT,
      stale_after_ms: SESSION_STALE_AFTER_MS,
      expires_after_ms: SESSION_EXPIRES_AFTER_MS
    },
    privacy: {
      stored: [
        "sanitized device identifiers",
        "declared capabilities",
        "coarse network flags",
        "battery summary",
        "session timestamps",
        "bounded event log"
      ],
      omitted: ["serial_number", "tokens", "phone", "network addresses", "ssid", "mac", "raw pose"]
    },
    devices: serializeMap(devices),
    sessions: serializeMap(sessions),
    events: events.map((event) => cloneJson(event))
  };
}

function addRuntimeEvent(events, event) {
  const runtimeEvent = {
    event_id: `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: (event.at || new Date()).toISOString(),
    type: sanitizeEnumText(event.type, 48) || "device_event",
    session_id: event.session_id || null,
    device_id: event.device_id || null,
    severity: sanitizeEnumText(event.severity, 16) || "info",
    summary: trimText(event.summary, 160),
    details: event.details && typeof event.details === "object" ? cloneJson(event.details) : {}
  };
  events.push(runtimeEvent);
  if (events.length > EVENT_RETENTION_LIMIT) {
    events.splice(0, events.length - EVENT_RETENTION_LIMIT);
  }
  return runtimeEvent;
}

export function restoreDeviceRuntimeSnapshot(snapshotPath = DEFAULT_SNAPSHOT_PATH) {
  const snapshot = readSnapshot(snapshotPath);
  if (!snapshot) {
  return {
    ok: false,
    restored: false,
    snapshot_path: publicSnapshotPath(snapshotPath)
  };
  }

  return {
    ok: true,
    restored: true,
    snapshot_path: publicSnapshotPath(snapshotPath),
    generated_at: snapshot.generated_at,
    devices: hydrateMap(snapshot.devices, "device_id"),
    sessions: hydrateMap(snapshot.sessions, "session_id"),
    events: Array.isArray(snapshot.events) ? snapshot.events.slice(-EVENT_RETENTION_LIMIT) : []
  };
}

export function buildDeviceRuntimeSmokeSummary({
  devices = new Map(),
  sessions = new Map(),
  events = [],
  snapshot = null,
  generatedAt = new Date()
} = {}) {
  const sessionRows = Array.from(sessions.values());
  const statusCounts = sessionRows.reduce((counts, session) => {
    const status = getDeviceSessionStatus(session, generatedAt);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const recentEvents = events.slice(-8).map((event) => ({
    at: event.at,
    type: event.type,
    severity: event.severity,
    device_id: event.device_id,
    session_id: event.session_id,
    summary: event.summary
  }));
  const readySession = sessionRows.some((session) => {
    return getDeviceSessionStatus(session, generatedAt) !== "expired" && session.last_health_severity === "ok";
  });

  return {
    ok: readySession && (snapshot?.ok !== false),
    generated_at: generatedAt.toISOString(),
    devices_registered: devices.size,
    sessions_total: sessions.size,
    sessions_online: statusCounts.online || 0,
    sessions_stale: statusCounts.stale || 0,
    sessions_expired: statusCounts.expired || 0,
    recent_event_count: recentEvents.length,
    recent_events: recentEvents,
    snapshot: snapshot
      ? {
          ok: snapshot.ok === true,
          path: snapshot.path || snapshot.snapshot_path || null,
          written_at: snapshot.written_at || snapshot.generated_at || null,
          restored: snapshot.restored === true
        }
      : null,
    checks: {
      has_registered_device: devices.size > 0,
      has_live_session: (statusCounts.online || 0) > 0,
      has_healthy_session: readySession,
      snapshot_available: snapshot ? snapshot.ok !== false : false
    },
    sdk_binding: summarizeSdkBindingAcrossSessions(sessionRows)
  };
}

export function createDeviceRuntimeStore({
  snapshotPath = DEFAULT_SNAPSHOT_PATH,
  restoreSnapshot = false,
  persistSnapshot = true,
  sessionStore = null
} = {}) {
  const restored = restoreSnapshot ? restoreDeviceRuntimeSnapshot(snapshotPath) : null;
  const devices = restored?.restored ? restored.devices : new Map();
  const sessions = restored?.restored ? restored.sessions : new Map();
  const events = restored?.restored ? restored.events : [];
  let lastSnapshot = restored?.restored
    ? {
        ok: true,
        restored: true,
        snapshot_path: snapshotPath,
        generated_at: restored.generated_at
      }
    : null;

  function persist(generatedAt = new Date()) {
    if (!persistSnapshot) return { ok: false, path: snapshotPath, disabled: true };
    const snapshot = buildRuntimeSnapshot({
      devices,
      sessions,
      events,
      snapshotPath,
      generatedAt
    });
    lastSnapshot = writeSnapshot(snapshotPath, snapshot);
    return lastSnapshot;
  }

  function pruneSessions() {
    if (sessions.size <= SESSION_RETENTION_LIMIT) return;
    const sorted = Array.from(sessions.values()).sort((a, b) => {
      return new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
    });
    for (const session of sorted.slice(0, sessions.size - SESSION_RETENTION_LIMIT)) {
      sessions.delete(session.session_id);
    }
  }

  function upsertDevice({ deviceId, profile, clientVersion, capabilities, capabilityStatus, network, sdkBindingStatus, timestamp }) {
    const previous = devices.get(deviceId);
    const device = {
      device_id: deviceId,
      profile,
      client_version: clientVersion,
      capabilities,
      capability_status: capabilityStatus,
      first_seen_at: previous?.first_seen_at || timestamp.toISOString(),
      last_seen_at: timestamp.toISOString(),
      session_count: (previous?.session_count || 0) + 1,
      heartbeat_count: previous?.heartbeat_count || 0,
      last_health_severity: previous?.last_health_severity || (capabilityStatus.ok ? "ok" : "warn"),
      last_active_anchor: previous?.last_active_anchor || null,
      last_battery: previous?.last_battery || null,
      sdk_binding_status: sdkBindingStatus || previous?.sdk_binding_status || buildDefaultSdkBindingStatus("not_reported"),
      network
    };
    devices.set(deviceId, device);
    return device;
  }

  function rememberPersistentSession(session) {
    if (!session?.session_id || !session?.device_id) return null;
    session.sdk_binding_status = sanitizeSdkBindingStatus(session.sdk_binding_status, "restored_session");
    session.network = sanitizeNetwork(session.network);
    sessions.set(session.session_id, session);
    if (!devices.has(session.device_id)) {
      devices.set(session.device_id, {
        device_id: session.device_id,
        profile: session.profile,
        client_version: session.client_version,
        capabilities: Array.isArray(session.capabilities) ? session.capabilities : [],
        capability_status: session.capability_status || { ok: false, missing_required: [] },
        first_seen_at: session.created_at,
        last_seen_at: session.last_seen_at,
        session_count: 1,
        heartbeat_count: Number(session.heartbeat_count || 0),
        last_health_severity: session.last_health_severity || "unknown",
        last_active_anchor: session.last_active_anchor || null,
        last_battery: session.last_battery || null,
        sdk_binding_status: session.sdk_binding_status || buildDefaultSdkBindingStatus("not_reported"),
        network: session.network || null
      });
    }
    return session;
  }

  function hydratePersistentSessions(limit = SESSION_RETENTION_LIMIT) {
    if (typeof sessionStore?.listDeviceSessions !== "function") return;
    for (const session of sessionStore.listDeviceSessions({ limit })) {
      if (!sessions.has(session.session_id)) rememberPersistentSession(session);
    }
  }

  function resolveHardwareObservationProof({ sessionId, deviceId, anchorId, trackingMode, referenceTime = new Date() } = {}) {
    hydratePersistentSessions();
    const cleanSessionId = trimText(sessionId, 64);
    const cleanDeviceId = sanitizeDeviceId(deviceId, { allowFallback: false });
    const cleanAnchorId = sanitizeEnumText(anchorId, 32);
    const cleanTrackingMode = sanitizeEnumText(trackingMode, 32) || "unknown";
    const issues = [];

    if (!HARDWARE_OBSERVATION_TRACKING_MODES.has(cleanTrackingMode)) {
      issues.push("tracking_mode_not_hardware");
    }
    if (!cleanSessionId) issues.push("session_id_missing");
    if (!cleanDeviceId) issues.push("device_id_missing");

    const session = cleanSessionId
      ? sessions.get(cleanSessionId) || rememberPersistentSession(sessionStore?.loadDeviceSession?.(cleanSessionId))
      : null;
    if (!session) {
      issues.push("device_session_not_found");
    }

    const sdkBindingStatus = session?.sdk_binding_status || buildDefaultSdkBindingStatus("not_reported");
    const sessionStatus = session ? getDeviceSessionStatus(session, referenceTime) : "missing";
    if (session && cleanDeviceId && session.device_id !== cleanDeviceId) issues.push("device_id_mismatch");
    if (session && sessionStatus !== "online") issues.push("device_session_not_online");
    if (session && Number(session.heartbeat_count || 0) <= 0) issues.push("device_heartbeat_missing");
    if (session && session.last_health_severity !== "ok") issues.push("device_health_not_ok");
    if (session && !session.last_pose_present) issues.push("device_pose_not_reported");
    if (session && cleanAnchorId && session.last_active_anchor && session.last_active_anchor !== cleanAnchorId) {
      issues.push("active_anchor_mismatch");
    }
    if (sdkBindingStatus.boundary_compiled !== true) issues.push("sdk_boundary_not_compiled");
    if (sdkBindingStatus.package_detected !== true) issues.push("sdk_package_not_detected");
    if (sdkBindingStatus.input_binding_ready !== true) issues.push("sdk_input_binding_not_ready");
    if (sdkBindingStatus.overlay_binding_ready !== true) issues.push("sdk_overlay_binding_not_ready");
    if (sdkBindingStatus.live_binding_ready !== true) issues.push("sdk_live_binding_not_ready");

    const trusted = issues.length === 0;
    return {
      schema: "innerworld-hardware-observation-proof/v1",
      trusted,
      trust_status: trusted ? "trusted" : "untrusted",
      issues,
      session_id: session?.session_id || sanitizeProofId(cleanSessionId),
      device_id: session?.device_id || sanitizeProofId(cleanDeviceId, DEVICE_ID_MAX_LENGTH),
      anchor_id: cleanAnchorId || null,
      tracking_mode: cleanTrackingMode,
      session_status_at_observation: sessionStatus,
      session_last_seen_at: session?.last_seen_at || null,
      heartbeat_count_at_observation: Number(session?.heartbeat_count || 0),
      active_anchor_at_observation: session?.last_active_anchor || null,
      sdk_binding_stage: sdkBindingStatus.stage || "unknown",
      sdk_live_binding_ready: sdkBindingStatus.live_binding_ready === true,
      sdk_input_binding_ready: sdkBindingStatus.input_binding_ready === true,
      sdk_overlay_binding_ready: sdkBindingStatus.overlay_binding_ready === true,
      sdk_package_detected: sdkBindingStatus.package_detected === true,
      sdk_boundary_compiled: sdkBindingStatus.boundary_compiled === true
    };
  }

  function register({ body = {}, baseUrl, space, state, aiSchema, createdAt = new Date() }) {
    const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
    const endpoints = buildEndpointMap(publicBaseUrl, space?.space_id);
    const profile = sanitizeProfile(body.profile);
    const deviceId = sanitizeDeviceId(body.device_id);
    const capabilities = normalizeCapabilities(body.capabilities);
    const capabilityStatus = buildRequiredCapabilityStatus(capabilities);
    const network = sanitizeNetwork(body.network);
    const clientVersion = sanitizeClientVersion(body.client_version);
    const sdkBindingStatus = sanitizeSdkBindingStatus(body.sdk_binding_status || body.adapter_binding || body.binding_status);
    const sessionId = generateSessionId(createdAt);
    const warnings = buildWarnings({ capabilities, network, profile, sdkBindingStatus });
    const missionSnapshot = buildMissionSnapshot(space, state);
    const session = {
      session_id: sessionId,
      device_id: deviceId,
      profile,
      client_version: clientVersion,
      capabilities,
      capability_status: capabilityStatus,
      network,
      created_at: createdAt.toISOString(),
      last_seen_at: createdAt.toISOString(),
      heartbeat_count: 0,
      last_health_severity: capabilityStatus.ok ? "ok" : "warn",
      last_active_anchor: null,
      last_battery: null,
      last_pose_present: false,
      sdk_binding_status: sdkBindingStatus,
      current_user: null
    };

    sessions.set(sessionId, session);
    upsertDevice({
      deviceId,
      profile,
      clientVersion,
      capabilities,
      capabilityStatus,
      network,
      sdkBindingStatus,
      timestamp: createdAt
    });
    const event = addRuntimeEvent(events, {
      at: createdAt,
      type: "device_registered",
      session_id: sessionId,
      device_id: deviceId,
      severity: capabilityStatus.ok ? "info" : "warn",
      summary: `${profile} registered with ${capabilities.length} capabilities.`,
      details: {
        missing_required_capabilities: capabilityStatus.missing_required,
        network_online: network?.online ?? null,
        lan_reachable: network?.lan_reachable ?? null,
        sdk_binding: summarizeSdkBindingStatus(sdkBindingStatus)
      }
    });
    pruneSessions();
    sessionStore?.saveDeviceSession?.(session);
    sessionStore?.appendDeviceEvent?.({
      session_id: sessionId,
      device_id: deviceId,
      event_type: event.type,
      event
    });
    const snapshot = persist(createdAt);

    return {
      ok: true,
      protocol_version: DEVICE_RUNTIME_SESSION_PROTOCOL,
      session_id: sessionId,
      device_id: deviceId,
      profile,
      server_time: createdAt.toISOString(),
      poll_intervals: buildPollIntervals(capabilityStatus),
      endpoints: endpointSubset(endpoints),
      capabilities: capabilityStatus,
      sdk_binding_status: sdkBindingStatus,
      mission_snapshot: missionSnapshot,
      warnings,
      runtime: {
        session_status: getDeviceSessionStatus(session, createdAt),
        expires_at: sessionExpiresAt(session),
        snapshot
      },
      privacy: {
        stored: "sanitized device_id, declared capabilities, coarse network flags, battery summary, and heartbeat timestamps",
        omitted: ["serial_number", "tokens", "phone", "network addresses", "ssid", "mac"]
      }
    };
  }

  function heartbeat({ body = {}, baseUrl, space, state, receivedAt = new Date() }) {
    const sessionId = trimText(body.session_id, 64);
    const session = sessions.get(sessionId) || rememberPersistentSession(sessionStore?.loadDeviceSession?.(sessionId));
    if (!session) {
      return {
        ok: false,
        error: "device_session_not_found",
        status: 404
      };
    }

    const deviceId = sanitizeDeviceId(body.device_id || session.device_id);
    if (deviceId !== session.device_id) {
      return {
        ok: false,
        error: "device_id_mismatch",
        status: 409
      };
    }

    const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
    const endpoints = buildEndpointMap(publicBaseUrl, space?.space_id);
    const battery = sanitizeBattery(body.battery);
    const network = sanitizeNetwork(body.network);
    const pose = sanitizePose(body.pose);
    const activeAnchor = sanitizeEnumText(body.active_anchor, 32);
    const sdkBindingStatus = body.sdk_binding_status || body.adapter_binding || body.binding_status
      ? sanitizeSdkBindingStatus(body.sdk_binding_status || body.adapter_binding || body.binding_status)
      : session.sdk_binding_status || buildDefaultSdkBindingStatus("not_reported");
    const activeAnchorKnown = !activeAnchor || anchors(space).some((anchor) => anchor.anchor_id === activeAnchor);
    const missionSnapshot = buildMissionSnapshot(space, state, activeAnchor);
    const capabilityStatus = session.capability_status;
    const healthSeverity = deriveHealthSeverity({ capabilityStatus, network, battery, activeAnchorKnown });
    const pendingActions = buildPendingActions({
      capabilityStatus,
      network,
      battery,
      activeAnchorKnown,
      missionSnapshot,
      sdkBindingStatus
    });

    session.last_seen_at = receivedAt.toISOString();
    session.heartbeat_count += 1;
    session.network = network;
    session.last_battery = battery;
    session.last_active_anchor = activeAnchor;
    session.last_pose_present = Boolean(pose);
    session.last_health_severity = healthSeverity;
    session.sdk_binding_status = sdkBindingStatus;
    session.current_user = sanitizeEnumText(body.current_user, 32);
    const device = devices.get(session.device_id);
    if (device) {
      device.last_seen_at = receivedAt.toISOString();
      device.heartbeat_count = (device.heartbeat_count || 0) + 1;
      device.last_health_severity = healthSeverity;
      device.last_active_anchor = activeAnchor;
      device.last_battery = battery;
      device.sdk_binding_status = sdkBindingStatus;
      device.network = network;
    }
    const event = addRuntimeEvent(events, {
      at: receivedAt,
      type: "device_heartbeat",
      session_id: sessionId,
      device_id: session.device_id,
      severity: healthSeverity === "critical" || healthSeverity === "error" ? "warn" : "info",
      summary: `Heartbeat ${session.heartbeat_count} received with ${healthSeverity} health.`,
      details: {
        active_anchor: activeAnchor,
        active_anchor_known: activeAnchorKnown,
        battery_level_percent: battery?.level_percent ?? null,
        network_online: network?.online ?? null,
        pose_present: Boolean(pose),
        sdk_binding: summarizeSdkBindingStatus(sdkBindingStatus)
      }
    });
    sessionStore?.saveDeviceSession?.(session);
    sessionStore?.appendDeviceEvent?.({
      session_id: sessionId,
      device_id: session.device_id,
      event_type: event.type,
      event
    });
    const snapshot = persist(receivedAt);

    return {
      ok: true,
      protocol_version: DEVICE_RUNTIME_SESSION_PROTOCOL,
      session_id: sessionId,
      device_id: session.device_id,
      server_time: receivedAt.toISOString(),
      mission_snapshot: missionSnapshot,
      pending_actions: pendingActions,
      health: {
        severity: healthSeverity,
        battery,
        network,
        pose_status: pose ? "received" : "not_reported",
        active_anchor_known: activeAnchorKnown,
        missing_required_capabilities: capabilityStatus.missing_required,
        sdk_binding_status: sdkBindingStatus
      },
      sdk_binding_status: sdkBindingStatus,
      runtime: {
        session_status: getDeviceSessionStatus(session, receivedAt),
        expires_at: sessionExpiresAt(session),
        snapshot
      },
      endpoints: endpointSubset(endpoints),
      next_poll_ms: healthSeverity === "critical" ? 500 : healthSeverity === "ok" ? 1200 : 800
    };
  }

  function sessionsSummary({ limit = 25, referenceTime = new Date() } = {}) {
    hydratePersistentSessions(limit);
    const rows = Array.from(sessions.values())
      .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
      .slice(0, limit)
      .map((session) => ({
        session_id: session.session_id,
        device_id: session.device_id,
        profile: session.profile,
        client_version: session.client_version,
        created_at: session.created_at,
        last_seen_at: session.last_seen_at,
        expires_at: sessionExpiresAt(session),
        age_ms: ageMs(session.last_seen_at, referenceTime),
        session_status: getDeviceSessionStatus(session, referenceTime),
        heartbeat_count: session.heartbeat_count,
        health_severity: session.last_health_severity,
        missing_required_capabilities: session.capability_status.missing_required,
        active_anchor: session.last_active_anchor,
        battery_level_percent: session.last_battery?.level_percent ?? null,
        network: {
          online: session.network?.online ?? null,
          transport: session.network?.transport || session.network?.type || null,
          rtt_ms: session.network?.rtt_ms ?? null,
          lan_reachable: session.network?.lan_reachable ?? null
        },
        sdk_binding_status: session.sdk_binding_status || buildDefaultSdkBindingStatus("not_reported"),
        pose_present: Boolean(session.last_pose_present)
      }));
    const deviceRows = Array.from(devices.values())
      .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
      .map((device) => ({
        device_id: device.device_id,
        profile: device.profile,
        client_version: device.client_version,
        first_seen_at: device.first_seen_at,
        last_seen_at: device.last_seen_at,
        session_count: device.session_count,
        heartbeat_count: device.heartbeat_count,
        health_severity: device.last_health_severity,
        missing_required_capabilities: device.capability_status?.missing_required || [],
        active_anchor: device.last_active_anchor,
        battery_level_percent: device.last_battery?.level_percent ?? null,
        sdk_binding_status: device.sdk_binding_status || buildDefaultSdkBindingStatus("not_reported")
      }));
    const summary = buildDeviceRuntimeSmokeSummary({
      devices,
      sessions,
      events,
      snapshot: lastSnapshot,
      generatedAt: referenceTime
    });

    return {
      ok: true,
      protocol_version: DEVICE_RUNTIME_SESSION_PROTOCOL,
      storage: {
        engine: sessionStore ? "sqlite" : "memory",
        authoritative: Boolean(sessionStore),
        snapshot_backup: Boolean(lastSnapshot)
      },
      total: sessions.size,
      devices: deviceRows,
      sessions: rows,
      events: events.slice(-20),
      sdk_binding: summarizeSdkBindingAcrossSessions(rows),
      smoke_test_summary: summary,
      retention: {
        stale_after_ms: SESSION_STALE_AFTER_MS,
        expires_after_ms: SESSION_EXPIRES_AFTER_MS,
        session_limit: SESSION_RETENTION_LIMIT,
        event_limit: EVENT_RETENTION_LIMIT
      },
      privacy: "Device runtime summaries and snapshots omit serials, tokens, phone numbers, addresses, SSID, MAC, and raw pose."
    };
  }

  return {
    register,
    heartbeat,
    sessionsSummary,
    resolveHardwareObservationProof,
    smokeSummary(options = {}) {
      return buildDeviceRuntimeSmokeSummary({
        devices,
        sessions,
        events,
        snapshot: lastSnapshot,
        generatedAt: options.referenceTime || new Date()
      });
    },
    snapshot(generatedAt = new Date()) {
      return persist(generatedAt);
    }
  };
}

export function buildDeviceManifest({
  baseUrl,
  space,
  state,
  aiSchema,
  generatedAt = new Date().toISOString()
}) {
  const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
  const endpoints = buildEndpointMap(publicBaseUrl, space?.space_id);
  const displayMaxLength = aiSchema?.properties?.display_text?.maxLength || 54;

  return {
    ok: true,
    schema: DEVICE_RUNTIME_MANIFEST_SCHEMA,
    generated_at: generatedAt,
    service: INNERWORLD_SERVICE_NAME,
    base_url: publicBaseUrl,
    expected_kit: {
      name: "Rokid field demo kit",
      devices: [
        {
          product_name: "Rokid Max Pro",
          model: "RA202",
          role: "glasses_display_pose_input",
          quantity: 1
        },
        {
          product_name: "Rokid Station Pro",
          model: "RAS201",
          role: "android_compute_network_bridge",
          quantity: 1
        }
      ]
    },
    profiles: [
      DEFAULT_DEVICE_PROFILE,
      "rokid-unity",
      "RA202",
      "RAS201"
    ],
    required_capabilities: REQUIRED_CAPABILITIES,
    optional_capabilities: OPTIONAL_CAPABILITIES,
    network_requirements: {
      protocols: ["HTTP/1.1 JSON"],
      cors: "Access-Control-Allow-Origin: * for localhost field verification",
      cache_policy: "Cache-Control: no-store",
      default_host: "127.0.0.1",
      lan_mode: "Use HOST=0.0.0.0 and the Windows host IP only during field device testing.",
      cleartext_http: "Required for the local dev profile unless an HTTPS reverse proxy is supplied.",
      private_data_policy: "Do not send or store SSID, MAC, IP address, phone, serial number, or real access tokens."
    },
    runtime_persistence: {
      authoritative_store: "SQLite data/innerworld.sqlite",
      dataset_api: {
        catalog: endpoints.dataset_catalog.path,
        call: endpoints.dataset_call.path,
        store_status: endpoints.store_status.path
      },
      snapshot_schema: DEVICE_RUNTIME_SNAPSHOT_SCHEMA,
      snapshot_path: publicSnapshotPath(DEFAULT_SNAPSHOT_PATH),
      restore: "SQLite is authoritative; sanitized JSON snapshot remains a bounded field-debug backup.",
      event_retention_limit: EVENT_RETENTION_LIMIT,
      session_retention_limit: SESSION_RETENTION_LIMIT,
      stale_after_ms: SESSION_STALE_AFTER_MS,
      expires_after_ms: SESSION_EXPIRES_AFTER_MS,
      private_data_policy: "SQLite store and snapshot omit serials, tokens, phone numbers, network addresses, SSID, MAC, and raw pose."
    },
    unity_runtime_hints: {
      scene_contract: "Unity may replace input/display/pose implementations while keeping the same Space API contract.",
      bootstrap_first: endpoints.device_bootstrap.path,
      register_before_polling: endpoints.device_register.path,
      heartbeat_during_session: endpoints.device_heartbeat.path,
      hud_schema_endpoint: endpoints.ai_schema.path,
      display_text_max_length: displayMaxLength,
      suggested_components: [
        "SpaceApiClient",
        "IRokidInputSource",
        "IRokidPoseProvider",
        "IRokidOverlayRenderer"
      ]
    },
    rokid_runtime_hints: {
      ra202: {
        mount_role: "primary glasses display, pose, gaze/touch input",
        expected_loop: ["manifest", "register", "bootstrap", "heartbeat", "ai_hud", "interaction_or_writeback"]
      },
      ras201: {
        mount_role: "Android station runtime, networking, Unity host, controller bridge",
        expected_loop: ["manifest", "register", "heartbeat", "state_poll", "service_action"]
      }
    },
    adapter_slots: ADAPTER_SLOTS,
    sdk_binding_status: {
      ...buildDefaultSdkBindingStatus("server_manifest"),
      client_report_contract: {
        field: "sdk_binding_status",
        accepted_on: [endpoints.device_register.path, endpoints.device_heartbeat.path],
        stages: SDK_BINDING_STAGES,
        live_binding_rule: "live_binding_ready is true only when Unity reports both input_binding_ready and overlay_binding_ready after the official Rokid UXR package is installed.",
        privacy: "Report only define/package/type readiness; do not send serials, tokens, IP addresses, SSID, MAC, phone, address, or raw camera/pose streams."
      }
    },
    endpoints,
    mission_snapshot: buildMissionSnapshot(space, state),
    polling_defaults: {
      heartbeat_ms: 1200,
      state_ms: 1000,
      action_ms: 600,
      request_timeout_ms: 5000
    }
  };
}
