import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEVICE_BOOTSTRAP_PROTOCOL,
  DEVICE_RUNTIME_MANIFEST_SCHEMA,
  DEVICE_RUNTIME_SESSION_PROTOCOL,
  EVIDENCE_CHAIN_SCHEMA,
  FIELD_SESSION_STAGE_IDS,
  INNERWORLD_SPACE_ID,
  MISSION_STEP_IDS,
  MISSION_STATES,
  SESSION_PLAN_SCHEMA,
  buildDemoStatus,
  buildDeviceBootstrap,
  buildEndpointMap,
  createInnerWorldClient,
  normalizeMissionState
} from "../../shared/innerworld-contract.js";
import { buildDeviceManifest, createDeviceRuntimeStore } from "./src/domain/device-runtime.js";
import { buildEvidenceChain } from "./src/domain/evidence-chain.js";
import { generateHudOutput } from "./src/domain/hud-generator.js";
import { applyInteraction, applyServiceAction, applyWriteBack } from "./src/domain/mission-engine.js";
import { buildSessionPlan } from "./src/domain/session-planner.js";

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
    evidence_chain: ["GET", "/api/evidence/chain"],
    session_plan: ["GET", "/api/session/plan"],
    device_bootstrap: ["GET", "/api/device/bootstrap"],
    device_manifest: ["GET", "/api/device/manifest"],
    device_register: ["POST", "/api/device/register"],
    device_heartbeat: ["POST", "/api/device/heartbeat"],
    device_sessions: ["GET", "/api/device/sessions"],
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
  assert(Object.keys(endpoints).length >= 22, "endpoint map count mismatch");
}

function assertSpaceContract(space) {
  assert(space.space_id === INNERWORLD_SPACE_ID, "space id mismatch");
  assert(Array.isArray(space.anchors) && space.anchors.length === 3, "expected 3 anchors");
  assert(space.anchors.map((anchor) => anchor.anchor_id).join(",") === "A1,A2,A3", "anchor ids mismatch");
  assert(space.anchors.some((anchor) => anchor.anchor_id === "A3" && anchor.default_state === "locked"), "A3 locked default missing");
  assert(Array.isArray(space.mission?.steps), "mission steps missing");
  assert(space.mission.steps.map((step) => step.step_id).join(",") === MISSION_STEP_IDS.join(","), "mission step ids mismatch");
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
  assert(manifest.adapter_slots.length >= 4, "device manifest adapter slots mismatch");
  assert(manifest.endpoints.device_register.method === "POST", "device manifest register endpoint mismatch");
  assert(manifest.endpoints.device_heartbeat.method === "POST", "device manifest heartbeat endpoint mismatch");
  assert(manifest.mission_snapshot.space_id === INNERWORLD_SPACE_ID, "device manifest mission snapshot mismatch");

  const runtime = createDeviceRuntimeStore();
  const capabilities = manifest.required_capabilities.map((capability) => capability.id);
  const register = runtime.register({
    body: {
      profile: "rokid-ar",
      device_id: "RA202 dev kit #1",
      client_version: "unity-runtime-0.1.0",
      serial_number: "SN-CONTRACT-SECRET",
      access_token: "real-contract-token",
      capabilities,
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
  const registerJson = JSON.stringify(register);
  assert(registerJson.includes("SN-CONTRACT-SECRET") === false, "device register leaked serial");
  assert(registerJson.includes("real-contract-token") === false, "device register leaked token");
  assert(registerJson.includes("10.0.0.18") === false, "device register leaked IP");
  assert(registerJson.includes("private-contract-wifi") === false, "device register leaked SSID");

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
      pose: {
        confidence: 0.93,
        position: { x: 0, y: 1.5, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
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
  assert(heartbeat.next_poll_ms > 0, "device heartbeat next poll mismatch");
  assert(JSON.stringify(heartbeat).includes("10.0.0.18") === false, "device heartbeat leaked IP");

  const sessions = runtime.sessionsSummary();
  assert(sessions.ok === true, "device sessions ok mismatch");
  assert(sessions.total === 1, "device sessions total mismatch");
  assert(sessions.sessions[0].session_id === register.session_id, "device sessions session mismatch");
  assert(sessions.sessions[0].heartbeat_count === 1, "device sessions heartbeat count mismatch");
  assert(JSON.stringify(sessions).includes("10.0.0.18") === false, "device sessions leaked IP");

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
  assert(plan.endpoints.evidence_chain.path === "/api/evidence/chain", "session plan evidence endpoint mismatch");
  assert(plan.endpoints.write_back.method === "POST", "session plan writeback endpoint method mismatch");
  assert(plan.operator_prompts.length === 5, "session plan operator prompts mismatch");
  assert(plan.device_handoff_notes.length === 5, "session plan device handoff notes mismatch");
  assert(plan.acceptance_checks.some((check) => check.id === "user_b_visibility"), "session plan User B check missing");
  assert(plan.fallback_actions.some((action) => action.id === "fallback_localhost"), "session plan fallback missing");
  assert(plan.target.guardrails.includes("not a PPT"), "session plan guardrail missing");
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
  assert(controller.includes("private EditorRokidInputSource editorRokidInputSource;"), "Unity controller Rokid input source missing");
  assert(controller.includes("apiClient.BootstrapUrl"), "Unity controller bootstrap URL not using client");
  assert(controller.includes("apiClient.SpaceUrl"), "Unity controller space URL not using client");
  assert(controller.includes("apiClient.InteractionsUrl"), "Unity controller interactions URL not using client");
  assert(controller.includes("apiClient.ServiceActionsUrl"), "Unity controller service URL not using client");
  assert(controller.includes("apiClient.WriteBackUrl"), "Unity controller write-back URL not using client");
  assert(controller.includes("InnerWorldRuntimeConfig.FromCurrentProcess"), "Unity controller runtime config load missing");
  assert(runtimeConfig.includes("INNERWORLD_DEVICE_PROFILE"), "Unity runtime config device profile env override missing");
  assert(runtimeConfig.includes("--innerworld-profile"), "Unity runtime config command-line profile override missing");

  assert(client.includes("namespace InnerWorld.Rokid.Protocol"), "Unity protocol namespace missing");
  assert(client.includes("DefaultSpaceId = \"innerworld_campus_wall\""), "Unity default space id mismatch");
  assert(client.includes("DefaultDeviceProfile = \"rokid-ar\""), "Unity default device profile mismatch");
  assert(client.includes("BuildBootstrapUrl"), "Unity bootstrap URL builder missing");
  assert(client.includes("/api/device/bootstrap"), "Unity bootstrap route missing");
  assert(client.includes("AiHudUrl"), "Unity AI HUD URL property missing");
  assert(client.includes("/api/ai/hud"), "Unity AI HUD route missing");
  assert(client.includes("/api/pins/nearby?radius=20"), "Unity nearby route missing");
  assert(client.includes("ai_hud = Endpoint(cleanBaseUrl, \"POST\", \"/api/ai/hud\")"), "Unity ai_hud endpoint mismatch");
  assert(client.includes("service_actions = Endpoint(cleanBaseUrl, \"POST\", \"/api/service-actions\")"), "Unity service_actions endpoint mismatch");
  assert(client.includes("write_back = Endpoint(cleanBaseUrl, \"POST\", writeBackPath)"), "Unity write_back endpoint mismatch");

  assert(dtos.includes("public sealed class DeviceBootstrapResponse"), "Unity DeviceBootstrapResponse DTO missing");
  assert(dtos.includes("public SpaceEndpointMap endpoints;"), "Unity endpoint map DTO missing");
  assert(dtos.includes("public SpaceApiEndpoint ai_hud;"), "Unity AI HUD endpoint DTO missing");
  assert(dtos.includes("public ClientHints client_hints;"), "Unity client hints DTO missing");
  assert(dtos.includes("public UnityCompat unity_compat;"), "Unity compatibility DTO missing");
  assert(payloads.includes("public sealed class AiHudRequest"), "Unity AI HUD request missing");
  assert(payloads.includes("public sealed class AiHudResponse"), "Unity AI HUD response missing");
  assert(payloads.includes("public sealed class InteractionRequest"), "Unity interaction request missing");
  assert(payloads.includes("public sealed class ServiceActionRequest"), "Unity service action request missing");
  assert(payloads.includes("public sealed class WriteBackRequest"), "Unity write-back request missing");
  return "verified";
}

async function assertRokidSimulatorSkeleton() {
  if (!requireUnityProtocol) {
    return "not_required";
  }

  const [models, poseProvider, overlayRenderer, simulatorState, editorInput] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidInputModels.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidPoseProvider.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidOverlayRenderer.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidDeviceSimulatorState.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/EditorRokidInputSource.cs")
  ]);

  assert(models.includes("namespace InnerWorld.Rokid"), "Rokid input models namespace missing");
  assert(models.includes("public struct RokidInputFrame"), "RokidInputFrame model missing");
  assert(models.includes("public struct RokidConnectionInfo"), "RokidConnectionInfo model missing");
  assert(poseProvider.includes("interface IRokidPoseProvider"), "IRokidPoseProvider missing");
  assert(poseProvider.includes("interface IRokidInputSource"), "IRokidInputSource missing");
  assert(overlayRenderer.includes("interface IRokidOverlayRenderer"), "IRokidOverlayRenderer missing");
  assert(simulatorState.includes("public sealed class RokidDeviceSimulatorState"), "RokidDeviceSimulatorState missing");
  assert(editorInput.includes("public sealed class EditorRokidInputSource"), "EditorRokidInputSource missing");
  assert(editorInput.includes("EnqueueVoiceText"), "Editor voice text injection missing");
  assert(editorInput.includes("SetAnchorTarget"), "Editor anchor target setter missing");
  return "verified";
}

async function assertServerCoreSkeleton() {
  const [index, apiRouter, response, staticFiles, opsStatus, deviceRuntime, sqliteStore] = await Promise.all([
    readText("server/space-server/index.js"),
    readText("server/space-server/src/http/api-router.js"),
    readText("server/space-server/src/http/response.js"),
    readText("server/space-server/src/http/static-files.js"),
    readText("server/space-server/src/ops/status-service.js"),
    readText("server/space-server/src/domain/device-runtime.js"),
    readText("server/space-server/src/store/sqlite-store.js")
  ]);

  assert(index.includes("createApiRouter"), "server index does not use api router module");
  assert(index.includes("createStaticFileServer"), "server index does not use static file module");
  assert(index.includes("createOpsStatusService"), "server index does not use ops status service");
  assert(apiRouter.includes("export function createApiRouter"), "api router factory missing");
  assert(apiRouter.includes("/api/device/bootstrap"), "api router bootstrap route missing");
  assert(apiRouter.includes("/api/device/manifest"), "api router device manifest route missing");
  assert(apiRouter.includes("/api/store/status"), "api router store status route missing");
  assert(apiRouter.includes("/api/datasets/catalog"), "api router dataset catalog route missing");
  assert(apiRouter.includes("/api/datasets/call"), "api router dataset call route missing");
  assert(apiRouter.includes("/api/device/register"), "api router device register route missing");
  assert(apiRouter.includes("/api/device/heartbeat"), "api router device heartbeat route missing");
  assert(apiRouter.includes("createDeviceRuntimeStore"), "api router device runtime store missing");
  assert(apiRouter.includes("/api/evidence/chain"), "api router evidence chain route missing");
  assert(apiRouter.includes("/api/session/plan"), "api router session plan route missing");
  assert(apiRouter.includes("buildEvidenceChain"), "api router evidence chain builder missing");
  assert(apiRouter.includes("buildSessionPlan"), "api router session plan builder missing");
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
  assert(sqliteStore.includes("raw_sql_api"), "SQLite raw SQL guard marker missing");
  return "verified";
}

async function main() {
  const [space, aiSchema, hardwareManifest] = await Promise.all([
    readJson("data/space_demo.json"),
    readJson("ai/schema.json"),
    readJson("data/hardware_manifest.json")
  ]);

  assertSpaceContract(space);
  assertAiContract(aiSchema);
  assertHardwareManifest(hardwareManifest);
  assertEndpointMap(buildEndpointMap("http://localhost:5177", INNERWORLD_SPACE_ID));
  assertBootstrapContract(space, aiSchema);
  assertDeviceRuntimeContract(space, aiSchema);
  assertEvidenceChainContract(space, aiSchema, hardwareManifest);
  assertSessionPlanContract(space, aiSchema);
  assertAiHudGenerator(space, aiSchema);
  assertStateMachine(space);
  const server_core = await assertServerCoreSkeleton();
  const unityProtocol = await assertUnityProtocolSkeleton();
  const rokidSimulator = await assertRokidSimulatorSkeleton();

  const client = createInnerWorldClient({ baseUrl: "http://localhost:5177" });
  assert(typeof client.getStoreStatus === "function", "client store status method missing");
  assert(typeof client.getDatasetCatalog === "function", "client dataset catalog method missing");
  assert(typeof client.callDataset === "function", "client dataset call method missing");
  assert(typeof client.getDeviceBootstrap === "function", "client bootstrap method missing");
  assert(typeof client.getDeviceManifest === "function", "client device manifest method missing");
  assert(typeof client.registerDevice === "function", "client device register method missing");
  assert(typeof client.sendDeviceHeartbeat === "function", "client device heartbeat method missing");
  assert(typeof client.getDeviceSessions === "function", "client device sessions method missing");
  assert(typeof client.getEvidenceChain === "function", "client evidence chain method missing");
  assert(typeof client.getSessionPlan === "function", "client session plan method missing");
  assert(client.endpoints().space.path === `/api/spaces/${INNERWORLD_SPACE_ID}`, "client endpoints mismatch");
  assert(client.endpoints().store_status.path === "/api/store/status", "client store endpoint mismatch");
  assert(client.endpoints().dataset_call.path === "/api/datasets/call", "client dataset call endpoint mismatch");
  assert(client.endpoints().evidence_chain.path === "/api/evidence/chain", "client evidence endpoint mismatch");
  assert(client.endpoints().session_plan.path === "/api/session/plan", "client session endpoint mismatch");
  assert(client.endpoints().device_heartbeat.path === "/api/device/heartbeat", "client device heartbeat endpoint mismatch");

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
