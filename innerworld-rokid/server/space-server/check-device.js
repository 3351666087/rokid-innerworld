import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeviceRuntimeStore } from "./src/domain/device-runtime.js";

const base = process.env.BASE_URL || "http://localhost:5177";
const expectedSpaceId = "innerworld_campus_wall";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

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

async function fetchJson(url, label) {
  const res = await fetch(url);
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed`);
  return body;
}

async function postJson(url, label, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed`);
  return body;
}

function assertEndpoint(endpoint, label, method = "GET") {
  assert(endpoint, `${label} endpoint missing`);
  assert(endpoint.method === method, `${label} method check failed`);
  assert(typeof endpoint.path === "string" && endpoint.path.startsWith("/api/"), `${label} path check failed`);
  assert(typeof endpoint.url === "string" && endpoint.url.startsWith("http"), `${label} url check failed`);
}

function assertLocalRuntimeSnapshot({ space, aiSchema, requiredCapabilities }) {
  const snapshotPath = path.join(root, "output", "runtime", "check-device-runtime-snapshot.json");
  const runtime = createDeviceRuntimeStore({
    snapshotPath,
    persistSnapshot: true,
    restoreSnapshot: false
  });
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons || [],
    events: []
  };
  const register = runtime.register({
    body: {
      profile: "rokid-ar",
      device_id: "RA202 local snapshot kit",
      client_version: "unity-runtime-0.1.0",
      serial_number: "SN-LOCAL-SNAPSHOT-SECRET",
      access_token: "local-snapshot-token",
      capabilities: requiredCapabilities,
      network: {
        online: true,
        transport: "wifi",
        rtt_ms: 18,
        lan_reachable: true,
        http_cleartext_allowed: true,
        ip_address: "10.0.0.31",
        ssid: "private-local-wifi",
        mac: "00:00:00:00:00:31"
      }
    },
    baseUrl: base,
    space,
    state,
    aiSchema,
    createdAt: new Date("2026-07-02T10:00:00.000Z")
  });
  const heartbeat = runtime.heartbeat({
    body: {
      session_id: register.session_id,
      device_id: register.device_id,
      battery: { level_percent: 44, charging: false },
      network: { online: true, transport: "wifi", rtt_ms: 21, lan_reachable: true, http_cleartext_allowed: true },
      active_anchor: "A1"
    },
    baseUrl: base,
    space,
    state,
    receivedAt: new Date("2026-07-02T10:00:01.000Z")
  });
  assert(heartbeat.ok === true, "local runtime heartbeat failed");
  assert(fs.existsSync(snapshotPath), "local runtime snapshot missing");
  const snapshotText = fs.readFileSync(snapshotPath, "utf8");
  assert(snapshotText.includes("innerworld-device-runtime-snapshot/v1"), "local runtime snapshot schema missing");
  assert(!snapshotText.includes("SN-LOCAL-SNAPSHOT-SECRET"), "local runtime snapshot leaked serial");
  assert(!snapshotText.includes("local-snapshot-token"), "local runtime snapshot leaked token");
  assert(!snapshotText.includes("10.0.0.31"), "local runtime snapshot leaked IP");
  assert(!snapshotText.includes("private-local-wifi"), "local runtime snapshot leaked SSID");

  const restored = createDeviceRuntimeStore({
    snapshotPath,
    persistSnapshot: false,
    restoreSnapshot: true
  });
  const restoredSessions = restored.sessionsSummary({
    referenceTime: new Date("2026-07-02T10:01:02.000Z")
  });
  assert(restoredSessions.total === 1, "restored runtime session count failed");
  assert(restoredSessions.sessions[0].session_status === "expired", "restored runtime expiry check failed");
  assert(restoredSessions.smoke_test_summary.sessions_expired === 1, "restored runtime smoke summary expiry failed");
  assert(restoredSessions.smoke_test_summary.snapshot?.restored === true, "restored runtime smoke snapshot marker failed");
}

async function main() {
  const bootstrapUrl = `${base}/api/device/bootstrap?profile=rokid-ar`;
  const bootstrap = await fetchJson(bootstrapUrl, "device bootstrap");

  assert(bootstrap.ok === true, "bootstrap ok check failed");
  assert(bootstrap.protocol_version === "innerworld-device-bootstrap/v1", "bootstrap protocol check failed");
  assert(bootstrap.profile === "rokid-ar", "bootstrap profile check failed");
  assert(bootstrap.space?.space_id === expectedSpaceId, "bootstrap space check failed");
  assert(Array.isArray(bootstrap.anchors) && bootstrap.anchors.length === 3, "bootstrap anchors check failed");
  assert(Array.isArray(bootstrap.mission?.steps) && bootstrap.mission.steps.length === 4, "bootstrap mission steps check failed");
  assert(bootstrap.ai?.display_text_max_length === 54, "bootstrap AI display max length check failed");
  assert(bootstrap.unity_compat?.config?.space_id === expectedSpaceId, "bootstrap Unity config check failed");
  assert(bootstrap.client_hints?.poll_interval_ms > 0, "bootstrap polling hint check failed");

  const endpoints = bootstrap.endpoints || {};
  assertEndpoint(endpoints.health, "health");
  assertEndpoint(endpoints.ops_status, "ops_status");
  assertEndpoint(endpoints.store_status, "store_status");
  assertEndpoint(endpoints.dataset_catalog, "dataset_catalog");
  assertEndpoint(endpoints.dataset_call, "dataset_call", "POST");
  assertEndpoint(endpoints.evidence_chain, "evidence_chain");
  assertEndpoint(endpoints.session_plan, "session_plan");
  assertEndpoint(endpoints.device_bootstrap, "device_bootstrap");
  assertEndpoint(endpoints.device_manifest, "device_manifest");
  assertEndpoint(endpoints.device_register, "device_register", "POST");
  assertEndpoint(endpoints.device_heartbeat, "device_heartbeat", "POST");
  assertEndpoint(endpoints.device_sessions, "device_sessions");
  assertEndpoint(endpoints.ai_schema, "ai_schema");
  assertEndpoint(endpoints.ai_prompt, "ai_prompt");
  assertEndpoint(endpoints.ai_hud, "ai_hud", "POST");
  assertEndpoint(endpoints.space, "space");
  assertEndpoint(endpoints.state, "state");
  assertEndpoint(endpoints.nearby_pins, "nearby_pins");
  assertEndpoint(endpoints.interactions, "interactions", "POST");
  assertEndpoint(endpoints.service_actions, "service_actions", "POST");
  assertEndpoint(endpoints.write_back, "write_back", "POST");
  assertEndpoint(endpoints.reset, "reset", "POST");
  assert(Object.keys(endpoints).length >= 22, "endpoint count check failed");

  const [health, space, aiSchema, aiPrompt, evidenceChain, sessionPlan, deviceManifest, storeStatus, datasetCatalog] = await Promise.all([
    fetchJson(endpoints.health.url, "health"),
    fetchJson(endpoints.space.url, "space"),
    fetchJson(endpoints.ai_schema.url, "ai_schema"),
    fetchJson(endpoints.ai_prompt.url, "ai_prompt"),
    fetchJson(endpoints.evidence_chain.url, "evidence_chain"),
    fetchJson(endpoints.session_plan.url, "session_plan"),
    fetchJson(endpoints.device_manifest.url, "device_manifest"),
    fetchJson(endpoints.store_status.url, "store_status"),
    fetchJson(endpoints.dataset_catalog.url, "dataset_catalog")
  ]);

  assert(health.ok === true, "health ok check failed");
  assert(health.space_id === expectedSpaceId, "health space id check failed");
  assert(space.space_id === expectedSpaceId, "space payload check failed");
  assert(aiSchema.title === "InnerWorld HUD AI Output", "AI schema title check failed");
  assert(aiSchema.properties?.display_text?.maxLength === 54, "AI schema display_text check failed");
  assert(aiPrompt.ok === true, "AI prompt ok check failed");
  assert(typeof aiPrompt.prompt === "string" && aiPrompt.prompt.includes("Rokid"), "AI prompt content check failed");
  assert(evidenceChain.ok === true, "evidence chain ok check failed");
  assert(evidenceChain.schema === "innerworld-evidence-chain/v1", "evidence chain schema check failed");
  assert(evidenceChain.space?.space_id === expectedSpaceId, "evidence chain space check failed");
  assert(Array.isArray(evidenceChain.anchors) && evidenceChain.anchors.length === 3, "evidence chain anchors check failed");
  assert(evidenceChain.beacons?.total >= 2, "evidence chain beacon count check failed");
  assert(evidenceChain.writeback?.ready === true, "evidence chain writeback readiness check failed");
  assert(evidenceChain.ai?.schema_endpoint?.path === "/api/ai/schema", "evidence chain AI schema endpoint check failed");
  assert(evidenceChain.hardware?.devices?.length >= 1, "evidence chain hardware summary check failed");
  assert(Array.isArray(evidenceChain.evidence_items) && evidenceChain.evidence_items.length >= 6, "evidence chain items check failed");
  assert(evidenceChain.evidence_items.some((item) => item.id === "release_chain"), "evidence chain release item check failed");
  assert(sessionPlan.ok === true, "session plan ok check failed");
  assert(sessionPlan.schema === "innerworld-session-plan/v1", "session plan schema check failed");
  assert(Array.isArray(sessionPlan.stages) && sessionPlan.stages.length === 5, "session plan stages check failed");
  assert(sessionPlan.stages.map((stage) => stage.stage_id).join(",") === "opening,read,service,writeback,handoff", "session plan stage order check failed");
  assert(Array.isArray(sessionPlan.operator_prompts) && sessionPlan.operator_prompts.length >= 5, "session plan operator prompts check failed");
  assert(Array.isArray(sessionPlan.device_handoff_notes) && sessionPlan.device_handoff_notes.length >= 5, "session plan device notes check failed");
  assert(Array.isArray(sessionPlan.acceptance_checks) && sessionPlan.acceptance_checks.some((check) => check.id === "user_b_visibility"), "session plan acceptance checks failed");
  assert(Array.isArray(sessionPlan.fallback_actions) && sessionPlan.fallback_actions.length >= 4, "session plan fallback actions failed");
  assert(deviceManifest.ok === true, "device manifest ok check failed");
  assert(deviceManifest.schema === "innerworld-device-runtime-manifest/v1", "device manifest schema check failed");
  assert(deviceManifest.expected_kit?.devices?.some((device) => device.model === "RA202"), "device manifest RA202 check failed");
  assert(deviceManifest.expected_kit?.devices?.some((device) => device.model === "RAS201"), "device manifest RAS201 check failed");
  assert(Array.isArray(deviceManifest.required_capabilities) && deviceManifest.required_capabilities.length >= 5, "device manifest required capabilities failed");
  assert(deviceManifest.network_requirements?.cache_policy === "Cache-Control: no-store", "device manifest network cache policy failed");
  assert(deviceManifest.runtime_persistence?.authoritative_store === "SQLite data/innerworld.sqlite", "device manifest SQLite store failed");
  assert(deviceManifest.runtime_persistence?.dataset_api?.catalog === "/api/datasets/catalog", "device manifest dataset catalog failed");
  assert(deviceManifest.runtime_persistence?.snapshot_schema === "innerworld-device-runtime-snapshot/v1", "device manifest runtime snapshot schema failed");
  assert(deviceManifest.runtime_persistence?.expires_after_ms > deviceManifest.runtime_persistence?.stale_after_ms, "device manifest runtime expiry policy failed");
  assert(Array.isArray(deviceManifest.adapter_slots) && deviceManifest.adapter_slots.length >= 4, "device manifest adapter slots failed");
  assert(deviceManifest.endpoints?.device_register?.method === "POST", "device manifest register endpoint failed");
  assert(deviceManifest.endpoints?.device_heartbeat?.method === "POST", "device manifest heartbeat endpoint failed");
  assert(storeStatus.ok === true, "store status ok failed");
  assert(storeStatus.engine === "sqlite", "store status engine failed");
  assert(storeStatus.safe_storage?.raw_sql_api === false, "store raw SQL guard failed");
  assert(datasetCatalog.ok === true, "dataset catalog ok failed");
  assert(datasetCatalog.datasets?.some((dataset) => dataset.dataset_id === "space.contract"), "dataset catalog space contract failed");
  assert(datasetCatalog.datasets?.some((dataset) => dataset.dataset_id === "hardware.applied_kit"), "dataset catalog hardware failed");

  const datasetCall = await postJson(endpoints.dataset_call.url, "dataset_call", {
    dataset_id: "space.contract",
    operation: "get_record",
    record_id: "space"
  });
  assert(datasetCall.ok === true, "dataset call ok failed");
  assert(datasetCall.record?.value?.space_id === expectedSpaceId, "dataset call space record failed");

  const requiredCapabilities = deviceManifest.required_capabilities.map((capability) => capability.id);
  const register = await postJson(endpoints.device_register.url, "device_register", {
    profile: "rokid-ar",
    device_id: "RA202 dev kit #1",
    client_version: "unity-runtime-0.1.0",
    serial_number: "SN-ABC-SECRET",
    access_token: "real-token-secret",
    capabilities: requiredCapabilities,
    network: {
      online: true,
      transport: "wifi",
      rtt_ms: 24,
      lan_reachable: true,
      http_cleartext_allowed: true,
      ip_address: "10.0.0.18",
      ssid: "private-demo-wifi",
      mac: "00:11:22:33:44:55"
    }
  });
  assert(register.ok === true, "device register ok check failed");
  assert(typeof register.session_id === "string" && register.session_id.startsWith("iw-"), "device register session check failed");
  assert(register.device_id === "RA202-dev-kit-1", "device register device id sanitize failed");
  assert(register.capabilities?.ok === true, "device register capabilities check failed");
  assert(Array.isArray(register.capabilities?.missing_required) && register.capabilities.missing_required.length === 0, "device register missing capabilities failed");
  assert(register.endpoints?.heartbeat?.path === "/api/device/heartbeat", "device register heartbeat endpoint failed");
  assert(register.mission_snapshot?.space_id === expectedSpaceId, "device register mission snapshot failed");
  assert(register.runtime?.session_status === "online", "device register runtime session status failed");
  assert(register.runtime?.snapshot?.ok === true, "device register runtime snapshot failed");
  const registerText = JSON.stringify(register);
  assert(!registerText.includes("SN-ABC-SECRET"), "device register leaked serial");
  assert(!registerText.includes("real-token-secret"), "device register leaked token");
  assert(!registerText.includes("10.0.0.18"), "device register leaked IP");
  assert(!registerText.includes("private-demo-wifi"), "device register leaked SSID");

  const heartbeat = await postJson(endpoints.device_heartbeat.url, "device_heartbeat", {
    session_id: register.session_id,
    device_id: register.device_id,
    battery: {
      level_percent: 76,
      charging: false,
      temperature_c: 32
    },
    network: {
      online: true,
      transport: "wifi",
      rtt_ms: 32,
      lan_reachable: true,
      http_cleartext_allowed: true,
      ip_address: "10.0.0.18"
    },
    pose: {
      confidence: 0.91,
      position: { x: 0, y: 1.5, z: 3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    },
    active_anchor: "A2",
    current_user: "A"
  });
  assert(heartbeat.ok === true, "device heartbeat ok check failed");
  assert(heartbeat.session_id === register.session_id, "device heartbeat session mismatch");
  assert(heartbeat.mission_snapshot?.space_id === expectedSpaceId, "device heartbeat mission snapshot failed");
  assert(heartbeat.mission_snapshot?.active_anchor?.anchor_id === "A2", "device heartbeat active anchor failed");
  assert(Array.isArray(heartbeat.pending_actions), "device heartbeat pending actions failed");
  assert(heartbeat.pending_actions.some((action) => action.action_id === "render_next_mission_step"), "device heartbeat mission action failed");
  assert(heartbeat.health?.severity === "ok", "device heartbeat health severity failed");
  assert(heartbeat.runtime?.session_status === "online", "device heartbeat runtime session status failed");
  assert(heartbeat.runtime?.snapshot?.ok === true, "device heartbeat runtime snapshot failed");
  assert(heartbeat.next_poll_ms > 0, "device heartbeat next poll failed");
  assert(!JSON.stringify(heartbeat).includes("10.0.0.18"), "device heartbeat leaked IP");

  const sessions = await fetchJson(endpoints.device_sessions.url, "device_sessions");
  assert(sessions.ok === true, "device sessions ok check failed");
  assert(sessions.total >= 1, "device sessions total check failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.heartbeat_count === 1), "device sessions summary failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.session_status === "online"), "device sessions online status failed");
  assert(sessions.devices?.some((device) => device.device_id === register.device_id), "device sessions device registry failed");
  assert(sessions.events?.some((event) => event.type === "device_heartbeat"), "device sessions event log failed");
  assert(sessions.smoke_test_summary?.checks?.has_live_session === true, "device sessions smoke summary failed");
  assert(sessions.smoke_test_summary?.snapshot?.ok === true, "device sessions smoke snapshot failed");
  assert(!JSON.stringify(sessions).includes("10.0.0.18"), "device sessions leaked IP");

  assertLocalRuntimeSnapshot({ space, aiSchema, requiredCapabilities });

  const hud = await postJson(endpoints.ai_hud.url, "ai_hud", {
    anchor_id: "A2",
    user_action: "gaze"
  });
  assert(typeof hud.display_text === "string" && hud.display_text.length > 0, "AI HUD display text check failed");
  assert(hud.display_text.length <= aiSchema.properties.display_text.maxLength, "AI HUD max length check failed");
  assert(["none", "weak", "strong", "answer"].includes(hud.hint_level), "AI HUD hint level check failed");
  assert(hud.write_back_review?.tag === "time_capsule", "AI HUD write-back tag check failed");

  console.log(JSON.stringify({
    ok: true,
    base,
    protocol_version: bootstrap.protocol_version,
    profile: bootstrap.profile,
    space_id: bootstrap.space.space_id,
    anchors: bootstrap.anchors.length,
    mission_steps: bootstrap.mission.steps.length,
    endpoints: Object.keys(endpoints).length,
    device_manifest_schema: deviceManifest.schema,
    device_session_id: register.session_id,
    device_health: heartbeat.health.severity,
    device_sessions: sessions.total,
    device_runtime_events: sessions.events.length,
    device_smoke_live_sessions: sessions.smoke_test_summary.sessions_online,
    ai_schema_title: aiSchema.title,
    evidence_items: evidenceChain.evidence_items.length,
    session_stages: sessionPlan.stages.length,
    ai_hud_hint_level: hud.hint_level,
    prompt_chars: aiPrompt.prompt.length,
    unity_base_url: bootstrap.unity_compat.config.base_url
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
