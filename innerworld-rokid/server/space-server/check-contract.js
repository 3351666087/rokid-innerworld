import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEVICE_BOOTSTRAP_PROTOCOL,
  DEVICE_RUNTIME_MANIFEST_SCHEMA,
  DEVICE_RUNTIME_SESSION_PROTOCOL,
  EVIDENCE_CHAIN_SCHEMA,
  FIELD_MARKER_SCHEMA,
  FIELD_SESSION_STAGE_IDS,
  INNERWORLD_SPACE_ID,
  MISSION_STEP_IDS,
  MISSION_STATES,
  STORY_GRAPH_MISSION_RUNTIME_ID,
  STORY_GRAPH_MISSION_RUNTIME_SCHEMA,
  STORY_GRAPH_NODE_IDS,
  WALL_CALIBRATION_OBSERVATION_SCHEMA,
  WALL_CALIBRATION_SCHEMA,
  SESSION_PLAN_SCHEMA,
  buildDemoStatus,
  buildDeviceBootstrap,
  buildEndpointMap,
  buildStoryGraphMissionRuntimeContract,
  createInnerWorldClient,
  normalizeMissionState
} from "../../shared/innerworld-contract.js";
import { buildDeviceManifest, createDeviceRuntimeStore } from "./src/domain/device-runtime.js";
import { buildEvidenceChain } from "./src/domain/evidence-chain.js";
import { buildFieldMarkerManifest } from "./src/domain/field-markers.js";
import { generateHudOutput } from "./src/domain/hud-generator.js";
import { applyInteraction, applyServiceAction, applyWriteBack, storyGraphMissionRuntimeV2Status } from "./src/domain/mission-engine.js";
import { buildSessionPlan } from "./src/domain/session-planner.js";
import { buildWallCalibrationManifest, createWallCalibrationObservation } from "./src/domain/wall-calibration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");
const requireUnityProtocol = process.argv.includes("--require-unity") || process.env.REQUIRE_UNITY_PROTOCOL === "1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function assertEndpointMap(endpoints) {
  const expected = {
    health: ["GET", "/api/health"],
    ops_status: ["GET", "/api/ops/status"],
    store_status: ["GET", "/api/store/status"],
    dataset_catalog: ["GET", "/api/datasets/catalog"],
    dataset_call: ["POST", "/api/datasets/call"],
    ledger_summary: ["GET", "/api/ledger/summary"],
    ledger_events: ["GET", "/api/ledger/events"],
    evidence_chain: ["GET", "/api/evidence/chain"],
    session_plan: ["GET", "/api/session/plan"],
    wall_calibration: ["GET", "/api/calibration/wall"],
    wall_calibration_observations: ["POST", "/api/calibration/observations"],
    field_markers: ["GET", "/api/field/markers"],
    field_acceptance: ["GET", "/api/field/acceptance"],
    device_bootstrap: ["GET", "/api/device/bootstrap"],
    device_manifest: ["GET", "/api/device/manifest"],
    device_adapter_checklist: ["GET", "/api/device/adapter-checklist"],
    device_pairing: ["POST", "/api/device/pairing"],
    device_register: ["POST", "/api/device/register"],
    device_heartbeat: ["POST", "/api/device/heartbeat"],
    device_sessions: ["GET", "/api/device/sessions"],
    service_actions_outbox: ["GET", "/api/service-actions/outbox"],
    service_action_ack_template: ["POST", "/api/service-actions/{action_record_id}/ack"],
    ai_schema: ["GET", "/api/ai/schema"],
    ai_prompt: ["GET", "/api/ai/prompt"],
    ai_hud: ["POST", "/api/ai/hud"],
    space: ["GET", `/api/spaces/${INNERWORLD_SPACE_ID}`],
    state: ["GET", "/api/state"],
    nearby_pins: ["GET", "/api/pins/nearby?radius=20"],
    interactions: ["POST", "/api/interactions"],
    service_actions: ["POST", "/api/service-actions"],
    write_back: ["POST", `/api/spaces/${INNERWORLD_SPACE_ID}/beacons`],
    reset: ["POST", "/api/reset"]
  };

  for (const [key, [method, route]] of Object.entries(expected)) {
    const endpoint = endpoints[key];
    assert(endpoint, `${key} endpoint missing`);
    assert(endpoint.method === method, `${key} method mismatch`);
    assert(endpoint.path === route, `${key} path mismatch`);
    assert(endpoint.url === `http://localhost:5177${route}`, `${key} url mismatch`);
  }
  assert(Object.keys(endpoints).length >= 31, "endpoint map count mismatch");
}

function assertStoryGraphContract(graph, context = "story graph") {
  assert(graph?.contract_id === STORY_GRAPH_MISSION_RUNTIME_ID, `${context} contract id mismatch`);
  assert(graph?.schema === STORY_GRAPH_MISSION_RUNTIME_SCHEMA, `${context} schema mismatch`);
  assert(graph.runtime_scope === "hardware_independent_first_slice", `${context} runtime scope mismatch`);
  assert(graph.final_direction === "real Rokid campus wall A1/A2/A3", `${context} final direction mismatch`);
  assert(graph.scope_guard?.campus_wall_only === true, `${context} campus wall guard mismatch`);
  assert(graph.scope_guard?.generic_tour_or_ugc === false, `${context} generic tour/UGC guard mismatch`);
  assert(graph.scope_guard?.open_ugc === false, `${context} open UGC guard mismatch`);
  assert(graph.scope_guard?.phone_or_ppt_primary === false, `${context} phone/PPT guard mismatch`);
  assert(graph.scope_guard?.required_anchor_ids?.join(",") === "A1,A2,A3", `${context} anchor guard mismatch`);

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const guards = Array.isArray(graph.guards) ? graph.guards : [];
  const actions = Array.isArray(graph.actions) ? graph.actions : [];
  const nodeIds = graph.node_order || nodes.map((node) => node.node_id);
  assert(nodeIds.join(",") === STORY_GRAPH_NODE_IDS.join(","), `${context} node order mismatch`);
  assert(nodes.map((node) => node.anchor_id).join(",") === "A1,A2,A3,A3", `${context} node anchors mismatch`);
  assert(edges.map((edge) => edge.edge_id).join(",") === "a1_to_a2,a2_to_a3,a3_to_user_b", `${context} edges mismatch`);
  assert(guards.map((guard) => guard.guard_id).join(",") === "a1_entry_confirmed,a2_memory_read,a3_write_back_committed,user_b_can_read_back", `${context} guards mismatch`);
  assert(actions.some((action) => action.action_id === "submit_a3_write_back" && action.endpoint_key === "write_back" && action.payload?.anchor_id === "A3"), `${context} A3 write-back action mismatch`);
  assert(actions.some((action) => action.action_id === "verify_user_b_readback" && action.endpoint_key === "state" && action.payload?.user_id === "B" && action.payload?.anchor_id === "A3"), `${context} User B readback action mismatch`);
  assert(nodes.find((node) => node.node_id === "a2_memory")?.legacy_step_ids?.join(",") === "read,find_year", `${context} A2 legacy mapping mismatch`);
  assert(nodes.find((node) => node.node_id === "a3_write_back")?.legacy_step_ids?.join(",") === "write_back", `${context} A3 legacy mapping mismatch`);
  assert(edges.every((edge) => edge.from && edge.to && edge.guard_id && edge.action_id && edge.endpoint_key), `${context} edge contract incomplete`);
  assert(guards.every((guard) => Array.isArray(guard.requires) && guard.requires.length > 0 && guard.endpoint_key), `${context} guard contract incomplete`);
}

function assertSpaceContract(space) {
  assert(space.space_id === INNERWORLD_SPACE_ID, "space id mismatch");
  assert(Array.isArray(space.anchors) && space.anchors.length === 3, "expected 3 anchors");
  assert(space.anchors.map((anchor) => anchor.anchor_id).join(",") === "A1,A2,A3", "anchor ids mismatch");
  assert(space.anchors.some((anchor) => anchor.anchor_id === "A3" && anchor.default_state === "locked"), "A3 locked default missing");
  assert(Array.isArray(space.mission?.steps), "mission steps missing");
  assert(space.mission.steps.map((step) => step.step_id).join(",") === MISSION_STEP_IDS.join(","), "mission step ids mismatch");
  assertStoryGraphContract(space.mission?.story_graph, "space mission story graph");
  assert(space.service_actions?.some((action) => action.action_id === "JOIN_EVENT_1430"), "service action JOIN_EVENT_1430 missing");
}

function assertAiContract(aiSchema) {
  assert(aiSchema.title === "InnerWorld HUD AI Output", "AI schema title mismatch");
  assert(aiSchema.properties?.display_text?.maxLength === 54, "display_text maxLength mismatch");
  const states = aiSchema.properties?.mission_state?.enum || [];
  assert(states.join(",") === MISSION_STATES.join(","), "AI mission states mismatch shared contract");
  assert(aiSchema.properties?.write_back_review?.required?.includes("visibility"), "write_back_review visibility required missing");
}

function assertHardwareManifest(manifest) {
  assert(manifest.status === "sample-loan-application-recorded", "hardware manifest status mismatch");
  assert(manifest.project_fit?.assessment === "fit", "hardware manifest project fit mismatch");
  assert(manifest.loan_terms_summary?.borrow_deadline === "2026-08-31", "hardware borrow deadline mismatch");
  const devices = Array.isArray(manifest.applied_hardware) ? manifest.applied_hardware : [];
  assert(devices.some((device) => device.product_name === "Rokid Max Pro" && device.model === "RA202" && device.quantity === 1), "Rokid Max Pro RA202 missing");
  assert(devices.some((device) => device.product_name === "Rokid Station Pro" && device.model === "RAS201" && device.quantity === 1), "Rokid Station Pro RAS201 missing");
}

function buildContractOpsStatus(hardwareManifest) {
  const devices = Array.isArray(hardwareManifest.applied_hardware) ? hardwareManifest.applied_hardware : [];
  return {
    ok: true,
    local_url: "http://localhost:5177/",
    device_bootstrap_url: "http://localhost:5177/api/device/bootstrap",
    hardware: {
      status: hardwareManifest.status,
      kit: hardwareManifest.kit_interpretation,
      borrow_deadline: hardwareManifest.loan_terms_summary?.borrow_deadline,
      fit: hardwareManifest.project_fit?.assessment,
      devices: devices.map((device) => ({
        product_name: device.product_name,
        model: device.model,
        quantity: device.quantity,
        role: device.role
      }))
    },
    packages: {
      main_package: {
        path: "innerworld-rokid-demo.zip",
        sha256: "contract-main-sha",
        exists: true
      },
      server_package: {
        path: "innerworld-space-server.zip",
        sha256: "contract-server-sha",
        exists: true
      }
    },
    release_index: {
      ok: true,
      generated_at: "2026-07-02T00:00:00.000Z",
      warnings: [],
      errors: []
    },
    deploy_dry_run: {
      ok: true,
      generated_at: "2026-07-02T00:00:01.000Z",
      zip_path: "innerworld-space-server.zip",
      zip_sha256: "contract-server-sha",
      warnings: [],
      errors: []
    }
  };
}

function assertAiHudOutput(output, aiSchema) {
  assert(MISSION_STATES.includes(output.mission_state), "AI HUD mission_state mismatch");
  assert(typeof output.display_text === "string" && output.display_text.length > 0, "AI HUD display_text missing");
  assert(output.display_text.length <= aiSchema.properties.display_text.maxLength, "AI HUD display_text too long");
  assert(["none", "weak", "strong", "answer"].includes(output.hint_level), "AI HUD hint_level mismatch");
  assert(output.write_back_review?.status, "AI HUD write_back_review status missing");
  assert(output.write_back_review?.tag === "time_capsule", "AI HUD write_back_review tag mismatch");
  assert(output.write_back_review?.visibility, "AI HUD write_back_review visibility missing");
}

function assertAiHudGenerator(space, aiSchema) {
  const state = {
    active_user: "A",
    mission_state: "doing",
    current_step_index: 1,
    completed_steps: ["read"],
    beacons: space.beacons,
    events: []
  };

  const anchorOutput = generateHudOutput({
    space,
    state,
    aiSchema,
    body: { anchor_id: "A2" }
  });
  assertAiHudOutput(anchorOutput, aiSchema);

  const writeBackOutput = generateHudOutput({
    space,
    state,
    aiSchema,
    body: {
      anchor_id: "A3",
      write_back_text: "愿后来的人在这里先看见彼此，再看见答案。"
    }
  });
  assertAiHudOutput(writeBackOutput, aiSchema);
  assert(writeBackOutput.write_back_review.status === "approved", "AI HUD write-back approval mismatch");
}

function assertBootstrapContract(space, aiSchema) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const bootstrap = buildDeviceBootstrap({
    baseUrl: "http://localhost:5177",
    profile: "rokid-ar",
    space,
    state,
    aiSchema,
    generatedAt: "2026-07-02T00:00:00.000Z"
  });

  assert(bootstrap.protocol_version === DEVICE_BOOTSTRAP_PROTOCOL, "bootstrap protocol mismatch");
  assert(bootstrap.space.space_id === INNERWORLD_SPACE_ID, "bootstrap space id mismatch");
  assert(bootstrap.anchors.length === 3, "bootstrap anchors mismatch");
  assert(bootstrap.mission.steps.length === MISSION_STEP_IDS.length, "bootstrap mission length mismatch");
  assertStoryGraphContract(bootstrap.mission.story_graph, "bootstrap mission story graph");
  assert(bootstrap.mission.story_graph.endpoints.write_back.path === `/api/spaces/${INNERWORLD_SPACE_ID}/beacons`, "bootstrap story graph write-back endpoint mismatch");
  assert(bootstrap.acceptance.completed_steps === MISSION_STEP_IDS.length, "bootstrap acceptance steps mismatch");
  assert(bootstrap.client_hints.write_back_anchor_id === "A3", "bootstrap write-back anchor mismatch");
  assert(bootstrap.unity_compat.config.base_url === "http://localhost:5177", "unity base_url mismatch");
  assertEndpointMap(bootstrap.endpoints);
}

function assertDeviceRuntimeContract(space, aiSchema) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const manifest = buildDeviceManifest({
    baseUrl: "http://localhost:5177",
    space,
    state,
    aiSchema,
    generatedAt: "2026-07-02T00:00:01.000Z"
  });

  assert(manifest.ok === true, "device manifest ok mismatch");
  assert(manifest.schema === DEVICE_RUNTIME_MANIFEST_SCHEMA, "device manifest schema mismatch");
  assert(manifest.expected_kit.devices.some((device) => device.model === "RA202"), "device manifest RA202 missing");
  assert(manifest.expected_kit.devices.some((device) => device.model === "RAS201"), "device manifest RAS201 missing");
  assert(manifest.required_capabilities.length >= 5, "device manifest required capabilities missing");
  assert(manifest.network_requirements.cache_policy === "Cache-Control: no-store", "device manifest cache policy mismatch");
  assert(manifest.runtime_persistence.authoritative_store === "SQLite data/innerworld.sqlite", "device manifest SQLite store mismatch");
  assert(manifest.runtime_persistence.dataset_api.catalog === "/api/datasets/catalog", "device manifest dataset catalog mismatch");
  assert(manifest.runtime_persistence.dataset_api.call === "/api/datasets/call", "device manifest dataset call mismatch");
  assert(manifest.pairing_contract?.schema === "innerworld-device-pairing/v1", "device manifest pairing schema mismatch");
  assert(manifest.pairing_contract?.issue_endpoint === "/api/device/pairing", "device manifest pairing endpoint mismatch");
  assert(manifest.pairing_contract?.consume_on === "/api/device/register", "device manifest pairing consume route mismatch");
  assert(manifest.pairing_contract?.required_for_hardware_acceptance === true, "device manifest pairing hardware requirement mismatch");
  assert(manifest.pairing_contract?.code_persisted === false, "device manifest pairing persistence mismatch");
  assert(manifest.pairing_contract?.operator_gate?.default_policy === "loopback_windows_host_only", "device manifest pairing operator gate default mismatch");
  assert(manifest.pairing_contract?.operator_gate?.lan_override_env === "INNERWORLD_OPERATOR_PIN", "device manifest pairing operator gate env mismatch");
  assert(manifest.pairing_contract?.operator_gate?.pin_persisted === false, "device manifest pairing operator PIN persistence mismatch");
  assert(manifest.pairing_contract?.operator_gate?.rejected_error === "device_pairing_operator_gate_failed", "device manifest pairing gate rejection mismatch");
  assert(manifest.adapter_checklist_contract?.schema === "innerworld-rokid-live-adapter-checklist/v1", "device manifest adapter checklist schema mismatch");
  assert(manifest.adapter_checklist_contract?.endpoint?.path === "/api/device/adapter-checklist", "device manifest adapter checklist endpoint mismatch");
  assert(manifest.adapter_checklist_contract?.final_direction === "real Rokid campus wall A1/A2/A3", "device manifest adapter checklist final direction mismatch");
  assert(manifest.adapter_checklist_contract?.generic_tour_or_ugc === false, "device manifest adapter checklist generic/UGC guard mismatch");
  assert(manifest.adapter_checklist_contract?.item_ids?.includes("rk_camera_rig"), "device manifest adapter checklist RKCameraRig item missing");
  assert(manifest.adapter_checklist_contract?.item_ids?.includes("a1_entry_lock"), "device manifest adapter checklist A1 item missing");
  assert(manifest.adapter_checklist_contract?.item_ids?.includes("performance_gate"), "device manifest adapter checklist performance item missing");
  assert(manifest.adapter_slots.length >= 4, "device manifest adapter slots mismatch");
  assert(manifest.sdk_binding_status?.schema === "innerworld-rokid-sdk-binding/v1", "device manifest SDK binding schema mismatch");
  assert(manifest.sdk_binding_status?.define_symbol === "ROKID_UXR", "device manifest SDK binding define mismatch");
  assert(manifest.sdk_binding_status?.live_binding_ready === false, "device manifest SDK binding should not claim live by default");
  assert(manifest.sdk_binding_status?.client_report_contract?.field === "sdk_binding_status", "device manifest SDK binding report contract missing");
  assert(manifest.sdk_binding_status?.client_report_contract?.accepted_on?.includes("/api/device/heartbeat"), "device manifest SDK heartbeat report contract missing");
  assert(manifest.sdk_binding_status?.client_report_contract?.adapter_checklist_rule?.includes("sdk_binding_status.adapter_checklist"), "device manifest SDK adapter checklist rule missing");
  assert(manifest.endpoints.device_register.method === "POST", "device manifest register endpoint mismatch");
  assert(manifest.endpoints.device_heartbeat.method === "POST", "device manifest heartbeat endpoint mismatch");
  assert(manifest.mission_snapshot.space_id === INNERWORLD_SPACE_ID, "device manifest mission snapshot mismatch");

  const runtime = createDeviceRuntimeStore();
  const capabilities = manifest.required_capabilities.map((capability) => capability.id);
  const pairing = runtime.issuePairing({
    body: { purpose: "hardware_acceptance" },
    createdAt: new Date("2026-07-02T00:00:01.000Z")
  });
  assert(pairing.ok === true, "device pairing issue ok mismatch");
  assert(pairing.schema === "innerworld-device-pairing/v1", "device pairing schema mismatch");
  assert(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(pairing.pairing_code), "device pairing code format mismatch");
  assert(pairing.code_persisted === false, "device pairing code persistence mismatch");
  assert(pairing.operator_gate?.schema === "innerworld-device-pairing-operator-gate/v1", "device pairing operator gate schema mismatch");
  assert(pairing.operator_gate?.pin_persisted === false, "device pairing operator PIN persistence mismatch");
  const register = runtime.register({
    body: {
      profile: "rokid-ar",
      device_id: "RA202 dev kit #1",
      client_version: "unity-runtime-0.1.0",
      pairing_code: pairing.pairing_code,
      serial_number: "SN-CONTRACT-SECRET",
      access_token: "real-contract-token",
      capabilities,
      sdk_binding_status: {
        schema: "innerworld-rokid-sdk-binding/v1",
        define_symbol: "ROKID_UXR",
        stage: "boundary_compiled",
        boundary_compiled: true,
        package_detected: false,
        input_binding_ready: false,
        overlay_binding_ready: false,
        live_binding_ready: false,
        candidate_assemblies: ["Assembly-CSharp", "real-contract-token", "10.0.0.18"],
        candidate_types: ["InnerWorld.Rokid.RokidUxrInputSource", "SN-CONTRACT-SECRET", "private-contract-wifi", "00:11:22:33:44:55"],
        message: "contract test boundary compiled with real-contract-token 10.0.0.18 SN-CONTRACT-SECRET private-contract-wifi 00:11:22:33:44:55"
      },
      network: {
        online: true,
        transport: "wifi",
        rtt_ms: 12,
        lan_reachable: true,
        http_cleartext_allowed: true,
        ip_address: "10.0.0.18",
        ssid: "private-contract-wifi",
        mac: "00:11:22:33:44:55"
      }
    },
    baseUrl: "http://localhost:5177",
    space,
    state,
    aiSchema,
    createdAt: new Date("2026-07-02T00:00:02.000Z")
  });

  assert(register.ok === true, "device register ok mismatch");
  assert(register.protocol_version === DEVICE_RUNTIME_SESSION_PROTOCOL, "device register protocol mismatch");
  assert(register.session_id.startsWith("iw-20260702000002-"), "device register session id mismatch");
  assert(register.device_id === "RA202-dev-kit-1", "device register device id sanitize mismatch");
  assert(register.capabilities.ok === true, "device register capabilities mismatch");
  assert(register.capabilities.missing_required.length === 0, "device register missing capabilities mismatch");
  assert(register.endpoints.heartbeat.path === "/api/device/heartbeat", "device register heartbeat endpoint mismatch");
  assert(register.mission_snapshot.space_id === INNERWORLD_SPACE_ID, "device register mission snapshot mismatch");
  assert(register.sdk_binding_status?.stage === "boundary_compiled", "device register SDK binding stage mismatch");
  assert(register.sdk_binding_status?.live_binding_ready === false, "device register SDK binding live flag mismatch");
  assert(register.pairing?.status === "operator_paired", "device register pairing mismatch");
  assert(register.hardware_acceptance_eligible === true, "device register hardware eligibility mismatch");
  const registerJson = JSON.stringify(register);
  assert(registerJson.includes(pairing.pairing_code) === false, "device register leaked pairing code");
  assert(registerJson.includes("SN-CONTRACT-SECRET") === false, "device register leaked serial");
  assert(registerJson.includes("real-contract-token") === false, "device register leaked token");
  assert(registerJson.includes("10.0.0.18") === false, "device register leaked IP");
  assert(registerJson.includes("private-contract-wifi") === false, "device register leaked SSID");
  assert(registerJson.includes("00:11:22:33:44:55") === false, "device register leaked MAC");

  const heartbeat = runtime.heartbeat({
    body: {
      session_id: register.session_id,
      device_id: register.device_id,
      battery: {
        level_percent: 82,
        charging: false,
        temperature_c: 31
      },
      network: {
        online: true,
        transport: "wifi",
        rtt_ms: 28,
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
        candidate_assemblies: ["Rokid.UXR", "real-contract-token", "10.0.0.18"],
        candidate_types: ["Rokid.UXR.InputBridge", "SN-CONTRACT-SECRET", "private-contract-wifi", "00:11:22:33:44:55"],
        message: "contract test package detected with real-contract-token 10.0.0.18 SN-CONTRACT-SECRET private-contract-wifi 00:11:22:33:44:55"
      },
      pose: {
        confidence: 0.93,
        position: { x: 0, y: 1.5, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      },
      input_frame: {
        schema: "innerworld-rokid-input-frame/v1",
        source: "rokid-uxr-rkinput-3dof",
        sequence: 12,
        timestamp_seconds: 3.25,
        delta_time_seconds: 0.016,
        command: "confirm",
        gaze_select_down: true,
        gaze_select_held: true,
        confirm_down: true,
        confirm_held: false,
        back_down: false,
        back_held: false,
        anchor_hit: true,
        focused_anchor_id: "A2",
        focused_anchor_label: "A2 private-contract-wifi real-contract-token 10.0.0.18",
        hit_distance_meters: 1.7,
        ray_origin: { x: 0.1, y: 1.6, z: 0.2 },
        ray_direction: { x: 0, y: 0, z: 1 },
        pointable_ui_focus: true,
        voice_text_present: true
      },
      active_anchor: "A2",
      current_user: "A"
    },
    baseUrl: "http://localhost:5177",
    space,
    state,
    receivedAt: new Date("2026-07-02T00:00:03.000Z")
  });

  assert(heartbeat.ok === true, "device heartbeat ok mismatch");
  assert(heartbeat.protocol_version === DEVICE_RUNTIME_SESSION_PROTOCOL, "device heartbeat protocol mismatch");
  assert(heartbeat.session_id === register.session_id, "device heartbeat session mismatch");
  assert(heartbeat.mission_snapshot.space_id === INNERWORLD_SPACE_ID, "device heartbeat mission snapshot mismatch");
  assert(heartbeat.mission_snapshot.active_anchor.anchor_id === "A2", "device heartbeat active anchor mismatch");
  assert(Array.isArray(heartbeat.pending_actions), "device heartbeat pending actions missing");
  assert(heartbeat.pending_actions.some((action) => action.action_id === "render_next_mission_step"), "device heartbeat mission action missing");
  assert(heartbeat.health.severity === "ok", "device heartbeat health severity mismatch");
  assert(heartbeat.health.input_frame_status === "received", "device heartbeat input frame status mismatch");
  assert(heartbeat.health.input_frame?.reported === true, "device heartbeat input frame summary missing");
  assert(heartbeat.health.input_frame?.source === "rokid-uxr-rkinput-3dof", "device heartbeat input frame source mismatch");
  assert(heartbeat.health.input_frame?.focused_anchor_id === "A2", "device heartbeat input frame focus mismatch");
  assert(heartbeat.health.input_frame?.ray_reported === true, "device heartbeat input frame ray summary mismatch");
  assert(heartbeat.health.input_frame?.pointable_ui_focus === true, "device heartbeat input frame PointableUI focus mismatch");
  assert(heartbeat.health.input_frame?.confirm_down === true, "device heartbeat input frame button summary mismatch");
  assert(heartbeat.sdk_binding_status?.stage === "package_detected", "device heartbeat SDK binding stage mismatch");
  assert(heartbeat.pairing?.status === "operator_paired", "device heartbeat pairing mismatch");
  assert(heartbeat.hardware_acceptance_eligible === true, "device heartbeat hardware eligibility mismatch");
  assert(heartbeat.sdk_binding_status?.live_binding_ready === false, "device heartbeat SDK binding live flag mismatch");
  assert(heartbeat.pending_actions.some((action) => action.action_id === "bind_rokid_sdk_live_adapter"), "device heartbeat SDK binding pending action missing");
  assert(heartbeat.next_poll_ms > 0, "device heartbeat next poll mismatch");
  assert(JSON.stringify(heartbeat).includes("10.0.0.18") === false, "device heartbeat leaked IP");
  assert(JSON.stringify(heartbeat).includes(pairing.pairing_code) === false, "device heartbeat leaked pairing code");
  assert(JSON.stringify(heartbeat).includes("real-contract-token") === false, "device heartbeat leaked token");
  assert(JSON.stringify(heartbeat).includes("SN-CONTRACT-SECRET") === false, "device heartbeat leaked serial");
  assert(JSON.stringify(heartbeat).includes("private-contract-wifi") === false, "device heartbeat leaked SSID");
  assert(JSON.stringify(heartbeat).includes("00:11:22:33:44:55") === false, "device heartbeat leaked MAC");
  assert(JSON.stringify(heartbeat).includes("ray_origin") === false, "device heartbeat leaked raw ray origin");
  assert(JSON.stringify(heartbeat).includes("ray_direction") === false, "device heartbeat leaked raw ray direction");

  const sessions = runtime.sessionsSummary();
  assert(sessions.ok === true, "device sessions ok mismatch");
  assert(sessions.total === 1, "device sessions total mismatch");
  assert(sessions.sessions[0].session_id === register.session_id, "device sessions session mismatch");
  assert(sessions.sessions[0].heartbeat_count === 1, "device sessions heartbeat count mismatch");
  assert(sessions.sessions[0].pairing_status === "operator_paired", "device sessions pairing mismatch");
  assert(sessions.sessions[0].hardware_acceptance_eligible === true, "device sessions hardware eligibility mismatch");
  assert(sessions.pairing?.paired_sessions === 1, "device sessions pairing summary mismatch");
  assert(sessions.smoke_test_summary?.checks?.has_operator_paired_session === true, "device sessions smoke pairing mismatch");
  assert(sessions.sdk_binding?.package_detected_sessions === 1, "device sessions SDK package summary mismatch");
  assert(sessions.sdk_binding?.live_bound_sessions === 0, "device sessions SDK live summary mismatch");
  assert(sessions.sessions[0].sdk_binding_status?.stage === "package_detected", "device sessions SDK binding status mismatch");
  assert(sessions.sessions[0].input_frame?.reported === true, "device sessions input frame summary missing");
  assert(sessions.sessions[0].input_frame?.focused_anchor_id === "A2", "device sessions input frame focus mismatch");
  assert(sessions.sessions[0].input_frame?.ray_reported === true, "device sessions input frame ray summary mismatch");
  assert(sessions.sessions[0].input_frame?.pointable_ui_focus === true, "device sessions input frame PointableUI focus mismatch");
  assert(JSON.stringify(sessions).includes("10.0.0.18") === false, "device sessions leaked IP");
  assert(JSON.stringify(sessions).includes("real-contract-token") === false, "device sessions leaked token");
  assert(JSON.stringify(sessions).includes("SN-CONTRACT-SECRET") === false, "device sessions leaked serial");
  assert(JSON.stringify(sessions).includes("private-contract-wifi") === false, "device sessions leaked SSID");
  assert(JSON.stringify(sessions).includes("00:11:22:33:44:55") === false, "device sessions leaked MAC");
  assert(JSON.stringify(sessions).includes("ray_origin") === false, "device sessions leaked raw ray origin");
  assert(JSON.stringify(sessions).includes("ray_direction") === false, "device sessions leaked raw ray direction");

  const unknownHeartbeat = runtime.heartbeat({
    body: {
      session_id: "missing",
      device_id: register.device_id
    },
    baseUrl: "http://localhost:5177",
    space,
    state
  });
  assert(unknownHeartbeat.status === 404, "device unknown heartbeat status mismatch");
}

function assertEvidenceChainContract(space, aiSchema, hardwareManifest) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const evidence = buildEvidenceChain({
    baseUrl: "http://localhost:5177",
    space,
    state,
    aiSchema,
    opsStatus: buildContractOpsStatus(hardwareManifest),
    generatedAt: "2026-07-02T00:00:02.000Z"
  });

  assert(evidence.ok === true, "evidence chain ok mismatch");
  assert(evidence.schema === EVIDENCE_CHAIN_SCHEMA, "evidence chain schema mismatch");
  assert(evidence.space.space_id === INNERWORLD_SPACE_ID, "evidence chain space mismatch");
  assert(Array.isArray(evidence.anchors) && evidence.anchors.length === 3, "evidence chain anchors mismatch");
  assert(evidence.beacons.total === 2, "evidence chain beacon count mismatch");
  assert(evidence.writeback.ready === true, "evidence chain writeback readiness mismatch");
  assert(evidence.ai.schema_endpoint.path === "/api/ai/schema", "evidence chain AI schema endpoint mismatch");
  assert(evidence.ai.prompt_endpoint.path === "/api/ai/prompt", "evidence chain AI prompt endpoint mismatch");
  assert(evidence.hardware.fit === "fit", "evidence chain hardware fit mismatch");
  assert(evidence.hardware.devices.length === 2, "evidence chain hardware devices mismatch");
  assert(evidence.release.status === "dry_run_verified", "evidence chain release status mismatch");
  assert(evidence.release.packages.server_package.file === "innerworld-space-server.zip", "evidence chain package filename mismatch");
  assert(Array.isArray(evidence.evidence_items) && evidence.evidence_items.length >= 6, "evidence chain items missing");
  assert(evidence.evidence_items.some((item) => item.id === "writeback_loop"), "evidence chain writeback item missing");
  assert(JSON.stringify(evidence.hardware).includes(hardwareManifest.source?.path) === false, "evidence chain leaked source path");
}

function assertSessionPlanContract(space, aiSchema) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const plan = buildSessionPlan({
    baseUrl: "http://localhost:5177",
    space,
    state,
    aiSchema,
    generatedAt: "2026-07-02T00:00:03.000Z"
  });

  assert(plan.ok === true, "session plan ok mismatch");
  assert(plan.schema === SESSION_PLAN_SCHEMA, "session plan schema mismatch");
  assert(plan.space.space_id === INNERWORLD_SPACE_ID, "session plan space mismatch");
  assert(plan.space.stage_order.join(",") === FIELD_SESSION_STAGE_IDS.join(","), "session plan stage order mismatch");
  assert(plan.stages.map((stage) => stage.stage_id).join(",") === FIELD_SESSION_STAGE_IDS.join(","), "session plan stages mismatch");
  assert(plan.stages.length === 5, "session plan stage count mismatch");
  assert(plan.stages.find((stage) => stage.stage_id === "handoff")?.anchor_id === "A3", "session plan handoff anchor must use A3 write-back");
  assert(plan.space.story_graph_contract_id === STORY_GRAPH_MISSION_RUNTIME_ID, "session plan story graph id mismatch");
  assert(plan.space.story_node_order.join(",") === STORY_GRAPH_NODE_IDS.join(","), "session plan story node order mismatch");
  assertStoryGraphContract(plan.story_graph, "session plan story graph");
  assert(plan.story_graph.runtime.current_node_id === "a2_memory", "session plan story graph current node mismatch");
  assert(plan.story_graph.endpoints.ai_hud.path === "/api/ai/hud", "session plan story graph AI HUD endpoint mismatch");
  assert(plan.endpoints.evidence_chain.path === "/api/evidence/chain", "session plan evidence endpoint mismatch");
  assert(plan.endpoints.write_back.method === "POST", "session plan writeback endpoint method mismatch");
  assert(plan.operator_prompts.length === 5, "session plan operator prompts mismatch");
  assert(plan.device_handoff_notes.length === 5, "session plan device handoff notes mismatch");
  assert(plan.acceptance_checks.some((check) => check.id === "user_b_visibility"), "session plan User B check missing");
  assert(plan.fallback_actions.some((action) => action.id === "fallback_localhost"), "session plan fallback missing");
  assert(plan.target.guardrails.includes("not a PPT"), "session plan guardrail missing");
}

function assertWallCalibrationContract(space) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const manifest = buildWallCalibrationManifest({
    baseUrl: "http://localhost:5177",
    space,
    state,
    generatedAt: "2026-07-02T00:00:04.000Z"
  });

  assert(manifest.ok === true, "wall calibration ok mismatch");
  assert(manifest.schema === WALL_CALIBRATION_SCHEMA, "wall calibration schema mismatch");
  assert(manifest.space_id === INNERWORLD_SPACE_ID, "wall calibration space mismatch");
  assert(manifest.wall.coordinate_system === "innerworld-wall-local/v1", "wall calibration coordinate system mismatch");
  assert(manifest.wall.origin_anchor_id === "A2", "wall calibration origin anchor mismatch");
  assert(manifest.wall.dimensions.width_m > 0, "wall calibration width missing");
  assert(manifest.wall.dimensions.height_m > 0, "wall calibration height missing");
  assert(manifest.anchors.length === 3, "wall calibration anchor count mismatch");
  assert(manifest.anchors.map((anchor) => anchor.anchor_id).join(",") === "A1,A2,A3", "wall calibration anchor ids mismatch");
  assert(manifest.anchors.every((anchor) => anchor.expected_pose?.position), "wall calibration expected pose missing");
  assert(manifest.anchors.some((anchor) => anchor.marker?.marker_type === "qr_poster"), "wall calibration QR marker missing");
  assert(manifest.observation_endpoint.method === "POST", "wall calibration observation endpoint method mismatch");
  assert(manifest.observation_endpoint.schema === WALL_CALIBRATION_OBSERVATION_SCHEMA, "wall calibration observation schema mismatch");
  assert(manifest.procedure.length >= 5, "wall calibration procedure missing");

  const accepted = createWallCalibrationObservation({
    space,
    receivedAt: "2026-07-02T00:00:05.000Z",
    body: {
      session_id: "iw-contract-token-secret-10.0.0.18",
      device_id: "SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55",
      anchor_id: "A2",
      tracking_mode: "image_tracking",
      observed_pose: {
        position: { x: 0, y: 1.5, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      },
      confidence: 0.96,
      notes: "contract calibration token real-token-secret 10.0.0.18 SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55"
    }
  });
  assert(accepted.schema === WALL_CALIBRATION_OBSERVATION_SCHEMA, "wall calibration observation schema mismatch");
  assert(accepted.status === "accepted", "wall calibration accepted observation mismatch");
  assert(accepted.anchor_id === "A2", "wall calibration observation anchor mismatch");
  assert(accepted.position_error_m === 0, "wall calibration position error mismatch");
  const acceptedText = JSON.stringify(accepted);
  assert(!acceptedText.includes("10.0.0.18"), "wall calibration observation leaked IP");
  assert(!acceptedText.includes("real-token-secret"), "wall calibration observation leaked token");
  assert(!acceptedText.includes("SN-ABC-SECRET"), "wall calibration observation leaked serial");
  assert(!acceptedText.includes("private-demo-wifi"), "wall calibration observation leaked SSID");
  assert(!acceptedText.includes("00:11:22:33:44:55"), "wall calibration observation leaked MAC");

  const rejected = createWallCalibrationObservation({
    space,
    receivedAt: "2026-07-02T00:00:06.000Z",
    body: {
      anchor_id: "A3",
      tracking_mode: "slam",
      observed_pose: { position: { x: 9, y: 9, z: 9 } },
      confidence: 0.2,
      access_token: "should-not-matter"
    }
  });
  assert(rejected.status === "rejected", "wall calibration rejected observation mismatch");
  assert(rejected.issues.includes("confidence_below_threshold"), "wall calibration confidence issue missing");
}

function assertFieldMarkerContract(space, markerConfig) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const wallCalibration = buildWallCalibrationManifest({
    baseUrl: "http://localhost:5177",
    space,
    state,
    generatedAt: "2026-07-02T00:00:07.000Z"
  });
  const manifest = buildFieldMarkerManifest({
    baseUrl: "http://localhost:5177",
    space,
    markerConfig,
    wallCalibration,
    generatedAt: "2026-07-02T00:00:08.000Z"
  });

  assert(markerConfig.schema === FIELD_MARKER_SCHEMA, "field marker config schema mismatch");
  assert(manifest.ok === true, "field marker manifest ok mismatch");
  assert(manifest.schema === FIELD_MARKER_SCHEMA, "field marker schema mismatch");
  assert(manifest.space_id === INNERWORLD_SPACE_ID, "field marker space mismatch");
  assert(manifest.source_of_truth.runtime_manifest === "/api/calibration/wall", "field marker runtime source mismatch");
  assert(manifest.calibration_manifest.endpoint === "/api/calibration/wall", "field marker calibration endpoint mismatch");
  assert(manifest.calibration_manifest.observation_endpoint?.path === "/api/calibration/observations", "field marker observation endpoint mismatch");
  assert(Array.isArray(manifest.markers) && manifest.markers.length === 3, "field marker count mismatch");
  assert(manifest.markers.map((marker) => marker.anchor_id).join(",") === "A1,A2,A3", "field marker anchor order mismatch");
  assert(manifest.markers.map((marker) => marker.marker.marker_id).join(",") === "A1:qr-entry,A2:image-target,A3:image-target", "field marker ids mismatch");
  assert(manifest.markers.some((marker) => marker.anchor_id === "A1" && marker.marker.marker_type === "qr_poster"), "field marker A1 QR mismatch");
  assert(manifest.markers.every((marker) => marker.expected_pose?.position), "field marker expected pose missing");
  assert(manifest.markers.every((marker) => Array.isArray(marker.tracking_modes) && marker.tracking_modes.length >= 3), "field marker tracking modes missing");
  assert(manifest.markers.every((marker) => marker.print?.payload_url?.startsWith("http://localhost:5177")), "field marker payload URL mismatch");
  assert(manifest.markers.every((marker) => marker.field_role?.operator_action), "field marker operator action missing");
  assert(manifest.acceptance.required_runtime_fields?.includes("latest_observation"), "field marker runtime acceptance missing");
  const text = JSON.stringify(manifest);
  assert(text.includes("A1:qr-entry"), "field marker A1 token missing");
  assert(text.includes("A2:image-target"), "field marker A2 token missing");
  assert(text.includes("A3:image-target"), "field marker A3 token missing");
  assert(!text.includes("sk-"), "field marker manifest leaked key-looking token");
}

function assertStateMachine(space) {
  const state = {
    active_user: "A",
    mission_state: "doing",
    current_step_index: 0,
    completed_steps: ["read", "find_year", "service_action", "write_back"],
    beacons: [...space.beacons, { beacon_id: "B_TEST", anchor_id: "A3" }]
  };
  normalizeMissionState(space, state);
  assert(state.mission_state === "complete", "normalizeMissionState did not complete write_back state");
  assert(state.current_step_index === MISSION_STEP_IDS.length - 1, "normalizeMissionState current_step_index mismatch");

  const status = buildDemoStatus(space, state);
  assert(status.demo_ready === true, "demo_ready false");
  assert(status.completed_step_count === MISSION_STEP_IDS.length, "completed_step_count mismatch");
  assert(status.beacon_count === 3, "beacon_count mismatch");

  const flowState = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: [...space.beacons],
    events: []
  };
  applyInteraction({ state: flowState, space, body: { user_id: "A", step_id: "read", mission_state: "reading" }, createdAt: "2026-07-02T00:00:00.000Z" });
  applyInteraction({ state: flowState, space, body: { user_id: "A", step_id: "find_year", mission_state: "doing" }, createdAt: "2026-07-02T00:00:01.000Z" });
  applyServiceAction({ state: flowState, space, body: { user_id: "A", action_id: "JOIN_EVENT_1430", label: "join" }, createdAt: "2026-07-02T00:00:02.000Z" });
  const beacon = applyWriteBack({ state: flowState, space, body: { user_id: "A", anchor_id: "A3", title: "test" }, text: "hello from contract", createdAt: "2026-07-02T00:00:03.000Z" });
  normalizeMissionState(space, flowState);

  assert(beacon.anchor_id === "A3", "write-back beacon anchor mismatch");
  assert(flowState.mission_state === "complete", "domain flow did not complete mission");
  assert(flowState.completed_steps.join(",") === MISSION_STEP_IDS.join(","), "domain flow completed steps mismatch");
  assert(flowState.beacons.length === 3, "domain flow beacon count mismatch");
  assert(flowState.events.length === 4, "domain flow event count mismatch");

  const graphRuntime = storyGraphMissionRuntimeV2Status({ space, state: flowState });
  assert(graphRuntime.contract_id === STORY_GRAPH_MISSION_RUNTIME_ID, "mission graph runtime id mismatch");
  assert(graphRuntime.node_status.map((node) => node.node_id).join(",") === STORY_GRAPH_NODE_IDS.join(","), "mission graph runtime node order mismatch");
  assert(graphRuntime.node_status.every((node) => node.status === "complete"), "mission graph runtime did not complete first slice");
  assert(graphRuntime.current_node_id === "user_b_readback", "mission graph runtime current node mismatch");

  const sharedGraphRuntime = buildStoryGraphMissionRuntimeContract({
    baseUrl: "http://localhost:5177",
    space,
    state: flowState
  });
  assertStoryGraphContract(sharedGraphRuntime, "shared story graph runtime");
  assert(sharedGraphRuntime.runtime.node_status.every((node) => node.status === "complete"), "shared story graph runtime did not complete first slice");
}

async function assertUnityProtocolSkeleton() {
  if (!requireUnityProtocol) {
    return "not_required";
  }

  const [controller, client, dtos, payloads, runtimeConfig] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceApiClient.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolDtos.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolPayloads.cs"),
    readText("apps/unity-shell/Assets/Scripts/Runtime/InnerWorldRuntimeConfig.cs")
  ]);

  assert(controller.includes("using InnerWorld.Rokid.Protocol;"), "Unity controller protocol namespace missing");
  assert(controller.includes("private SpaceApiClient apiClient;"), "Unity controller SpaceApiClient field missing");
  assert(controller.includes("private DeviceBootstrapResponse bootstrap;"), "Unity controller bootstrap response field missing");
  assert(controller.includes("private DeviceRuntimeSessionResponse deviceSession;"), "Unity controller device session field missing");
  assert(controller.includes("private EditorRokidInputSource editorRokidInputSource;"), "Unity controller Rokid input source missing");
  assert(controller.includes("private RokidAdapterBoundaryStatus rokidAdapterStatus;"), "Unity controller adapter boundary status missing");
  assert(controller.includes("private IRokidInputStateSink rokidInputStateSink;"), "Unity controller input state sink missing");
  assert(controller.includes("RokidAdapterResolver.Resolve(presentationStrategy)"), "Unity controller adapter resolver missing");
  assert(controller.includes("RokidSdkBindingProbe.Detect().BoundaryCompiled"), "Unity controller SDK binding probe environment check missing");
  assert(controller.includes("apiClient.BootstrapUrl"), "Unity controller bootstrap URL not using client");
  assert(controller.includes("apiClient.SpaceUrl"), "Unity controller space URL not using client");
  assert(controller.includes("apiClient.InteractionsUrl"), "Unity controller interactions URL not using client");
  assert(controller.includes("apiClient.ServiceActionsUrl"), "Unity controller service URL not using client");
  assert(controller.includes("apiClient.WriteBackUrl"), "Unity controller write-back URL not using client");
  assert(controller.includes("apiClient.DeviceRegisterUrl"), "Unity controller device register URL not using client");
  assert(controller.includes("apiClient.DeviceHeartbeatUrl"), "Unity controller device heartbeat URL not using client");
  assert(controller.includes("RegisterDeviceSession"), "Unity controller device register coroutine missing");
  assert(controller.includes("PostDeviceHeartbeat"), "Unity controller device heartbeat coroutine missing");
  assert(controller.includes("pendingTrustedTargetObservations") && controller.includes("QueuePendingTrustedTargetObservation") && controller.includes("TryFlushPendingTrustedTargetObservations"), "Unity trusted target rescan queue missing");
  assert(controller.includes("ServerAckedLiveBindingReady") && controller.includes("server_live_binding_heartbeat_ack_missing") && controller.includes("lastDeviceHeartbeat.session_id"), "Unity trusted target gate must require same-session live heartbeat ack");
  assert(controller.includes("lastDeviceHeartbeat.hardware_acceptance_eligible") && controller.includes("lastDeviceHeartbeat.pairing.paired"), "Unity trusted target gate must require heartbeat pairing/hardware eligibility ack");
  assert(/\[NonSerialized\]\s+public string operatorPairingCode/.test(controller), "Unity controller pairing code must be non-serialized runtime memory");
  assert(controller.includes("INNERWORLD_OPERATOR_PAIRING_CODE") && controller.includes("--innerworld-pairing-code"), "Unity controller pairing runtime injection missing");
  assert(/private DeviceRegisterRequest BuildDeviceRegisterRequest\(\)[\s\S]*pairing_code\s*=\s*CleanOperatorPairingCode\(\)/.test(controller), "Unity controller does not submit cleaned pairing_code");
  assert(controller.includes("devicePairingLine") && controller.includes("PairingHudBadge"), "Unity controller pairing status HUD missing");
  assert(controller.includes("BuildSdkBindingStatusPayload"), "Unity controller SDK binding payload missing");
  assert(controller.includes("RequiredDeviceCapabilities"), "Unity controller device capabilities missing");
  assert(controller.includes("InnerWorldRuntimeConfig.FromCurrentProcess"), "Unity controller runtime config load missing");
  assert(runtimeConfig.includes("INNERWORLD_DEVICE_PROFILE"), "Unity runtime config device profile env override missing");
  assert(runtimeConfig.includes("--innerworld-profile"), "Unity runtime config command-line profile override missing");

  assert(client.includes("namespace InnerWorld.Rokid.Protocol"), "Unity protocol namespace missing");
  assert(client.includes("DefaultSpaceId = \"innerworld_campus_wall\""), "Unity default space id mismatch");
  assert(client.includes("DefaultDeviceProfile = \"rokid-ar\""), "Unity default device profile mismatch");
  assert(client.includes("BuildBootstrapUrl"), "Unity bootstrap URL builder missing");
  assert(client.includes("/api/device/bootstrap"), "Unity bootstrap route missing");
  assert(client.includes("DeviceRegisterUrl"), "Unity device register URL property missing");
  assert(client.includes("BuildDevicePairingUrl"), "Unity device pairing URL builder missing");
  assert(client.includes("DeviceHeartbeatUrl"), "Unity device heartbeat URL property missing");
  assert(client.includes("WallCalibrationUrl"), "Unity wall calibration URL property missing");
  assert(client.includes("WallCalibrationObservationsUrl"), "Unity wall calibration observations URL property missing");
  assert(client.includes("BuildWallCalibrationUrl"), "Unity wall calibration URL builder missing");
  assert(client.includes("BuildWallCalibrationObservationsUrl"), "Unity wall calibration observations URL builder missing");
  assert(client.includes("BuildServiceActionAckUrl"), "Unity service action ack URL builder missing");
  assert(client.includes("AiHudUrl"), "Unity AI HUD URL property missing");
  assert(client.includes("/api/ai/hud"), "Unity AI HUD route missing");
  assert(client.includes("LedgerEventsUrl"), "Unity ledger events URL property missing");
  assert(client.includes("LedgerSummaryUrl"), "Unity ledger summary URL property missing");
  assert(client.includes("/api/ledger/events"), "Unity ledger events route missing");
  assert(client.includes("/api/ledger/summary"), "Unity ledger summary route missing");
  assert(client.includes("/api/pins/nearby?radius=20"), "Unity nearby route missing");
  assert(client.includes("ai_hud = Endpoint(cleanBaseUrl, \"POST\", \"/api/ai/hud\")"), "Unity ai_hud endpoint mismatch");
  assert(client.includes("ledger_events = Endpoint(cleanBaseUrl, \"GET\", \"/api/ledger/events\")"), "Unity ledger events endpoint mismatch");
  assert(client.includes("ledger_summary = Endpoint(cleanBaseUrl, \"GET\", \"/api/ledger/summary\")"), "Unity ledger summary endpoint mismatch");
  assert(client.includes("service_actions = Endpoint(cleanBaseUrl, \"POST\", \"/api/service-actions\")"), "Unity service_actions endpoint mismatch");
  assert(client.includes("service_actions_outbox = Endpoint(cleanBaseUrl, \"GET\", \"/api/service-actions/outbox\")"), "Unity service_actions_outbox endpoint mismatch");
  assert(client.includes("device_heartbeat = Endpoint(cleanBaseUrl, \"POST\", \"/api/device/heartbeat\")"), "Unity device heartbeat endpoint mismatch");
  assert(client.includes("device_pairing = Endpoint(cleanBaseUrl, \"POST\", \"/api/device/pairing\")"), "Unity device pairing endpoint mismatch");
  assert(client.includes("wall_calibration = Endpoint(cleanBaseUrl, \"GET\", \"/api/calibration/wall\")"), "Unity wall calibration endpoint mismatch");
  assert(client.includes("wall_calibration_observations = Endpoint(cleanBaseUrl, \"POST\", \"/api/calibration/observations\")"), "Unity wall calibration observations endpoint mismatch");
  assert(client.includes("write_back = Endpoint(cleanBaseUrl, \"POST\", writeBackPath)"), "Unity write_back endpoint mismatch");

  assert(dtos.includes("public sealed class DeviceBootstrapResponse"), "Unity DeviceBootstrapResponse DTO missing");
  assert(dtos.includes("public sealed class DeviceRuntimeSessionResponse"), "Unity device register response DTO missing");
  assert(dtos.includes("public sealed class DeviceHeartbeatResponse"), "Unity device heartbeat response DTO missing");
  assert(dtos.includes("public DevicePairingState pairing;") && dtos.includes("public bool hardware_acceptance_eligible;"), "Unity device heartbeat pairing/hardware eligibility DTO missing");
  assert(dtos.includes("public sealed class DeviceHealthStatus"), "Unity device health response DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationManifest"), "Unity wall calibration manifest DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationAnchor"), "Unity wall calibration anchor DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationObservationResult"), "Unity wall calibration result DTO missing");
  assert(dtos.includes("public bool hardware_observation_trusted;"), "Unity wall calibration trusted hardware observation DTO missing");
  assert(dtos.includes("public WallCalibrationHardwareSession hardware_session;"), "Unity wall calibration hardware session DTO missing");
  assert(dtos.includes("public SpaceApiEndpoint wall_calibration;"), "Unity wall calibration endpoint DTO missing");
  assert(dtos.includes("public SpaceApiEndpoint wall_calibration_observations;"), "Unity wall calibration observations endpoint DTO missing");
  assert(dtos.includes("public SpaceEndpointMap endpoints;"), "Unity endpoint map DTO missing");
  assert(dtos.includes("public SpaceApiEndpoint ai_hud;"), "Unity AI HUD endpoint DTO missing");
  assert(dtos.includes("public SpaceApiEndpoint ledger_events;"), "Unity ledger events endpoint DTO missing");
  assert(dtos.includes("public SpaceApiEndpoint ledger_summary;"), "Unity ledger summary endpoint DTO missing");
  assert(dtos.includes("public sealed class LedgerEventsResponse"), "Unity ledger events response DTO missing");
  assert(dtos.includes("public sealed class LedgerSummaryResponse"), "Unity ledger summary response DTO missing");
  assert(dtos.includes("public ClientHints client_hints;"), "Unity client hints DTO missing");
  assert(dtos.includes("public UnityCompat unity_compat;"), "Unity compatibility DTO missing");
  assert(payloads.includes("public sealed class AiHudRequest"), "Unity AI HUD request missing");
  assert(payloads.includes("public sealed class AiHudResponse"), "Unity AI HUD response missing");
  assert(payloads.includes("public sealed class InteractionRequest"), "Unity interaction request missing");
  assert(payloads.includes("public sealed class ServiceActionRequest"), "Unity service action request missing");
  assert(payloads.includes("public sealed class WriteBackRequest"), "Unity write-back request missing");
  assert(payloads.includes("public sealed class DeviceRegisterRequest"), "Unity device register request missing");
  assert(payloads.includes("public string pairing_code;"), "Unity device register pairing_code missing");
  assert(payloads.includes("public sealed class DeviceHeartbeatRequest"), "Unity device heartbeat request missing");
  assert(/public sealed class InteractionRequest[\s\S]*public string session_id;[\s\S]*public string device_id;[\s\S]*public string anchor_id;/.test(payloads), "Unity interaction trusted provenance fields missing");
  assert(/public sealed class ServiceActionRequest[\s\S]*public string session_id;[\s\S]*public string device_id;/.test(payloads), "Unity service action trusted provenance fields missing");
  assert(/public sealed class WriteBackRequest[\s\S]*public string session_id;[\s\S]*public string device_id;/.test(payloads), "Unity write-back trusted provenance fields missing");
  assert(payloads.includes("public DeviceInputFramePayload input_frame;"), "Unity device heartbeat input_frame missing");
  assert(payloads.includes("public sealed class DeviceInputFramePayload"), "Unity device input frame payload missing");
  assert(payloads.includes("public DeviceVector3 ray_origin;") && payloads.includes("public DeviceVector3 ray_direction;"), "Unity device input frame ray payload missing");
  assert(payloads.includes("public bool pointable_ui_focus;"), "Unity device input frame PointableUI focus payload missing");
  assert(payloads.includes("public sealed class WallCalibrationObservationPayload"), "Unity wall calibration observation payload missing");
  assert(payloads.includes("public sealed class RokidSdkBindingStatusPayload"), "Unity SDK binding status payload missing");
  return "verified";
}

async function assertRokidSimulatorSkeleton() {
  if (!requireUnityProtocol) {
    return "not_required";
  }

  const [models, poseProvider, overlayRenderer, simulatorState, editorInput, bindingProbe, boundaryStatus, resolver, fallbackOverlay, uxrInput, uxrOverlay] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidInputModels.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidPoseProvider.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidOverlayRenderer.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidDeviceSimulatorState.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/EditorRokidInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidSdkBindingProbe.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidAdapterBoundaryStatus.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidAdapterResolver.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/FallbackRokidOverlayRenderer.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidUxrInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidUxrOverlayRenderer.cs")
  ]);

  assert(models.includes("namespace InnerWorld.Rokid"), "Rokid input models namespace missing");
  assert(models.includes("public struct RokidInputFrame"), "RokidInputFrame model missing");
  assert(models.includes("public struct RokidConnectionInfo"), "RokidConnectionInfo model missing");
  assert(poseProvider.includes("interface IRokidPoseProvider"), "IRokidPoseProvider missing");
  assert(poseProvider.includes("interface IRokidInputSource"), "IRokidInputSource missing");
  assert(poseProvider.includes("interface IRokidInputStateSink"), "IRokidInputStateSink missing");
  assert(overlayRenderer.includes("interface IRokidOverlayRenderer"), "IRokidOverlayRenderer missing");
  assert(simulatorState.includes("public sealed class RokidDeviceSimulatorState"), "RokidDeviceSimulatorState missing");
  assert(editorInput.includes("public sealed class EditorRokidInputSource : IRokidInputSource, IRokidInputStateSink"), "EditorRokidInputSource state sink missing");
  assert(editorInput.includes("EnqueueVoiceText"), "Editor voice text injection missing");
  assert(editorInput.includes("SetAnchorTarget"), "Editor anchor target setter missing");
  assert(editorInput.includes("SetGazeAnchorHit"), "Editor gaze anchor hit sink missing");
  assert(bindingProbe.includes("innerworld-rokid-sdk-binding/v1"), "Rokid SDK binding schema missing");
  assert(bindingProbe.includes("public enum RokidSdkBindingStage"), "Rokid SDK binding stage enum missing");
  assert(bindingProbe.includes("RokidSdkBindingProbe"), "Rokid SDK binding probe missing");
  assert(bindingProbe.includes("AppDomain.CurrentDomain.GetAssemblies"), "Rokid SDK assembly scan missing");
  assert(bindingProbe.includes("LiveBindingReady"), "Rokid SDK live binding readiness missing");
  assert(boundaryStatus.includes("public const string DefineSymbol = \"ROKID_UXR\""), "ROKID_UXR define marker missing");
  assert(boundaryStatus.includes("#if ROKID_UXR"), "ROKID_UXR compile guard missing");
  assert(boundaryStatus.includes("RokidSdkBindingReport"), "Rokid adapter SDK binding report missing");
  assert(boundaryStatus.includes("IsSdkLiveBindingReady"), "Rokid adapter SDK live flag missing");
  assert(boundaryStatus.includes("public struct RokidAdapterBoundaryStatus"), "Rokid adapter boundary status missing");
  assert(boundaryStatus.includes("public sealed class RokidAdapterResolution"), "Rokid adapter resolution missing");
  assert(resolver.includes("public static class RokidAdapterResolver"), "Rokid adapter resolver missing");
  assert(resolver.includes("#if ROKID_UXR"), "Rokid adapter resolver compile guard missing");
  assert(resolver.includes("RokidSdkBindingProbe.Detect()"), "Rokid adapter resolver SDK binding probe missing");
  assert(resolver.includes("new RokidUxrInputSource"), "Rokid UXR input adapter factory missing");
  assert(resolver.includes("new RokidUxrOverlayRenderer"), "Rokid UXR overlay adapter factory missing");
  assert(resolver.includes("new EditorRokidInputSource"), "Rokid editor fallback factory missing");
  assert(resolver.includes("new FallbackRokidOverlayRenderer"), "Rokid overlay fallback factory missing");
  assert(fallbackOverlay.includes("public sealed class FallbackRokidOverlayRenderer : IRokidOverlayRenderer"), "fallback overlay renderer missing");
  assert(uxrInput.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR input file must be fully guarded");
  assert(uxrInput.includes("public sealed class RokidUxrInputSource : IRokidInputSource, IRokidInputStateSink"), "Rokid UXR input state sink missing");
  assert(uxrInput.includes("using Rokid.UXR.Module;"), "Rokid UXR input must bind the official SDK namespace");
  assert(uxrInput.includes("RKNativeInput"), "Rokid UXR input must bind RKNativeInput");
  assert(uxrInput.includes("rokid-uxr-rkinput-3dof"), "Rokid UXR input live adapter name missing");
  assert(uxrInput.includes("public bool IsSdkBindingReady"), "Rokid UXR input SDK readiness flag missing");
  assert(uxrInput.includes("KEY_OK") && uxrInput.includes("KEY_BACK") && uxrInput.includes("KEY_MOUSE_FIRST"), "Rokid UXR input key mapping missing");
  assert(uxrOverlay.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR overlay file must be fully guarded");
  assert(uxrOverlay.includes("public sealed class RokidUxrOverlayRenderer : IRokidOverlayRenderer"), "Rokid UXR overlay renderer missing");
  assert(uxrOverlay.includes("rokid-uxr-worldspace-overlay"), "Rokid UXR overlay live adapter name missing");
  assert(uxrOverlay.includes("public bool IsSdkBindingReady"), "Rokid UXR overlay SDK readiness flag missing");
  return "verified";
}

async function assertServerCoreSkeleton() {
  const [index, apiRouter, response, staticFiles, opsStatus, deviceRuntime, sqliteStore, wallCalibration] = await Promise.all([
    readText("server/space-server/index.js"),
    readText("server/space-server/src/http/api-router.js"),
    readText("server/space-server/src/http/response.js"),
    readText("server/space-server/src/http/static-files.js"),
    readText("server/space-server/src/ops/status-service.js"),
    readText("server/space-server/src/domain/device-runtime.js"),
    readText("server/space-server/src/store/sqlite-store.js"),
    readText("server/space-server/src/domain/wall-calibration.js")
  ]);

  assert(index.includes("createApiRouter"), "server index does not use api router module");
  assert(index.includes("createStaticFileServer"), "server index does not use static file module");
  assert(index.includes("createOpsStatusService"), "server index does not use ops status service");
  assert(apiRouter.includes("export function createApiRouter"), "api router factory missing");
  assert(apiRouter.includes("/api/device/bootstrap"), "api router bootstrap route missing");
  assert(apiRouter.includes("/api/device/manifest"), "api router device manifest route missing");
  assert(apiRouter.includes("/api/device/adapter-checklist"), "api router device adapter checklist route missing");
  assert(apiRouter.includes("/api/store/status"), "api router store status route missing");
  assert(apiRouter.includes("/api/datasets/catalog"), "api router dataset catalog route missing");
  assert(apiRouter.includes("/api/datasets/call"), "api router dataset call route missing");
  assert(apiRouter.includes("/api/ledger/summary"), "api router ledger summary route missing");
  assert(apiRouter.includes("/api/ledger/events"), "api router ledger events route missing");
  assert(apiRouter.includes("/api/device/register"), "api router device register route missing");
  assert(deviceRuntime.includes("buildRokidLiveAdapterChecklist"), "device runtime adapter checklist builder missing");
  assert(deviceRuntime.includes("innerworld-rokid-live-adapter-checklist/v1"), "device runtime adapter checklist schema missing");
  assert(deviceRuntime.includes("a1_entry_lock") && deviceRuntime.includes("performance_gate"), "device runtime adapter checklist item coverage missing");
  assert(deviceRuntime.includes("sanitizeInputFrame"), "device runtime input frame sanitizer missing");
  assert(deviceRuntime.includes("summarizeInputFrame"), "device runtime input frame summary missing");
  assert(deviceRuntime.includes("input_frame_ray_focus"), "device runtime RKInput ray/focus checklist check missing");
  assert(deviceRuntime.includes("resolveTrustedMissionProvenance"), "device runtime trusted mission provenance proof missing");
  assert(deviceRuntime.includes("innerworld-trusted-mission-provenance/v1"), "device runtime trusted mission provenance schema missing");
  assert(deviceRuntime.includes("input_confirm_missing"), "device runtime trusted mission provenance must require confirm input evidence");
  assert(apiRouter.includes("trustedMissionProvenance") && apiRouter.includes("trusted_mission_provenance"), "api router trusted mission provenance ledger wiring missing");
  assert(sqliteStore.includes("trusted_mission_provenance") && sqliteStore.includes("has_trusted_mission_provenance"), "SQLite trusted mission provenance summary missing");
  assert(sqliteStore.includes("\"device_id\"") && sqliteStore.includes("\"session_id\""), "SQLite ledger must treat raw session/device ids as sensitive");
  assert(apiRouter.includes("/api/device/heartbeat"), "api router device heartbeat route missing");
  assert(apiRouter.includes("authorizeDevicePairingIssue"), "api router device pairing operator gate missing");
  assert(apiRouter.includes("isLoopbackAddress"), "api router device pairing loopback gate missing");
  assert(apiRouter.includes("INNERWORLD_OPERATOR_PIN"), "api router device pairing LAN PIN env missing");
  assert(apiRouter.includes("device_pairing_operator_gate_failed"), "api router device pairing gate rejection missing");
  assert(apiRouter.includes("createDeviceRuntimeStore"), "api router device runtime store missing");
  assert(apiRouter.includes("/api/evidence/chain"), "api router evidence chain route missing");
  assert(apiRouter.includes("/api/session/plan"), "api router session plan route missing");
  assert(apiRouter.includes("/api/calibration/wall"), "api router wall calibration route missing");
  assert(apiRouter.includes("/api/calibration/observations"), "api router wall calibration observation route missing");
  assert(apiRouter.includes("buildEvidenceChain"), "api router evidence chain builder missing");
  assert(apiRouter.includes("buildSessionPlan"), "api router session plan builder missing");
  assert(apiRouter.includes("buildWallCalibrationManifest"), "api router wall calibration builder missing");
  assert(apiRouter.includes("createWallCalibrationObservation"), "api router wall calibration observation builder missing");
  assert(apiRouter.includes("/api/ai/hud"), "api router AI HUD route missing");
  assert(apiRouter.includes("generateHudOutput"), "api router AI HUD generator call missing");
  assert(apiRouter.includes("applyWriteBack"), "api router write-back domain call missing");
  assert(response.includes("export function sendJson"), "response sendJson helper missing");
  assert(response.includes("access-control-allow-origin"), "response CORS headers missing");
  assert(staticFiles.includes("export function createStaticFileServer"), "static file server factory missing");
  assert(staticFiles.includes("safeStaticPath"), "static file safe path guard missing");
  assert(opsStatus.includes("export function createOpsStatusService"), "ops status service factory missing");
  assert(opsStatus.includes("summarizeHardwareManifest"), "ops hardware manifest summary missing");
  assert(opsStatus.includes("hardware:"), "ops hardware status field missing");
  assert(deviceRuntime.includes("export function buildDeviceManifest"), "device runtime manifest builder missing");
  assert(deviceRuntime.includes("export function createDeviceRuntimeStore"), "device runtime store factory missing");
  assert(deviceRuntime.includes("sanitizeDeviceId"), "device runtime sanitize guard missing");
  assert(deviceRuntime.includes("device_session_not_found"), "device runtime unknown session guard missing");
  assert(sqliteStore.includes("export async function createSqliteStore"), "SQLite store factory missing");
  assert(sqliteStore.includes("CREATE TABLE IF NOT EXISTS datasets"), "SQLite datasets table missing");
  assert(sqliteStore.includes("CREATE TABLE IF NOT EXISTS mission_ledger"), "SQLite mission ledger table missing");
  assert(sqliteStore.includes("CREATE TABLE IF NOT EXISTS wall_calibration_observations"), "SQLite wall calibration table missing");
  assert(sqliteStore.includes("appendMissionLedgerEvent"), "SQLite mission ledger append missing");
  assert(sqliteStore.includes("missionLedgerSummary"), "SQLite mission ledger summary missing");
  assert(sqliteStore.includes("appendWallCalibrationObservation"), "SQLite wall calibration append missing");
  assert(sqliteStore.includes("wallCalibrationSummary"), "SQLite wall calibration summary missing");
  assert(sqliteStore.includes("raw_sql_api"), "SQLite raw SQL guard marker missing");
  assert(wallCalibration.includes("innerworld-wall-calibration/v1"), "wall calibration schema missing");
  assert(wallCalibration.includes("buildWallCalibrationManifest"), "wall calibration manifest builder missing");
  assert(wallCalibration.includes("createWallCalibrationObservation"), "wall calibration observation builder missing");
  assert(wallCalibration.includes("position_error_reject_m"), "wall calibration reject threshold missing");
  return "verified";
}

async function assertFieldAcceptanceCheckSkeleton() {
  const [check, packageJson] = await Promise.all([
    readText("server/space-server/check-field-acceptance.js"),
    readText("package.json")
  ]);

  assert(check.includes("innerworld-field-acceptance/v1"), "field acceptance schema check missing");
  assert(check.includes("/api/field/acceptance"), "field acceptance endpoint check missing");
  assert(check.includes("innerworld-field-target-readiness/v1"), "field target readiness schema check missing");
  assert(check.includes("/api/field/target-readiness"), "field target readiness endpoint check missing");
  assert(check.includes("print_kit"), "field acceptance print kit gate missing");
  assert(check.includes("simulator_rehearsal"), "field acceptance simulator rehearsal gate missing");
  assert(check.includes("hardware_alignment"), "field acceptance hardware alignment gate missing");
  assert(check.includes("trusted_hardware_session") || check.includes("sdk_live_binding"), "field acceptance trusted hardware session gate missing");
  assert(check.includes("all_simulator_ready_for_hardware"), "field acceptance simulator hardware guard missing");
  assert(check.includes("ready_for_hardware === false"), "field acceptance hardware-ready negative assertion missing");
  assert(check.includes("tracking-mode-only hardware observations must not set hardware_acceptance_ready"), "field acceptance tracking-mode-only guard missing");
  assert(check.includes("trusted_hardware_evidence_count"), "field acceptance trusted hardware evidence count missing");
  assert(check.includes("required_tracking_modes") && check.includes("qr") && check.includes("image_tracking") && check.includes("slam"), "field acceptance hardware tracking modes missing");
  assert(packageJson.includes("\"check:field-acceptance\""), "package field acceptance check script missing");
  return "verified";
}

async function assertFieldLivePassCheckSkeleton() {
  const [tool, packageJson] = await Promise.all([
    readText("tools/field-live-pass.js"),
    readText("package.json")
  ]);

  assert(packageJson.includes("\"field:live-pass\""), "package field live pass script missing");
  assert(packageJson.includes("\"check:field-live-pass\""), "package field live pass check script missing");
  assert(tool.includes("innerworld-field-live-pass/v1"), "field live pass schema missing");
  assert(tool.includes("/api/field/acceptance"), "field live pass acceptance endpoint missing");
  assert(tool.includes("/api/state"), "field live pass state endpoint missing");
  assert(tool.includes("user_b_readback_ready"), "field live pass User B readback evidence missing");
  assert(tool.includes("mission.user_b_readback_ready === true"), "field live pass mission loop must require User B readback");
  assert(tool.includes("field.trusted_mission_provenance_ready === true"), "field live pass mission loop must require trusted mission provenance");
  assert(tool.includes("trusted_mission_provenance_missing"), "field live pass trusted mission provenance blocker missing");
  assert(tool.includes("p0_mission_writeback_user_b_loop_missing"), "field live pass mission/User B blocker missing");
  assert(tool.includes("missing_trusted_anchor_ids"), "field live pass missing trusted anchor evidence missing");
  assert(tool.includes("missing_hardware_anchor_ids"), "field live pass missing hardware anchor evidence missing");
  assert(tool.includes("missing_mission_step_ids"), "field live pass missing mission step evidence missing");
  assert(tool.includes("next_required_actions"), "field live pass next required actions missing");
  assert(tool.includes("trust_issues_by_anchor") && tool.includes("Untrusted Hardware Observations"), "field live pass per-anchor trust issue diagnostics missing");
  assert(tool.includes("ADAPTER_CHECKLIST_REQUIREMENTS") && tool.includes("Live Adapter Binding") && tool.includes("missing_item_labels"), "field live pass live adapter checklist diagnostics missing");
  assert(tool.includes("Scan A1 QR entry") && tool.includes("Scan A2 image target") && tool.includes("Scan A3 image target"), "field live pass physical target action prompts missing");
  assert(tool.includes("IW_TARGET_EVENT") && tool.includes("IW_TARGET_POST_RESULT") && tool.includes("IW_TARGET_MISSION_ASSIST"), "field live pass target logcat diagnostic tokens missing");
  assert(tool.includes("Target Logcat Diagnostics") && tool.includes("Diagnostic counts only; raw logcat is not written."), "field live pass target logcat diagnostics boundary missing");
  assert(tool.includes("raw_logcat_included: false") && tool.includes("raw_log_included: false"), "field live pass raw logcat privacy guards missing");
  return "verified";
}

async function assertFieldAcceptanceSessionSkeleton() {
  const [tool, packageJson] = await Promise.all([
    readText("tools/field-acceptance-session.ps1"),
    readText("package.json")
  ]);

  assert(packageJson.includes("\"field:acceptance-session\""), "package field acceptance session script missing");
  assert(packageJson.includes("\"field:acceptance-session:live\""), "package live field acceptance session script missing");
  assert(packageJson.includes("\"field:acceptance-session:strict\""), "package strict field acceptance session script missing");
  assert(packageJson.includes("\"field:acceptance-session:target\""), "package target field acceptance session script missing");
  assert(packageJson.includes("\"field:acceptance-session:target-strict\""), "package strict target field acceptance session script missing");
  assert(tool.includes("innerworld-field-acceptance-session/v1"), "field acceptance session schema missing");
  assert(tool.includes("tools/field-live-pass.js"), "field acceptance session live-pass invocation missing");
  assert(tool.includes("tools/field-target-pass.js"), "field acceptance session target-pass invocation missing");
  assert(tool.includes("[switch]$TargetPass"), "field acceptance session target pass switch missing");
  assert(tool.includes("[switch]$ApplyMissionActions") && tool.includes("[switch]$ConfirmUserBReadback"), "field acceptance session explicit target mutation switches missing");
  assert(tool.includes("tools/device-probe.ps1"), "field acceptance session device probe missing");
  assert(tool.includes("tools/station-pro-apk-smoke.ps1"), "field acceptance session Station Pro smoke missing");
  assert(tool.includes("simulator_or_manual_observations_created = $false"), "field acceptance session must not create rehearsal observations");
  assert(tool.includes("mission_or_writeback_mutated = [bool]($targetAppliedActions.Count -gt 0)"), "field acceptance session must report actual mission/write-back mutation state");
  assert(tool.includes("precheck_ok") && tool.includes("physical_acceptance_ready") && tool.includes("physical_blockers"), "field acceptance session target pass physical readiness summary missing");
  assert(tool.includes("hardware_ready_claim_allowed"), "field acceptance session hardware-ready claim guard missing");
  assert(tool.includes("livePassJson.ok -eq $false") && tool.includes("$livePassCommand.ok = $false"), "field acceptance session strict live-pass failure propagation missing");
  assert(tool.includes("targetPassJson.ok -eq $false") && tool.includes("$targetPassCommand.ok = $false"), "field acceptance session strict target-pass failure propagation missing");
  assert(tool.includes("raw_pairing_codes_included = $false"), "field acceptance session pairing-code privacy guard missing");
  assert(tool.includes("raw_logcat_included = $false"), "field acceptance session raw logcat guard missing");
  return "verified";
}

async function assertFieldTargetPassSkeleton() {
  const [tool, packageJson] = await Promise.all([
    readText("tools/field-target-pass.js"),
    readText("package.json")
  ]);

  assert(packageJson.includes("\"field:target-pass\""), "package field target pass script missing");
  assert(packageJson.includes("\"field:target-pass:watch\""), "package field target pass watch script missing");
  assert(packageJson.includes("\"field:target-pass:apply\""), "package field target pass apply script missing");
  assert(packageJson.includes("\"field:target-pass:strict\""), "package strict field target pass script missing");
  assert(packageJson.includes("\"check:field-target-pass\""), "package field target pass check script missing");
  assert(tool.includes("innerworld-field-target-pass/v1"), "field target pass schema missing");
  assert(tool.includes("/api/field/acceptance") && tool.includes("/api/device/sessions") && tool.includes("/api/state"), "field target pass endpoint coverage missing");
  assert(tool.includes("--apply-mission-actions") && tool.includes("--confirm-user-b-readback") && tool.includes("--require-target-diagnostics"), "field target pass explicit mutation/diagnostic flags missing");
  assert(tool.includes("simulator_or_manual_observations_created: false"), "field target pass simulator/manual guard missing");
  assert(tool.includes("hardware_ready_claim_allowed: false"), "field target pass hardware-ready claim guard missing");
  assert(tool.includes("REQUIRED_TARGET_DIAGNOSTIC_TOKENS") && tool.includes("IW_TARGET_EVENT") && tool.includes("IW_TARGET_MISSION_ASSIST"), "field target pass target diagnostic token guard missing");
  assert(tool.includes("station-pro-apk-smoke-latest-mutating-launch.json") && tool.includes("uxr-readiness-latest.json"), "field target pass current APK evidence guards missing");
  assert(tool.includes("target_diagnostics_preflight") && tool.includes("current_target_diagnostics_apk_preflight_missing"), "field target pass diagnostics preflight blocker missing");
  assert(tool.includes("precheck_ok") && tool.includes("physical_acceptance_ready") && tool.includes("physical_blockers"), "field target pass precheck/physical acceptance split missing");
  assert(tool.includes("function buildPhysicalBlockers"), "field target pass physical blocker builder missing");
  assert(tool.includes("field_acceptance_not_ready"), "field target pass physical field-acceptance blocker missing");
  assert(tool.includes("target_index_map_ready") && tool.includes("Target index map ready"), "field target pass target index map preflight evidence missing");
  assert(packageJson.includes("\"field:target-pass:apply\": \"node tools/field-target-pass.js --apply-mission-actions --require-live-session --require-target-diagnostics\""), "field target pass apply must require live session and target diagnostics");
  assert(packageJson.includes("--require-target-diagnostics"), "strict field target pass must require current target diagnostics preflight");
  assert(packageJson.includes("\"field:target-pass:watch\"") && packageJson.includes("--watch --require-live-session --require-target-diagnostics"), "field target pass watch script must require live session and target diagnostics");
  assert(tool.includes("captureWatchSnapshots") && tool.includes("duration_sec") && tool.includes("snapshot_count"), "field target pass watch snapshots missing");
  assert(tool.includes("adbLogcatCounts") && tool.includes("Target Logcat Diagnostics") && tool.includes("raw_logcat_included: false"), "field target pass logcat diagnostic privacy guard missing");
  assert(tool.includes("trust_issues_by_anchor") && tool.includes("/api/calibration/wall") && tool.includes("Untrusted Hardware Observations"), "field target pass per-anchor trust issue diagnostics missing");
  assert(tool.includes("ADAPTER_CHECKLIST_REQUIREMENTS") && tool.includes("Live Adapter Binding") && tool.includes("Missing live binding items"), "field target pass live adapter checklist diagnostics missing");
  assert(tool.includes("hasTrustedAnchor(snapshot, \"A2\")"), "field target pass A2 trusted gate missing");
  assert(tool.includes("snapshot.field_acceptance.trusted_mission_provenance_ready === true"), "field target pass mission loop must require trusted mission provenance");
  assert(tool.includes("trusted_mission_provenance_missing"), "field target pass trusted mission provenance blocker missing");
  assert(tool.includes("const a2Complete = hasTrustedAnchor(afterA2, \"A2\")"), "field target pass service action must require trusted A2");
  assert(tool.includes("hasTrustedAnchor(afterService, \"A3\") && hasMissionStep(afterService, \"service_action\")"), "field target pass A3 write-back gate missing");
  assert(tool.includes("const canConfirm = hasTrustedAnchor(snapshot, \"A3\")"), "field target pass User B readback must require trusted A3");
  assert(tool.includes("confirm_user_b_readback_flag_not_set"), "field target pass User B explicit confirmation guard missing");
  assert(tool.includes("source: \"field_target_pass_operator_confirmed_user_b_readback\""), "field target pass User B evidence source missing");
  assert(tool.includes("raw_pairing_codes_included: false") && tool.includes("raw_session_ids_included: false"), "field target pass privacy guards missing");
  return "verified";
}

async function assertRokidApkPackageEvidenceSkeleton() {
  const [stationSmoke, stationCheck, uxrReadiness, uxrCheck] = await Promise.all([
    readText("tools/station-pro-apk-smoke.ps1"),
    readText("server/space-server/check-station-pro-apk-smoke.js"),
    readText("tools/uxr-readiness.js"),
    readText("server/space-server/check-uxr-readiness.js")
  ]);

  assert(stationSmoke.includes("innerworld-rokid-target-index-map/v1"), "Station Pro smoke target index map schema missing");
  assert(stationSmoke.includes("innerworld-a1-qr-entry-v1") && stationSmoke.includes("innerworld-a2-memory-beacon-v1") && stationSmoke.includes("innerworld-a3-writeback-v1"), "Station Pro smoke target GUID map missing");
  assert(stationSmoke.includes("RKImage.db target index map ready"), "Station Pro smoke markdown target map line missing");
  assert(stationCheck.includes("RKImage.db target index map must be 1:A1,2:A2,3:A3"), "Station Pro APK check must enforce A1/A2/A3 index map");
  assert(uxrReadiness.includes("EXPECTED_ROKID_TARGET_INDEX_MAP"), "UXR readiness target index map expectation missing");
  assert(uxrReadiness.includes("rokid_image_db_target_index_map_invalid_for_a1_a2_a3"), "UXR readiness target index map blocker missing");
  assert(uxrReadiness.includes("target_index_map_not_exact_a1_a2_a3"), "UXR readiness exact target index map issue missing");
  assert(uxrCheck.includes("RKImage.db target index map evidence missing") && uxrCheck.includes("target_index_map.ready === true") && uxrCheck.includes("1:A1,2:A2,3:A3"), "UXR readiness check target map gate missing");
  return "verified";
}

async function assertUnityAndroidBuildSkeleton() {
  const [tool, packageJson] = await Promise.all([
    readText("tools/build-unity-android.ps1"),
    readText("package.json")
  ]);

  assert(packageJson.includes("\"unity:android:build:lan\""), "package Unity Android LAN build script missing");
  assert(tool.includes("Invoke-ExternalForReport"), "Unity Android build external report wrapper missing");
  assert(tool.includes("[int]$TimeoutSeconds = 300"), "Unity Android build external report timeout missing");
  assert(tool.includes("!$SkipRokidImageDbBuild -and !$SkipUnityBuild"), "Unity Android build report refresh must not rebuild image DB");
  assert(tool.includes("Start-Job") && tool.includes("Wait-Job -Job $job -Timeout $TimeoutSeconds"), "Unity Android build post-check wrapper must be timeout-bounded");
  assert(tool.includes("timed_out = [bool]$timedOut") && tool.includes("timeout_seconds = $TimeoutSeconds"), "Unity Android build report must expose external command timeout evidence");
  assert(tool.includes("Stop-Job -Job $job") && tool.includes("Remove-Job -Job $job"), "Unity Android build timeout cleanup missing");
  assert(tool.includes("Redact-BuildOutput") && tool.includes("private_ips_included = $false"), "Unity Android build privacy redaction guard missing");
  return "verified";
}

async function main() {
  const [space, aiSchema, hardwareManifest, markerConfig] = await Promise.all([
    readJson("data/space_demo.json"),
    readJson("ai/schema.json"),
    readJson("data/hardware_manifest.json"),
    readJson("data/field_markers.json")
  ]);

  assertSpaceContract(space);
  assertAiContract(aiSchema);
  assertHardwareManifest(hardwareManifest);
  assertEndpointMap(buildEndpointMap("http://localhost:5177", INNERWORLD_SPACE_ID));
  assertBootstrapContract(space, aiSchema);
  assertDeviceRuntimeContract(space, aiSchema);
  assertEvidenceChainContract(space, aiSchema, hardwareManifest);
  assertSessionPlanContract(space, aiSchema);
  assertWallCalibrationContract(space);
  assertFieldMarkerContract(space, markerConfig);
  assertAiHudGenerator(space, aiSchema);
  assertStateMachine(space);
  const server_core = await assertServerCoreSkeleton();
  const fieldAcceptanceCheck = await assertFieldAcceptanceCheckSkeleton();
  const fieldLivePassCheck = await assertFieldLivePassCheckSkeleton();
  const fieldAcceptanceSessionCheck = await assertFieldAcceptanceSessionSkeleton();
  const fieldTargetPassCheck = await assertFieldTargetPassSkeleton();
  const rokidApkPackageEvidenceCheck = await assertRokidApkPackageEvidenceSkeleton();
  const unityAndroidBuildCheck = await assertUnityAndroidBuildSkeleton();
  const unityProtocol = await assertUnityProtocolSkeleton();
  const rokidSimulator = await assertRokidSimulatorSkeleton();

  const client = createInnerWorldClient({ baseUrl: "http://localhost:5177" });
  assert(typeof client.getStoreStatus === "function", "client store status method missing");
  assert(typeof client.getDatasetCatalog === "function", "client dataset catalog method missing");
  assert(typeof client.callDataset === "function", "client dataset call method missing");
  assert(typeof client.getLedgerSummary === "function", "client ledger summary method missing");
  assert(typeof client.getLedgerEvents === "function", "client ledger events method missing");
  assert(typeof client.getDeviceBootstrap === "function", "client bootstrap method missing");
  assert(typeof client.getDeviceManifest === "function", "client device manifest method missing");
  assert(typeof client.issueDevicePairing === "function", "client device pairing method missing");
  assert(typeof client.registerDevice === "function", "client device register method missing");
  assert(typeof client.sendDeviceHeartbeat === "function", "client device heartbeat method missing");
  assert(typeof client.getDeviceSessions === "function", "client device sessions method missing");
  assert(typeof client.getServiceActionOutbox === "function", "client service action outbox method missing");
  assert(typeof client.ackServiceAction === "function", "client service action ack method missing");
  assert(typeof client.getEvidenceChain === "function", "client evidence chain method missing");
  assert(typeof client.getSessionPlan === "function", "client session plan method missing");
  assert(typeof client.getWallCalibration === "function", "client wall calibration method missing");
  assert(typeof client.submitWallCalibrationObservation === "function", "client wall calibration observation method missing");
  assert(typeof client.getFieldMarkers === "function", "client field markers method missing");
  assert(client.endpoints().space.path === `/api/spaces/${INNERWORLD_SPACE_ID}`, "client endpoints mismatch");
  assert(client.endpoints().store_status.path === "/api/store/status", "client store endpoint mismatch");
  assert(client.endpoints().dataset_call.path === "/api/datasets/call", "client dataset call endpoint mismatch");
  assert(client.endpoints().ledger_summary.path === "/api/ledger/summary", "client ledger summary endpoint mismatch");
  assert(client.endpoints().ledger_events.path === "/api/ledger/events", "client ledger events endpoint mismatch");
  assert(client.endpoints().evidence_chain.path === "/api/evidence/chain", "client evidence endpoint mismatch");
  assert(client.endpoints().session_plan.path === "/api/session/plan", "client session endpoint mismatch");
  assert(client.endpoints().wall_calibration.path === "/api/calibration/wall", "client wall calibration endpoint mismatch");
  assert(client.endpoints().wall_calibration_observations.path === "/api/calibration/observations", "client wall calibration observations endpoint mismatch");
  assert(client.endpoints().field_markers.path === "/api/field/markers", "client field markers endpoint mismatch");
  assert(client.endpoints().device_pairing.path === "/api/device/pairing", "client device pairing endpoint mismatch");
  assert(client.endpoints().device_heartbeat.path === "/api/device/heartbeat", "client device heartbeat endpoint mismatch");
  assert(client.endpoints().service_actions_outbox.path === "/api/service-actions/outbox", "client service actions outbox endpoint mismatch");
  assert(client.endpoints().service_action_ack_template.path === "/api/service-actions/{action_record_id}/ack", "client service action ack template endpoint mismatch");

  console.log(JSON.stringify({
    ok: true,
    space_id: space.space_id,
    anchors: space.anchors.length,
    mission_steps: space.mission.steps.length,
    protocol_version: DEVICE_BOOTSTRAP_PROTOCOL,
    ai_schema_title: aiSchema.title,
    hardware_kit: hardwareManifest.kit_interpretation,
    device_runtime_manifest: DEVICE_RUNTIME_MANIFEST_SCHEMA,
    device_runtime_session: DEVICE_RUNTIME_SESSION_PROTOCOL,
    ai_hud: "server/space-server/src/domain/hud-generator.js",
    evidence_chain: "server/space-server/src/domain/evidence-chain.js",
    session_plan: "server/space-server/src/domain/session-planner.js",
    wall_calibration: WALL_CALIBRATION_SCHEMA,
    field_markers: FIELD_MARKER_SCHEMA,
    field_acceptance_check: fieldAcceptanceCheck,
    field_live_pass_check: fieldLivePassCheck,
    field_acceptance_session_check: fieldAcceptanceSessionCheck,
    field_target_pass_check: fieldTargetPassCheck,
    rokid_apk_package_evidence_check: rokidApkPackageEvidenceCheck,
    unity_android_build_check: unityAndroidBuildCheck,
    server_core,
    unity_protocol: unityProtocol,
    rokid_simulator: rokidSimulator,
    shared_contract: "shared/innerworld-contract.js"
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
