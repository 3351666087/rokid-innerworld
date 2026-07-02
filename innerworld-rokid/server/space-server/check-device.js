import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeviceRuntimeStore } from "./src/domain/device-runtime.js";
import { authorizeDevicePairingIssue } from "./src/http/api-router.js";

const base = process.env.BASE_URL || "http://localhost:5177";
const expectedSpaceId = "innerworld_campus_wall";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");
const OPERATOR_PIN_ENV = "INNERWORLD_OPERATOR_PIN";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakePairingRequest(remoteAddress, operatorPin = "") {
  return {
    socket: { remoteAddress },
    headers: operatorPin ? { "x-innerworld-operator-pin": operatorPin } : {}
  };
}

function assertOperatorPairingGate() {
  const previousPin = process.env[OPERATOR_PIN_ENV];
  try {
    delete process.env[OPERATOR_PIN_ENV];
    const loopback = authorizeDevicePairingIssue(fakePairingRequest("127.0.0.1"), {});
    assert(loopback.ok === true, "loopback device pairing gate must pass");
    assert(loopback.operator_gate?.mode === "loopback", "loopback device pairing gate mode failed");
    assert(loopback.operator_gate?.pin_persisted === false, "loopback device pairing gate PIN persistence failed");

    const noPin = authorizeDevicePairingIssue(fakePairingRequest("192.168.1.42"), {});
    assert(noPin.ok === false, "non-loopback pairing gate without configured PIN must fail");
    assert(noPin.error === "device_pairing_operator_gate_failed", "non-loopback no PIN error mismatch");
    assert(noPin.operator_gate?.issues?.includes("non_loopback_pairing_requires_operator_pin_config"), "non-loopback no PIN issue mismatch");

    process.env[OPERATOR_PIN_ENV] = "field-pin-7421";
    const badPin = authorizeDevicePairingIssue(fakePairingRequest("192.168.1.42"), { operator_pin: "wrong-pin" });
    assert(badPin.ok === false, "non-loopback pairing gate with bad PIN must fail");
    assert(badPin.operator_gate?.issues?.includes("operator_pin_missing_or_invalid"), "non-loopback bad PIN issue mismatch");

    const goodPin = authorizeDevicePairingIssue(fakePairingRequest("192.168.1.42"), { operator_pin: "field-pin-7421" });
    assert(goodPin.ok === true, "non-loopback pairing gate with good PIN must pass");
    assert(goodPin.operator_gate?.mode === "operator_pin", "non-loopback pairing gate good PIN mode mismatch");
    assert(!JSON.stringify({ noPin, badPin, goodPin }).includes("field-pin-7421"), "operator PIN leaked from pairing gate state");
  } finally {
    if (previousPin === undefined) delete process.env[OPERATOR_PIN_ENV];
    else process.env[OPERATOR_PIN_ENV] = previousPin;
  }
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

async function postJsonStatus(url, label, payload, expectedStatus) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.status === expectedStatus, `${label} expected status ${expectedStatus} got ${res.status}`);
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
      sdk_binding_status: {
        schema: "innerworld-rokid-sdk-binding/v1",
        define_symbol: "ROKID_UXR",
        stage: "boundary_compiled",
        boundary_compiled: true,
        package_detected: false,
        input_binding_ready: false,
        overlay_binding_ready: false,
        live_binding_ready: false,
        candidate_assemblies: ["Assembly-CSharp", "local-snapshot-token", "10.0.0.31"],
        candidate_types: ["InnerWorld.Rokid.RokidSdkBindingProbe", "SN-LOCAL-SNAPSHOT-SECRET", "private-local-wifi", "00:00:00:00:00:31"],
        message: "local snapshot binding report local-snapshot-token 10.0.0.31 SN-LOCAL-SNAPSHOT-SECRET private-local-wifi 00:00:00:00:00:31"
      },
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
      sdk_binding_status: {
        schema: "innerworld-rokid-sdk-binding/v1",
        define_symbol: "ROKID_UXR",
        stage: "package_detected",
        boundary_compiled: true,
        package_detected: true,
        input_binding_ready: false,
        overlay_binding_ready: false,
        live_binding_ready: false,
        candidate_assemblies: ["Rokid.UXR", "local-snapshot-token", "10.0.0.31"],
        candidate_types: ["Rokid.UXR.InputBridge", "SN-LOCAL-SNAPSHOT-SECRET", "private-local-wifi", "00:00:00:00:00:31"],
        message: "local snapshot heartbeat local-snapshot-token 10.0.0.31 SN-LOCAL-SNAPSHOT-SECRET private-local-wifi 00:00:00:00:00:31"
      },
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
  assert(!snapshotText.includes("00:00:00:00:00:31"), "local runtime snapshot leaked MAC");

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
  assertOperatorPairingGate();

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
  assertEndpoint(endpoints.ledger_summary, "ledger_summary");
  assertEndpoint(endpoints.ledger_events, "ledger_events");
  assertEndpoint(endpoints.evidence_chain, "evidence_chain");
  assertEndpoint(endpoints.session_plan, "session_plan");
  assertEndpoint(endpoints.wall_calibration, "wall_calibration");
  assertEndpoint(endpoints.wall_calibration_observations, "wall_calibration_observations", "POST");
  assertEndpoint(endpoints.field_markers, "field_markers");
  assertEndpoint(endpoints.field_acceptance, "field_acceptance");
  assertEndpoint(endpoints.device_bootstrap, "device_bootstrap");
  assertEndpoint(endpoints.device_manifest, "device_manifest");
  assertEndpoint(endpoints.device_adapter_checklist, "device_adapter_checklist");
  assertEndpoint(endpoints.device_pairing, "device_pairing", "POST");
  assertEndpoint(endpoints.device_register, "device_register", "POST");
  assertEndpoint(endpoints.device_heartbeat, "device_heartbeat", "POST");
  assertEndpoint(endpoints.device_sessions, "device_sessions");
  assertEndpoint(endpoints.service_actions_outbox, "service_actions_outbox");
  assertEndpoint(endpoints.service_action_ack_template, "service_action_ack_template", "POST");
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
  assert(Object.keys(endpoints).length >= 30, "endpoint count check failed");

  const [health, space, aiSchema, aiPrompt, evidenceChain, sessionPlan, wallCalibration, fieldMarkers, fieldAcceptance, deviceManifest, adapterChecklist, storeStatus, datasetCatalog, initialLedgerSummary, initialLedgerEvents] = await Promise.all([
    fetchJson(endpoints.health.url, "health"),
    fetchJson(endpoints.space.url, "space"),
    fetchJson(endpoints.ai_schema.url, "ai_schema"),
    fetchJson(endpoints.ai_prompt.url, "ai_prompt"),
    fetchJson(endpoints.evidence_chain.url, "evidence_chain"),
    fetchJson(endpoints.session_plan.url, "session_plan"),
    fetchJson(endpoints.wall_calibration.url, "wall_calibration"),
    fetchJson(endpoints.field_markers.url, "field_markers"),
    fetchJson(endpoints.field_acceptance.url, "field_acceptance"),
    fetchJson(endpoints.device_manifest.url, "device_manifest"),
    fetchJson(endpoints.device_adapter_checklist.url, "device_adapter_checklist"),
    fetchJson(endpoints.store_status.url, "store_status"),
    fetchJson(endpoints.dataset_catalog.url, "dataset_catalog"),
    fetchJson(endpoints.ledger_summary.url, "ledger_summary"),
    fetchJson(endpoints.ledger_events.url, "ledger_events")
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
  assert(wallCalibration.ok === true, "wall calibration ok check failed");
  assert(wallCalibration.schema === "innerworld-wall-calibration/v1", "wall calibration schema check failed");
  assert(wallCalibration.space_id === expectedSpaceId, "wall calibration space check failed");
  assert(wallCalibration.wall?.coordinate_system === "innerworld-wall-local/v1", "wall calibration coordinate system failed");
  assert(Array.isArray(wallCalibration.anchors) && wallCalibration.anchors.length === 3, "wall calibration anchors check failed");
  assert(wallCalibration.anchors.some((anchor) => anchor.anchor_id === "A1" && anchor.marker?.marker_type === "qr_poster"), "wall calibration A1 marker failed");
  assert(wallCalibration.anchors.every((anchor) => anchor.acceptance?.confidence_min >= 0.5), "wall calibration acceptance failed");
  assert(wallCalibration.observation_endpoint?.path === "/api/calibration/observations", "wall calibration observation endpoint failed");
  assert(fieldMarkers.ok === true, "field markers ok check failed");
  assert(fieldMarkers.schema === "innerworld-field-markers/v1", "field markers schema check failed");
  assert(fieldMarkers.space_id === expectedSpaceId, "field markers space check failed");
  assert(fieldMarkers.source_of_truth?.runtime_manifest === "/api/calibration/wall", "field markers runtime source failed");
  assert(fieldMarkers.calibration_manifest?.endpoint === "/api/calibration/wall", "field markers calibration endpoint failed");
  assert(fieldMarkers.calibration_manifest?.observation_endpoint?.path === "/api/calibration/observations", "field markers observation endpoint failed");
  assert(Array.isArray(fieldMarkers.markers) && fieldMarkers.markers.length === 3, "field markers count failed");
  assert(fieldMarkers.markers.map((marker) => marker.anchor_id).join(",") === "A1,A2,A3", "field markers anchors failed");
  assert(fieldMarkers.markers.some((marker) => marker.anchor_id === "A1" && marker.marker?.marker_id === "A1:qr-entry" && marker.marker?.marker_type === "qr_poster"), "field markers A1 QR failed");
  assert(fieldMarkers.markers.some((marker) => marker.anchor_id === "A2" && marker.marker?.marker_id === "A2:image-target"), "field markers A2 target failed");
  assert(fieldMarkers.markers.some((marker) => marker.anchor_id === "A3" && marker.marker?.marker_id === "A3:image-target"), "field markers A3 target failed");
  assert(fieldMarkers.markers.every((marker) => marker.expected_pose?.position && marker.print?.payload_url && marker.field_role?.operator_action), "field markers print/runtime binding failed");
  assert(fieldAcceptance.ok === true, "field acceptance ok check failed");
  assert(fieldAcceptance.schema === "innerworld-field-acceptance/v1", "field acceptance schema check failed");
  assert(fieldAcceptance.endpoint?.path === "/api/field/acceptance", "field acceptance endpoint failed");
  assert(fieldAcceptance.source_of_truth?.field_markers?.path === "/api/field/markers", "field acceptance marker source failed");
  assert(fieldAcceptance.source_of_truth?.wall_calibration?.path === "/api/calibration/wall", "field acceptance calibration source failed");
  assert(Array.isArray(fieldAcceptance.gates) && fieldAcceptance.gates.length >= 7, "field acceptance gate count failed");
  assert(fieldAcceptance.gates.some((gate) => gate.id === "print_kit"), "field acceptance print kit gate failed");
  assert(fieldAcceptance.gates.some((gate) => gate.id === "simulator_rehearsal"), "field acceptance rehearsal gate failed");
  const hardwareGate = fieldAcceptance.gates.find((gate) => gate.id === "hardware_alignment");
  const trustedGate = fieldAcceptance.gates.find((gate) => gate.id === "trusted_hardware_session");
  assert(hardwareGate, "field acceptance hardware gate failed");
  assert(trustedGate, "field acceptance trusted hardware session gate failed");
  assert(Array.isArray(hardwareGate.required_tracking_modes), "field acceptance hardware tracking modes failed");
  assert(hardwareGate.required_tracking_modes.includes("qr"), "field acceptance QR tracking mode failed");
  assert(hardwareGate.required_tracking_modes.includes("image_tracking"), "field acceptance image tracking mode failed");
  assert(hardwareGate.required_tracking_modes.includes("slam"), "field acceptance SLAM tracking mode failed");
  assert(hardwareGate.required_tracking_modes.includes("simulator") === false, "field acceptance simulator hardware tracking leak failed");
  assert(trustedGate.required?.includes("sdk_binding_status.live_binding_ready"), "field acceptance trusted SDK live requirement failed");
  assert(trustedGate.evidence?.sdk_live_binding_required === true, "field acceptance trusted SDK live evidence failed");
  assert(Array.isArray(trustedGate.evidence?.trusted_hardware_sessions), "field acceptance trusted sessions evidence failed");
  assert(Array.isArray(trustedGate.evidence?.untrusted_hardware_anchor_ids), "field acceptance untrusted anchor evidence failed");
  assert(fieldAcceptance.summary?.sdk_live_binding_required === true, "field acceptance summary SDK live requirement failed");
  assert(fieldAcceptance.summary?.trusted_hardware_ready === fieldAcceptance.summary?.ready_for_hardware, "field acceptance trusted readiness summary failed");
  assert(fieldAcceptance.summary?.ready_for_hardware === false || fieldAcceptance.summary.trusted_hardware_evidence_count >= 3, "field acceptance hardware ready must require trusted evidence");
  assert(fieldAcceptance.summary?.all_simulator_ready_for_hardware === false, "field acceptance all-simulator guard failed");
  assert(fieldAcceptance.summary?.simulator_rehearsal_is_not_hardware_ready === true, "field acceptance simulator separation failed");
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
  assert(deviceManifest.pairing_contract?.schema === "innerworld-device-pairing/v1", "device manifest pairing schema failed");
  assert(deviceManifest.pairing_contract?.issue_endpoint === "/api/device/pairing", "device manifest pairing endpoint failed");
  assert(deviceManifest.pairing_contract?.consume_on === "/api/device/register", "device manifest pairing consume route failed");
  assert(deviceManifest.pairing_contract?.required_for_hardware_acceptance === true, "device manifest pairing hardware requirement failed");
  assert(deviceManifest.pairing_contract?.rehearsal_allowed_without_pairing === true, "device manifest pairing rehearsal rule failed");
  assert(deviceManifest.pairing_contract?.code_persisted === false, "device manifest pairing persistence rule failed");
  assert(deviceManifest.pairing_contract?.operator_gate?.default_policy === "loopback_windows_host_only", "device manifest pairing operator gate default failed");
  assert(deviceManifest.pairing_contract?.operator_gate?.lan_override_env === "INNERWORLD_OPERATOR_PIN", "device manifest pairing operator gate env failed");
  assert(deviceManifest.pairing_contract?.operator_gate?.pin_persisted === false, "device manifest pairing operator PIN persistence failed");
  assert(deviceManifest.pairing_contract?.operator_gate?.rejected_error === "device_pairing_operator_gate_failed", "device manifest pairing gate rejection failed");
  assert(Array.isArray(deviceManifest.adapter_slots) && deviceManifest.adapter_slots.length >= 4, "device manifest adapter slots failed");
  assert(deviceManifest.sdk_binding_status?.schema === "innerworld-rokid-sdk-binding/v1", "device manifest SDK binding schema failed");
  assert(deviceManifest.sdk_binding_status?.define_symbol === "ROKID_UXR", "device manifest SDK binding define failed");
  assert(deviceManifest.sdk_binding_status?.live_binding_ready === false, "device manifest SDK binding default live failed");
  assert(deviceManifest.sdk_binding_status?.client_report_contract?.accepted_on?.includes("/api/device/register"), "device manifest SDK binding register contract failed");
  assert(deviceManifest.sdk_binding_status?.client_report_contract?.accepted_on?.includes("/api/device/heartbeat"), "device manifest SDK binding heartbeat contract failed");
  assert(deviceManifest.endpoints?.device_register?.method === "POST", "device manifest register endpoint failed");
  assert(deviceManifest.endpoints?.device_heartbeat?.method === "POST", "device manifest heartbeat endpoint failed");
  assert(deviceManifest.adapter_checklist_contract?.schema === "innerworld-rokid-live-adapter-checklist/v1", "device manifest adapter checklist schema failed");
  assert(deviceManifest.adapter_checklist_contract?.endpoint?.path === "/api/device/adapter-checklist", "device manifest adapter checklist endpoint failed");
  assert(deviceManifest.adapter_checklist_contract?.item_ids?.includes("a1_entry_lock"), "device manifest adapter checklist A1 item failed");
  assert(adapterChecklist.ok === true, "device adapter checklist ok failed");
  assert(adapterChecklist.schema === "innerworld-rokid-live-adapter-checklist/v1", "device adapter checklist schema failed");
  assert(adapterChecklist.endpoint?.path === "/api/device/adapter-checklist", "device adapter checklist endpoint failed");
  assert(adapterChecklist.final_direction === "real Rokid campus wall A1/A2/A3", "device adapter checklist final direction failed");
  assert(adapterChecklist.scope_guard?.generic_tour_or_ugc === false, "device adapter checklist generic/UGC guard failed");
  assert(Array.isArray(adapterChecklist.scope_guard?.required_anchor_ids) && adapterChecklist.scope_guard.required_anchor_ids.join(",") === "A1,A2,A3", "device adapter checklist anchor scope failed");
  assert(adapterChecklist.scope_guard?.required_hardware?.includes("RA202"), "device adapter checklist RA202 scope failed");
  assert(adapterChecklist.scope_guard?.required_hardware?.includes("RAS201"), "device adapter checklist RAS201 scope failed");
  assert(Array.isArray(adapterChecklist.items) && adapterChecklist.items.length >= 10, "device adapter checklist items failed");
  for (const itemId of ["rk_camera_rig", "rk_input_3dof_ray", "pointable_ui", "a1_entry_lock", "a2_a3_image_tracking", "slam_heartbeat", "uxr_overlay_renderer", "trusted_hardware_proof", "performance_gate"]) {
    assert(adapterChecklist.items.some((item) => item.item_id === itemId), `device adapter checklist missing ${itemId}`);
  }
  assert(adapterChecklist.report_contract?.field === "sdk_binding_status.adapter_checklist", "device adapter checklist report field failed");
  assert(adapterChecklist.report_contract?.allowed_boolean_keys?.includes("rk_camera_rig_ready"), "device adapter checklist report keys failed");
  assert(adapterChecklist.ready === false, "device adapter checklist must not claim ready without real live adapter evidence");
  assert(storeStatus.ok === true, "store status ok failed");
  assert(storeStatus.engine === "sqlite", "store status engine failed");
  assert(storeStatus.safe_storage?.raw_sql_api === false, "store raw SQL guard failed");
  assert(datasetCatalog.ok === true, "dataset catalog ok failed");
  assert(datasetCatalog.datasets?.some((dataset) => dataset.dataset_id === "space.contract"), "dataset catalog space contract failed");
  assert(datasetCatalog.datasets?.some((dataset) => dataset.dataset_id === "hardware.applied_kit"), "dataset catalog hardware failed");
  assert(datasetCatalog.datasets?.some((dataset) => dataset.dataset_id === "runtime.mission_ledger"), "dataset catalog ledger failed");
  assert(initialLedgerSummary.ok === true, "initial ledger summary ok failed");
  assert(initialLedgerSummary.engine === "sqlite", "initial ledger summary engine failed");
  assert(initialLedgerSummary.dataset_id === "runtime.mission_ledger", "initial ledger summary dataset failed");
  assert(initialLedgerSummary.mission?.state, "initial ledger mission summary failed");
  assert(initialLedgerEvents.ok === true, "initial ledger events ok failed");
  assert(Array.isArray(initialLedgerEvents.events), "initial ledger events list failed");

  const datasetCall = await postJson(endpoints.dataset_call.url, "dataset_call", {
    dataset_id: "space.contract",
    operation: "get_record",
    record_id: "space"
  });
  assert(datasetCall.ok === true, "dataset call ok failed");
  assert(datasetCall.record?.value?.space_id === expectedSpaceId, "dataset call space record failed");

  const requiredCapabilities = deviceManifest.required_capabilities.map((capability) => capability.id);
  const pairing = await postJson(endpoints.device_pairing.url, "device_pairing", {
    purpose: "hardware_acceptance"
  });
  assert(pairing.ok === true, "device pairing ok check failed");
  assert(pairing.schema === "innerworld-device-pairing/v1", "device pairing schema failed");
  assert(typeof pairing.pairing_code === "string" && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(pairing.pairing_code), "device pairing code format failed");
  assert(pairing.required_for_hardware_acceptance === true, "device pairing hardware requirement failed");
  assert(pairing.code_persisted === false, "device pairing persistence failed");
  assert(pairing.operator_gate?.schema === "innerworld-device-pairing-operator-gate/v1", "device pairing operator gate schema failed");
  assert(pairing.operator_gate?.status === "passed", "device pairing operator gate status failed");
  assert(pairing.operator_gate?.pin_persisted === false, "device pairing operator PIN persistence failed");
  assert(!JSON.stringify({ bootstrap, deviceManifest }).includes(pairing.pairing_code), "pairing code leaked into manifest/bootstrap");

  const badPairing = await postJsonStatus(endpoints.device_register.url, "device_register_bad_pairing", {
    profile: "rokid-ar",
    device_id: "RA202 bad pairing",
    pairing_code: "BAD0-CODE",
    capabilities: requiredCapabilities
  }, 403);
  assert(badPairing.ok === false, "bad pairing register must fail");
  assert(badPairing.error === "device_pairing_failed", "bad pairing error mismatch");
  assert(badPairing.pairing?.status === "rejected", "bad pairing status mismatch");
  assert(!JSON.stringify(badPairing).includes("BAD0-CODE"), "bad pairing response leaked submitted code");

  const register = await postJson(endpoints.device_register.url, "device_register", {
    profile: "rokid-ar",
    device_id: "RA202 dev kit #1",
    client_version: "unity-runtime-0.1.0",
    pairing_code: pairing.pairing_code,
    serial_number: "SN-ABC-SECRET",
    access_token: "real-token-secret",
    capabilities: requiredCapabilities,
      sdk_binding_status: {
        schema: "innerworld-rokid-sdk-binding/v1",
        define_symbol: "ROKID_UXR",
        stage: "boundary_compiled",
        boundary_compiled: true,
        package_detected: false,
        input_binding_ready: false,
        overlay_binding_ready: false,
        live_binding_ready: false,
        candidate_assemblies: ["Assembly-CSharp", "real-token-secret", "10.0.0.18"],
        candidate_types: ["InnerWorld.Rokid.RokidSdkBindingProbe", "SN-ABC-SECRET", "private-demo-wifi", "00:11:22:33:44:55"],
        message: "device check boundary compiled real-token-secret 10.0.0.18 SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55"
      },
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
  assert(register.sdk_binding_status?.stage === "boundary_compiled", "device register SDK binding stage failed");
  assert(register.sdk_binding_status?.live_binding_ready === false, "device register SDK binding live flag failed");
  assert(register.pairing?.status === "operator_paired", "device register pairing status failed");
  assert(register.pairing?.required_for_hardware_acceptance === true, "device register pairing hardware requirement failed");
  assert(register.pairing?.code_persisted === false, "device register pairing persistence failed");
  assert(register.hardware_acceptance_eligible === true, "device register hardware acceptance eligibility failed");
  const registerText = JSON.stringify(register);
  assert(!registerText.includes(pairing.pairing_code), "device register leaked pairing code");
  assert(!registerText.includes("SN-ABC-SECRET"), "device register leaked serial");
  assert(!registerText.includes("real-token-secret"), "device register leaked token");
  assert(!registerText.includes("10.0.0.18"), "device register leaked IP");
  assert(!registerText.includes("private-demo-wifi"), "device register leaked SSID");
  assert(!registerText.includes("00:11:22:33:44:55"), "device register leaked MAC");

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
      sdk_binding_status: {
        schema: "innerworld-rokid-sdk-binding/v1",
        define_symbol: "ROKID_UXR",
        stage: "package_detected",
        boundary_compiled: true,
        package_detected: true,
        input_binding_ready: false,
        overlay_binding_ready: false,
        live_binding_ready: false,
        candidate_assemblies: ["Rokid.UXR", "real-token-secret", "10.0.0.18"],
        candidate_types: ["Rokid.UXR.InputBridge", "SN-ABC-SECRET", "private-demo-wifi", "00:11:22:33:44:55"],
        message: "device check package detected real-token-secret 10.0.0.18 SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55"
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
  assert(heartbeat.pending_actions.some((action) => action.action_id === "bind_rokid_sdk_live_adapter"), "device heartbeat SDK binding action failed");
  assert(heartbeat.health?.severity === "ok", "device heartbeat health severity failed");
  assert(heartbeat.sdk_binding_status?.stage === "package_detected", "device heartbeat SDK binding stage failed");
  assert(heartbeat.sdk_binding_status?.live_binding_ready === false, "device heartbeat SDK binding live flag failed");
  assert(heartbeat.pairing?.status === "operator_paired", "device heartbeat pairing status failed");
  assert(heartbeat.hardware_acceptance_eligible === true, "device heartbeat hardware eligibility failed");
  assert(heartbeat.runtime?.session_status === "online", "device heartbeat runtime session status failed");
  assert(heartbeat.runtime?.snapshot?.ok === true, "device heartbeat runtime snapshot failed");
  assert(heartbeat.next_poll_ms > 0, "device heartbeat next poll failed");
  assert(!JSON.stringify(heartbeat).includes("10.0.0.18"), "device heartbeat leaked IP");
  assert(!JSON.stringify(heartbeat).includes(pairing.pairing_code), "device heartbeat leaked pairing code");
  assert(!JSON.stringify(heartbeat).includes("real-token-secret"), "device heartbeat leaked token");
  assert(!JSON.stringify(heartbeat).includes("SN-ABC-SECRET"), "device heartbeat leaked serial");
  assert(!JSON.stringify(heartbeat).includes("private-demo-wifi"), "device heartbeat leaked SSID");
  assert(!JSON.stringify(heartbeat).includes("00:11:22:33:44:55"), "device heartbeat leaked MAC");

  const sessions = await fetchJson(endpoints.device_sessions.url, "device_sessions");
  assert(sessions.ok === true, "device sessions ok check failed");
  assert(sessions.total >= 1, "device sessions total check failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.heartbeat_count === 1), "device sessions summary failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.session_status === "online"), "device sessions online status failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.pairing_status === "operator_paired"), "device sessions pairing status failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.hardware_acceptance_eligible === true), "device sessions hardware eligibility failed");
  assert(sessions.pairing?.paired_sessions >= 1, "device sessions pairing summary failed");
  assert(sessions.pairing?.required_for_hardware_acceptance === true, "device sessions pairing hardware requirement failed");
  assert(sessions.smoke_test_summary?.checks?.has_operator_paired_session === true, "device sessions paired smoke summary failed");
  assert(sessions.devices?.some((device) => device.device_id === register.device_id), "device sessions device registry failed");
  assert(sessions.events?.some((event) => event.type === "device_heartbeat"), "device sessions event log failed");
  assert(sessions.smoke_test_summary?.checks?.has_live_session === true, "device sessions smoke summary failed");
  assert(sessions.smoke_test_summary?.snapshot?.ok === true, "device sessions smoke snapshot failed");
  assert(sessions.sdk_binding?.package_detected_sessions >= 1, "device sessions SDK package summary failed");
  assert(sessions.sdk_binding?.live_bound_sessions === 0, "device sessions SDK live summary failed");
  assert(sessions.sessions.some((session) => session.session_id === register.session_id && session.sdk_binding_status?.stage === "package_detected"), "device sessions SDK binding stage failed");
  assert(!JSON.stringify(sessions).includes("10.0.0.18"), "device sessions leaked IP");
  assert(!JSON.stringify(sessions).includes(pairing.pairing_code), "device sessions leaked pairing code");
  assert(!JSON.stringify(sessions).includes("real-token-secret"), "device sessions leaked token");
  assert(!JSON.stringify(sessions).includes("SN-ABC-SECRET"), "device sessions leaked serial");
  assert(!JSON.stringify(sessions).includes("private-demo-wifi"), "device sessions leaked SSID");
  assert(!JSON.stringify(sessions).includes("00:11:22:33:44:55"), "device sessions leaked MAC");

  const calibrationObservation = await postJson(endpoints.wall_calibration_observations.url, "wall_calibration_observation", {
    session_id: register.session_id,
    device_id: register.device_id,
    anchor_id: "A2",
    tracking_mode: "image_tracking",
    observed_pose: {
      position: { x: 0, y: 1.5, z: 3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    },
    confidence: 0.97,
    notes: "A2 wall alignment check; token real-token-secret 10.0.0.18 SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55",
    client_time: "2026-07-02T10:00:04.000Z"
  });
  assert(calibrationObservation.ok === true, "wall calibration observation ok failed");
  assert(calibrationObservation.observation?.schema === "innerworld-wall-calibration-observation/v1", "wall calibration observation schema failed");
  assert(calibrationObservation.observation?.status === "accepted", "wall calibration observation status failed");
  assert(calibrationObservation.observation?.anchor_id === "A2", "wall calibration observation anchor failed");
  assert(calibrationObservation.observation?.position_error_m === 0, "wall calibration observation error failed");
  assert(calibrationObservation.summary?.calibrated_anchor_ids?.includes("A2"), "wall calibration summary anchor failed");
  const calibrationText = JSON.stringify(calibrationObservation);
  assert(!calibrationText.includes("10.0.0.18"), "wall calibration leaked IP");
  assert(!calibrationText.includes("real-token-secret"), "wall calibration leaked token");
  assert(!calibrationText.includes("SN-ABC-SECRET"), "wall calibration leaked serial");
  assert(!calibrationText.includes("private-demo-wifi"), "wall calibration leaked SSID");
  assert(!calibrationText.includes("00:11:22:33:44:55"), "wall calibration leaked MAC");

  assertLocalRuntimeSnapshot({ space, aiSchema, requiredCapabilities });

  const hud = await postJson(endpoints.ai_hud.url, "ai_hud", {
    anchor_id: "A2",
    user_action: "gaze"
  });
  assert(typeof hud.display_text === "string" && hud.display_text.length > 0, "AI HUD display text check failed");
  assert(hud.display_text.length <= aiSchema.properties.display_text.maxLength, "AI HUD max length check failed");
  assert(["none", "weak", "strong", "answer"].includes(hud.hint_level), "AI HUD hint level check failed");
  assert(hud.write_back_review?.tag === "time_capsule", "AI HUD write-back tag check failed");

  const interaction = await postJson(endpoints.interactions.url, "interaction_for_ledger", {
    user_id: "A",
    anchor_id: "A2",
    step_id: "read",
    mission_state: "reading",
    ip_address: "10.0.0.18",
    access_token: "real-token-secret"
  });
  assert(interaction.ok === true, "ledger interaction ok failed");
  assert(interaction.ledger?.type === "interaction", "ledger interaction event missing");
  assert(!JSON.stringify(interaction.ledger).includes("10.0.0.18"), "ledger interaction leaked IP");
  assert(!JSON.stringify(interaction.ledger).includes("real-token-secret"), "ledger interaction leaked token");

  const findYear = await postJson(endpoints.interactions.url, "find_year_for_ledger", {
    user_id: "A",
    anchor_id: "A2",
    step_id: "find_year",
    mission_state: "doing"
  });
  assert(findYear.ok === true, "ledger find-year ok failed");
  assert(findYear.ledger?.type === "interaction", "ledger find-year event missing");

  const service = await postJson(endpoints.service_actions.url, "service_action_for_ledger", {
    user_id: "A",
    anchor_id: "A2",
    action_id: "JOIN_EVENT_1430",
    label: "Join 14:30"
  });
  assert(service.ok === true, "ledger service action ok failed");
  assert(service.ledger?.type === "service_action", "ledger service action event missing");

  const writeBack = await postJson(endpoints.write_back.url, "write_back_for_ledger", {
    user_id: "A",
    anchor_id: "A3",
    text: "后来的人，别忘了抬头看这里。",
    serial_number: "SN-ABC-SECRET"
  });
  assert(writeBack.ok === true, "ledger write-back ok failed");
  assert(writeBack.ledger?.type === "write_back", "ledger write-back event missing");
  assert(!JSON.stringify(writeBack.ledger).includes("SN-ABC-SECRET"), "ledger write-back leaked serial");

  const ledgerSummary = await fetchJson(endpoints.ledger_summary.url, "ledger_summary_after_writes");
  const ledgerEvents = await fetchJson(`${endpoints.ledger_events.url}?limit=12`, "ledger_events_after_writes");
  assert(ledgerSummary.ok === true, "ledger summary after writes ok failed");
  assert(ledgerSummary.checks?.has_interaction === true, "ledger summary interaction check failed");
  assert(ledgerSummary.checks?.has_service_action === true, "ledger summary service action check failed");
  assert(ledgerSummary.checks?.has_write_back === true, "ledger summary write-back check failed");
  assert(ledgerSummary.mission?.completed_steps?.includes("write_back"), "ledger mission completed steps failed");
  assert(ledgerSummary.mission?.completed_step_count >= 4, "ledger mission completed step count failed");
  assert(ledgerSummary.service_actions?.total >= 1, "ledger service action total failed");
  assert(ledgerSummary.audit?.event_count >= 4, "ledger audit count failed");
  assert(Array.isArray(ledgerEvents.events) && ledgerEvents.events.length >= 4, "ledger events after writes failed");
  const ledgerText = JSON.stringify({ ledgerSummary, ledgerEvents });
  assert(!ledgerText.includes("10.0.0.18"), "ledger APIs leaked IP");
  assert(!ledgerText.includes("real-token-secret"), "ledger APIs leaked token");
  assert(!ledgerText.includes("SN-ABC-SECRET"), "ledger APIs leaked serial");

  console.log(JSON.stringify({
    ok: true,
    base,
    protocol_version: bootstrap.protocol_version,
    profile: bootstrap.profile,
    space_id: bootstrap.space.space_id,
    anchors: bootstrap.anchors.length,
    mission_steps: bootstrap.mission.steps.length,
    endpoints: Object.keys(endpoints).length,
    ledger_events: ledgerEvents.events.length,
    ledger_checks: ledgerSummary.checks,
    device_manifest_schema: deviceManifest.schema,
    adapter_checklist_schema: adapterChecklist.schema,
    adapter_checklist_status: adapterChecklist.status,
    device_session_id: register.session_id,
    device_health: heartbeat.health.severity,
    device_pairing: register.pairing.status,
    device_sessions: sessions.total,
    device_runtime_events: sessions.events.length,
    device_smoke_live_sessions: sessions.smoke_test_summary.sessions_online,
    sdk_binding_stage: heartbeat.sdk_binding_status.stage,
    sdk_live_bound_sessions: sessions.sdk_binding.live_bound_sessions,
    ai_schema_title: aiSchema.title,
    evidence_items: evidenceChain.evidence_items.length,
    session_stages: sessionPlan.stages.length,
    wall_calibration_schema: wallCalibration.schema,
    wall_calibration_anchors: wallCalibration.anchors.length,
    field_markers_schema: fieldMarkers.schema,
    field_markers: fieldMarkers.markers.map((marker) => marker.marker.marker_id),
    field_acceptance_schema: fieldAcceptance.schema,
    field_acceptance_status: fieldAcceptance.status,
    field_acceptance_gates: fieldAcceptance.gates.map((gate) => gate.id),
    wall_calibration_observation_status: calibrationObservation.observation.status,
    ai_hud_hint_level: hud.hint_level,
    prompt_chars: aiPrompt.prompt.length,
    unity_base_url: bootstrap.unity_compat.config.base_url
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
