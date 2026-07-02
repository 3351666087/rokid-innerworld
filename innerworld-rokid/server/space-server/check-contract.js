import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEVICE_BOOTSTRAP_PROTOCOL,
  INNERWORLD_SPACE_ID,
  MISSION_STEP_IDS,
  MISSION_STATES,
  buildDemoStatus,
  buildDeviceBootstrap,
  buildEndpointMap,
  createInnerWorldClient,
  normalizeMissionState
} from "../../shared/innerworld-contract.js";
import { generateHudOutput } from "./src/domain/hud-generator.js";
import { applyInteraction, applyServiceAction, applyWriteBack } from "./src/domain/mission-engine.js";

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
    device_bootstrap: ["GET", "/api/device/bootstrap"],
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

  const [controller, client, dtos, payloads] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceApiClient.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolDtos.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolPayloads.cs")
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
  assert(controller.includes("INNERWORLD_DEVICE_PROFILE"), "Unity controller device profile env override missing");

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

  const [models, poseProvider, inputSource, overlayRenderer, simulatorState, editorInput] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidInputModels.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidPoseProvider.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidOverlayRenderer.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidDeviceSimulatorState.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/EditorRokidInputSource.cs")
  ]);

  assert(models.includes("namespace InnerWorld.Rokid"), "Rokid input models namespace missing");
  assert(models.includes("public struct RokidInputFrame"), "RokidInputFrame model missing");
  assert(models.includes("public struct RokidConnectionInfo"), "RokidConnectionInfo model missing");
  assert(poseProvider.includes("interface IRokidPoseProvider"), "IRokidPoseProvider missing");
  assert(inputSource.includes("interface IRokidInputSource"), "IRokidInputSource missing");
  assert(overlayRenderer.includes("interface IRokidOverlayRenderer"), "IRokidOverlayRenderer missing");
  assert(simulatorState.includes("public sealed class RokidDeviceSimulatorState"), "RokidDeviceSimulatorState missing");
  assert(editorInput.includes("public sealed class EditorRokidInputSource"), "EditorRokidInputSource missing");
  assert(editorInput.includes("EnqueueVoiceText"), "Editor voice text injection missing");
  assert(editorInput.includes("SetAnchorTarget"), "Editor anchor target setter missing");
  return "verified";
}

async function assertServerCoreSkeleton() {
  const [index, apiRouter, response, staticFiles, opsStatus] = await Promise.all([
    readText("server/space-server/index.js"),
    readText("server/space-server/src/http/api-router.js"),
    readText("server/space-server/src/http/response.js"),
    readText("server/space-server/src/http/static-files.js"),
    readText("server/space-server/src/ops/status-service.js")
  ]);

  assert(index.includes("createApiRouter"), "server index does not use api router module");
  assert(index.includes("createStaticFileServer"), "server index does not use static file module");
  assert(index.includes("createOpsStatusService"), "server index does not use ops status service");
  assert(apiRouter.includes("export function createApiRouter"), "api router factory missing");
  assert(apiRouter.includes("/api/device/bootstrap"), "api router bootstrap route missing");
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
  assertAiHudGenerator(space, aiSchema);
  assertStateMachine(space);
  const server_core = await assertServerCoreSkeleton();
  const unityProtocol = await assertUnityProtocolSkeleton();
  const rokidSimulator = await assertRokidSimulatorSkeleton();

  const client = createInnerWorldClient({ baseUrl: "http://localhost:5177" });
  assert(typeof client.getDeviceBootstrap === "function", "client bootstrap method missing");
  assert(client.endpoints().space.path === `/api/spaces/${INNERWORLD_SPACE_ID}`, "client endpoints mismatch");

  console.log(JSON.stringify({
    ok: true,
    space_id: space.space_id,
    anchors: space.anchors.length,
    mission_steps: space.mission.steps.length,
    protocol_version: DEVICE_BOOTSTRAP_PROTOCOL,
    ai_schema_title: aiSchema.title,
    hardware_kit: hardwareManifest.kit_interpretation,
    ai_hud: "server/space-server/src/domain/hud-generator.js",
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
