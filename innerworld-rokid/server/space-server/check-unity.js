import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const base = process.env.BASE_URL || "http://localhost:5177";
const spaceId = "innerworld_campus_wall";
const qaUser = "UNITY_QA";

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

async function fetchJson(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  assertJsonHeaders(res, path);
  const body = await res.json();
  return { res, body };
}

async function resetState() {
  const { res, body } = await fetchJson("/api/reset", { method: "POST" });
  assert(res.ok, "reset request failed");
  return body;
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function assertUnityAdapterBoundary() {
  const [controller, poseProvider, bindingProbe, boundaryStatus, resolver, editorInput, fallbackOverlay, uxrInput, uxrOverlay, docs] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidPoseProvider.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidSdkBindingProbe.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidAdapterBoundaryStatus.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidAdapterResolver.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/EditorRokidInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/FallbackRokidOverlayRenderer.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidUxrInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidUxrOverlayRenderer.cs"),
    readText("docs/rokid-device-integration.md")
  ]);

  assert(controller.includes("RokidAdapterResolver.Resolve(presentationStrategy)"), "Unity controller resolver boundary missing");
  assert(controller.includes("private RokidAdapterBoundaryStatus rokidAdapterStatus;"), "Unity controller boundary status missing");
  assert(controller.includes("private IRokidInputStateSink rokidInputStateSink;"), "Unity controller input state sink missing");
  assert(controller.includes("private DeviceRuntimeSessionResponse deviceSession;"), "Unity controller device session field missing");
  assert(controller.includes("RegisterDeviceSession"), "Unity controller device register coroutine missing");
  assert(controller.includes("PostDeviceHeartbeat"), "Unity controller device heartbeat coroutine missing");
  assert(controller.includes("apiClient.DeviceRegisterUrl"), "Unity controller device register URL missing");
  assert(controller.includes("apiClient.DeviceHeartbeatUrl"), "Unity controller device heartbeat URL missing");
  assert(controller.includes("private WallCalibrationManifest wallCalibrationManifest;"), "Unity controller wall calibration manifest field missing");
  assert(controller.includes("private FieldMarkerManifest fieldMarkerManifest;"), "Unity controller field marker manifest field missing");
  assert(controller.includes("private FieldAcceptanceManifest fieldAcceptanceManifest;"), "Unity controller field acceptance manifest field missing");
  assert(controller.includes("private string fieldAcceptanceLine"), "Unity controller field acceptance status line missing");
  assert(controller.includes("yield return LoadWallCalibrationManifest();"), "Unity controller startup wall calibration fetch missing");
  assert(controller.includes("yield return LoadFieldMarkerManifest();"), "Unity controller startup field marker fetch missing");
  assert(controller.includes("yield return LoadFieldAcceptanceManifest();"), "Unity controller startup field acceptance fetch missing");
  assert(controller.includes("LoadWallCalibrationManifest"), "Unity controller wall calibration coroutine missing");
  assert(controller.includes("LoadFieldMarkerManifest"), "Unity controller field marker coroutine missing");
  assert(controller.includes("LoadFieldAcceptanceManifest"), "Unity controller field acceptance coroutine missing");
  assert(controller.includes("bootstrap.endpoints.wall_calibration"), "Unity controller bootstrap wall calibration endpoint missing");
  assert(controller.includes("apiClient.WallCalibrationUrl"), "Unity controller wall calibration fallback URL missing");
  assert(controller.includes("JsonUtility.FromJson<WallCalibrationManifest>"), "Unity controller wall calibration manifest parsing missing");
  assert(controller.includes("bootstrap.endpoints.field_markers"), "Unity controller bootstrap field marker endpoint missing");
  assert(controller.includes("apiClient.FieldMarkersUrl"), "Unity controller field markers fallback URL missing");
  assert(controller.includes("JsonUtility.FromJson<FieldMarkerManifest>"), "Unity controller field marker manifest parsing missing");
  assert(controller.includes("bootstrap.endpoints.field_acceptance"), "Unity controller bootstrap field acceptance endpoint missing");
  assert(controller.includes("apiClient.FieldAcceptanceUrl"), "Unity controller field acceptance fallback URL missing");
  assert(controller.includes("JsonUtility.FromJson<FieldAcceptanceManifest>"), "Unity controller field acceptance manifest parsing missing");
  assert(controller.includes("BuildWallCalibrationStatusLine"), "Unity controller wall calibration HUD/log status missing");
  assert(controller.includes("BuildFieldMarkerStatusLine"), "Unity controller field marker HUD/log status missing");
  assert(controller.includes("BuildFieldAcceptanceStatusLine"), "Unity controller field acceptance HUD/log status missing");
  assert(controller.includes("BuildFieldMarkerHeartbeatLine"), "Unity controller field marker heartbeat status missing");
  assert(controller.includes("BuildFieldAcceptanceHeartbeatLine"), "Unity controller field acceptance heartbeat status missing");
  assert(controller.includes("BuildFieldAcceptanceHeartbeatMessage"), "Unity controller field acceptance heartbeat message missing");
  assert(controller.includes("BuildFieldAcceptanceBlockingLine"), "Unity controller field acceptance blocking status missing");
  assert(controller.includes("BuildFieldAcceptanceDebugLine"), "Unity controller field acceptance target HUD status missing");
  assert(controller.includes("FieldAcceptanceHudBadge"), "Unity controller field acceptance HUD badge missing");
  assert(controller.includes("FieldAcceptanceTrackingGuardLabel"), "Unity controller field acceptance tracking guard label missing");
  assert(controller.includes("BuildFieldMarkerActiveLine"), "Unity controller active field marker line missing");
  assert(controller.includes("BuildWallCalibrationHeartbeatMessage"), "Unity controller wall calibration heartbeat status missing");
  assert(controller.includes("ready_for_hardware"), "Unity controller wall calibration ready flag missing");
  assert(controller.includes("blocking_items"), "Unity controller field acceptance blocking items missing");
  assert(controller.includes("simulator_rehearsal_is_not_hardware_ready"), "Unity controller field acceptance simulator guard missing");
  assert(controller.includes("calibrated_anchor_ids"), "Unity controller calibrated anchor IDs missing");
  assert(controller.includes("hardware_calibrated_anchor_count"), "Unity controller hardware-only calibration count missing");
  assert(controller.includes("hardware_calibrated_anchor_ids"), "Unity controller hardware-only calibrated anchor IDs missing");
  assert(controller.includes("HardwareCalibratedAnchorIdsLabel"), "Unity controller hardware-only calibrated anchor label missing");
  assert(controller.includes("print kit ready"), "Unity controller must expose print kit readiness separately");
  assert(controller.includes("simulator rehearsal"), "Unity controller must expose simulator rehearsal separately");
  assert(controller.includes("hardware ready") && controller.includes("hardware pending"), "Unity controller must expose hardware readiness separately");
  assert(controller.includes("private IEnumerator SubmitWallCalibrationObservation"), "Unity controller wall calibration observation POST coroutine missing");
  assert(controller.includes("yield return SubmitWallCalibrationObservation(\"simulator\");"), "Unity controller startup simulator calibration observation missing");
  assert(controller.includes("SubmitWallCalibrationObservation(\"manual\")"), "Unity controller manual calibration observation input missing");
  assert(controller.includes("bootstrap.endpoints.wall_calibration_observations"), "Unity controller bootstrap wall calibration observations endpoint missing");
  assert(controller.includes("apiClient.WallCalibrationObservationsUrl"), "Unity controller wall calibration observations fallback URL missing");
  assert(controller.includes("WallCalibrationObservationPayload"), "Unity controller wall calibration observation payload missing");
  assert(controller.includes("BuildWallCalibrationObservationPayload"), "Unity controller wall calibration payload builder missing");
  assert(controller.includes("BuildObservedPoseFromExpectedPose"), "Unity controller calibration observation expected_pose copy missing");
  assert(controller.includes("anchor.expected_pose"), "Unity controller calibration observation must use manifest expected_pose");
  assert(controller.includes("lastWallCalibrationObservation"), "Unity controller last calibration observation status missing");
  assert(controller.includes("BuildWallCalibrationObservationLine"), "Unity controller calibration observation HUD/log line missing");
  assert(!controller.includes("\"calibration ready\""), "Unity controller must not label rehearsal calibration as hardware ready");
  assert(/private IEnumerator LoadWallCalibrationManifest\(\)[\s\S]*bootstrap\.endpoints\.wall_calibration[\s\S]*apiClient\.WallCalibrationUrl[\s\S]*UnityWebRequest\.Get\(url\)[\s\S]*JsonUtility\.FromJson<WallCalibrationManifest>/.test(controller), "Unity controller must actively GET and parse the wall calibration manifest");
  assert(/private IEnumerator LoadFieldMarkerManifest\(\)[\s\S]*bootstrap\.endpoints\.field_markers[\s\S]*apiClient\.FieldMarkersUrl[\s\S]*UnityWebRequest\.Get\(url\)[\s\S]*JsonUtility\.FromJson<FieldMarkerManifest>/.test(controller), "Unity controller must actively GET and parse the field marker manifest");
  assert(/private IEnumerator LoadFieldAcceptanceManifest\(\)[\s\S]*bootstrap\.endpoints\.field_acceptance[\s\S]*apiClient\.FieldAcceptanceUrl[\s\S]*UnityWebRequest\.Get\(url\)[\s\S]*JsonUtility\.FromJson<FieldAcceptanceManifest>/.test(controller), "Unity controller must actively GET and parse the field acceptance manifest");
  assert(/private IEnumerator SubmitWallCalibrationObservation\(string trackingMode\)[\s\S]*bootstrap\.endpoints\.wall_calibration_observations[\s\S]*apiClient\.WallCalibrationObservationsUrl[\s\S]*JsonUtility\.ToJson\(payload\)[\s\S]*new UnityWebRequest\(url, "POST"\)/.test(controller), "Unity controller must actively POST wall calibration observations as JSON");
  assert(/new WallCalibrationObservationPayload[\s\S]*session_id[\s\S]*device_id[\s\S]*anchor_id[\s\S]*tracking_mode[\s\S]*observed_pose[\s\S]*confidence[\s\S]*notes[\s\S]*client_time/.test(controller), "Unity controller wall calibration observation payload must include required fields");
  assert(/BuildWallCalibrationObservationPayload[\s\S]*BuildObservedPoseFromExpectedPose\(anchor != null \? anchor\.expected_pose/.test(controller), "Unity controller must rehearse observations from manifest expected_pose");
  assert(/BuildFieldAcceptanceStatusLine\(\)[\s\S]*FieldAcceptanceSchemaLabel[\s\S]*FieldAcceptanceStatusLabel[\s\S]*FieldAcceptanceReadyForHardwareFlag[\s\S]*FieldAcceptanceBlockingCount/.test(controller), "Unity controller field acceptance status must summarize schema, status, hardware readiness, and blockers");
  assert(/BuildFieldAcceptanceHeartbeatLine\(\)[\s\S]*FieldAcceptanceReadyForHardwareFlag[\s\S]*FieldAcceptanceHardwareEvidenceCount[\s\S]*FieldAcceptanceTrackingGuardLabel[\s\S]*simulator_rehearsal_is_not_hardware_ready/.test(controller), "Unity controller field acceptance heartbeat must include hardware evidence and simulator guard flags");
  assert(/private string BuildRuntimeContractLine\(\)[\s\S]*BuildWallCalibrationStatusLine[\s\S]*BuildFieldMarkerStatusLine[\s\S]*BuildFieldAcceptanceStatusLine/.test(controller), "Unity controller HUD runtime line must expose wall calibration, field marker, and field acceptance status");
  assert(/private string BuildWallCalibrationHeartbeatLine\(\)[\s\S]*BuildWallCalibrationObservationLine[\s\S]*BuildFieldMarkerHeartbeatLine[\s\S]*BuildFieldAcceptanceHeartbeatLine/.test(controller), "Unity controller heartbeat payload must expose last calibration observation, field marker status, and field acceptance status");
  assert(/private void RefreshHud\(\)[\s\S]*FieldAcceptanceHudBadge/.test(controller), "Unity controller main HUD must expose field acceptance status");
  assert(/private void RefreshTargetHud\(\)[\s\S]*BuildWallCalibrationObservationLine[\s\S]*BuildFieldMarkerActiveLine[\s\S]*BuildFieldAcceptanceDebugLine/.test(controller), "Unity controller target HUD must expose last calibration observation, active field marker, and field acceptance details");
  assert(/private void RefreshInputStatusLine\(\)[\s\S]*BuildWallCalibrationObservationLine[\s\S]*BuildFieldMarkerReadinessLine[\s\S]*FieldAcceptanceHudBadge/.test(controller), "Unity controller device/input status must expose calibration observation, field marker readiness, and field acceptance status");
  assert(/BuildSdkBindingStatusPayload[\s\S]*message = BuildFieldAcceptanceHeartbeatMessage\(report.Message\)/.test(controller), "Unity controller SDK heartbeat payload must include field acceptance status");
  assert(/private string BuildFieldAcceptanceHeartbeatMessage\(string sdkMessage\)[\s\S]*BuildWallCalibrationHeartbeatMessage\(sdkMessage\)[\s\S]*BuildFieldAcceptanceHeartbeatLine\(\)[\s\S]*BuildFieldAcceptanceBlockingLine\(\)/.test(controller), "Unity controller field acceptance heartbeat message must include wall calibration, acceptance summary, and blockers");
  assert(controller.includes("BuildSdkBindingStatusPayload"), "Unity controller SDK binding heartbeat payload missing");
  assert(controller.includes("BuildDeviceRegisterRequest"), "Unity controller device register payload builder missing");
  assert(controller.includes("BuildDeviceHeartbeatRequest"), "Unity controller device heartbeat payload builder missing");
  assert(controller.includes("RequiredDeviceCapabilities"), "Unity controller required capabilities missing");
  assert(controller.includes("RokidSdkBindingProbe.Detect().BoundaryCompiled"), "Unity controller SDK binding probe environment missing");
  assert(poseProvider.includes("interface IRokidInputStateSink"), "Unity input state sink interface missing");
  assert(bindingProbe.includes("innerworld-rokid-sdk-binding/v1"), "Rokid SDK binding schema missing");
  assert(bindingProbe.includes("public enum RokidSdkBindingStage"), "Rokid SDK binding stage enum missing");
  assert(bindingProbe.includes("RokidSdkBindingProbe"), "Rokid SDK binding probe missing");
  assert(bindingProbe.includes("AppDomain.CurrentDomain.GetAssemblies"), "Rokid SDK binding assembly probe missing");
  assert(bindingProbe.includes("LiveBindingReady"), "Rokid SDK live binding state missing");
  assert(boundaryStatus.includes("DefineSymbol = \"ROKID_UXR\""), "ROKID_UXR define marker missing");
  assert(boundaryStatus.includes("#if ROKID_UXR"), "ROKID_UXR compile guard missing");
  assert(boundaryStatus.includes("RokidSdkBindingReport"), "Rokid adapter status SDK binding report missing");
  assert(boundaryStatus.includes("IsSdkLiveBindingReady"), "Rokid adapter status live binding flag missing");
  assert(resolver.includes("#if ROKID_UXR"), "Rokid resolver compile guard missing");
  assert(resolver.includes("RokidSdkBindingProbe.Detect()"), "Rokid resolver SDK binding probe missing");
  assert(resolver.includes("new RokidUxrInputSource"), "Rokid UXR input resolver path missing");
  assert(resolver.includes("new RokidUxrOverlayRenderer"), "Rokid UXR overlay resolver path missing");
  assert(resolver.includes("new EditorRokidInputSource"), "Rokid fallback input resolver path missing");
  assert(resolver.includes("new FallbackRokidOverlayRenderer"), "Rokid fallback overlay resolver path missing");
  assert(editorInput.includes("IRokidInputStateSink"), "Editor input state sink implementation missing");
  assert(fallbackOverlay.includes("IRokidOverlayRenderer"), "Fallback overlay renderer missing");
  assert(uxrInput.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR input file must be fully guarded");
  assert(uxrInput.includes("SDK input binding pending"), "Rokid UXR input stub message missing");
  assert(uxrOverlay.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR overlay file must be fully guarded");
  assert(docs.includes("RokidAdapterResolver.Resolve"), "Rokid adapter boundary docs missing");
  assert(docs.includes("ROKID_UXR"), "Rokid UXR docs missing");

  const [client, dtos, payloads] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceApiClient.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolDtos.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolPayloads.cs")
  ]);
  assert(client.includes("DeviceRegisterUrl"), "Unity SpaceApiClient device register property missing");
  assert(client.includes("DeviceHeartbeatUrl"), "Unity SpaceApiClient device heartbeat property missing");
  assert(client.includes("WallCalibrationUrl"), "Unity SpaceApiClient wall calibration property missing");
  assert(client.includes("WallCalibrationObservationsUrl"), "Unity SpaceApiClient wall calibration observations property missing");
  assert(client.includes("FieldMarkersUrl"), "Unity SpaceApiClient field markers property missing");
  assert(client.includes("FieldAcceptanceUrl"), "Unity SpaceApiClient field acceptance property missing");
  assert(client.includes("BuildWallCalibrationUrl"), "Unity SpaceApiClient wall calibration builder missing");
  assert(client.includes("BuildWallCalibrationObservationsUrl"), "Unity SpaceApiClient wall calibration observations builder missing");
  assert(client.includes("BuildFieldMarkersUrl"), "Unity SpaceApiClient field markers builder missing");
  assert(client.includes("BuildFieldAcceptanceUrl"), "Unity SpaceApiClient field acceptance builder missing");
  assert(client.includes("BuildServiceActionAckUrl"), "Unity SpaceApiClient service action ack builder missing");
  assert(client.includes("service_actions_outbox = Endpoint"), "Unity endpoint map service outbox missing");
  assert(client.includes("wall_calibration = Endpoint"), "Unity endpoint map wall calibration missing");
  assert(client.includes("wall_calibration_observations = Endpoint"), "Unity endpoint map wall calibration observations missing");
  assert(client.includes("field_markers = Endpoint"), "Unity endpoint map field markers missing");
  assert(client.includes("field_acceptance = Endpoint"), "Unity endpoint map field acceptance missing");
  assert(dtos.includes("public sealed class DeviceRuntimeSessionResponse"), "Unity device register response DTO missing");
  assert(dtos.includes("public sealed class DeviceHeartbeatResponse"), "Unity device heartbeat response DTO missing");
  assert(dtos.includes("public sealed class DeviceHealthStatus"), "Unity device health DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationManifest"), "Unity wall calibration manifest DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationObservationResult"), "Unity wall calibration observation result DTO missing");
  assert(dtos.includes("public int hardware_calibrated_anchor_count"), "Unity wall calibration hardware-only count DTO missing");
  assert(dtos.includes("public string[] hardware_calibrated_anchor_ids"), "Unity wall calibration hardware-only IDs DTO missing");
  assert(dtos.includes("public bool rehearsal_ready"), "Unity wall calibration rehearsal readiness DTO missing");
  assert(dtos.includes("public sealed class FieldMarkerManifest"), "Unity field marker manifest DTO missing");
  assert(dtos.includes("public sealed class FieldMarkerAnchor"), "Unity field marker anchor DTO missing");
  assert(dtos.includes("public sealed class FieldAcceptanceManifest"), "Unity field acceptance manifest DTO missing");
  assert(dtos.includes("public FieldAcceptanceSummary summary"), "Unity field acceptance summary DTO missing");
  assert(dtos.includes("public FieldAcceptanceGate[] gates"), "Unity field acceptance gates DTO missing");
  assert(dtos.includes("public FieldAcceptanceBlockingItem[] blocking_items"), "Unity field acceptance blocking item DTO missing");
  assert(dtos.includes("public bool simulator_rehearsal_is_not_hardware_ready"), "Unity field acceptance simulator guard DTO missing");
  assert(payloads.includes("public sealed class DeviceRegisterRequest"), "Unity device register request DTO missing");
  assert(payloads.includes("public sealed class DeviceHeartbeatRequest"), "Unity device heartbeat request DTO missing");
  assert(payloads.includes("public sealed class WallCalibrationObservationPayload"), "Unity wall calibration observation payload missing");
  assert(payloads.includes("public sealed class RokidSdkBindingStatusPayload"), "Unity SDK binding status payload missing");
  assert(payloads.includes("public sealed class DeviceNetworkStatus"), "Unity device network payload missing");
  return "ROKID_UXR";
}

async function main() {
  let wrote = false;
  try {
    const adapterBoundary = await assertUnityAdapterBoundary();

    const preflight = await fetch(`${base}/api/health`, {
      method: "OPTIONS",
      headers: {
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type"
      }
    });
    assert(preflight.status === 204, "OPTIONS preflight status check failed");
    assert(preflight.headers.get("access-control-allow-origin") === "*", "OPTIONS CORS origin check failed");
    assert((preflight.headers.get("access-control-allow-methods") || "").includes("OPTIONS"), "OPTIONS methods check failed");
    assert((preflight.headers.get("access-control-allow-headers") || "").includes("content-type"), "OPTIONS headers check failed");

    const resetBefore = await resetState();
    assert(resetBefore.mission_state === "entered", "initial reset mission_state check failed");

    const { body: health } = await fetchJson("/api/health");
    assert(health.ok === true, "health ok check failed");
    assert(health.demo_ready === true, "demo readiness check failed");
    assert(health.space_id === spaceId, "health space_id check failed");
    assert(health.anchor_count === 3, "health anchor_count check failed");
    assert(health.mission_state === "entered", "health mission_state check failed");
    assert(typeof health.cache_safe_note === "string" && health.cache_safe_note.includes("no-store"), "health cache note check failed");

    const { body: space } = await fetchJson(`/api/spaces/${spaceId}`);
    assert(space.space_id === spaceId, "space payload check failed");
    assert(space.runtime?.mission_state === "entered", "space runtime check failed");
    assert(Array.isArray(space.anchors) && space.anchors.length === health.anchor_count, "space anchor check failed");

    const { body: nearby } = await fetchJson("/api/pins/nearby?radius=20");
    assert(nearby.space_id === spaceId, "nearby space_id check failed");
    assert(Array.isArray(nearby.pins) && nearby.pins.length === health.anchor_count, "nearby pins check failed");

    const { res: writeRes, body: write } = await fetchJson(`/api/spaces/${spaceId}/beacons`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        user_id: qaUser,
        anchor_id: "A3",
        title: "Unity QA writeback",
        text: "Unity QA writeback loop is reachable."
      })
    });
    wrote = true;
    assert(writeRes.status === 201, "write-back status check failed");
    assert(write.ok === true, "write-back ok check failed");
    assert(write.beacon?.source === qaUser, "write-back beacon source check failed");

    const { body: stateAfterWrite } = await fetchJson("/api/state");
    assert(stateAfterWrite.mission_state === "complete", "state mission_state after write check failed");
    assert(stateAfterWrite.completed_steps?.includes("write_back"), "state completed_steps check failed");
    assert(stateAfterWrite.beacons?.some((item) => item.source === qaUser), "state write-back beacon check failed");

    const resetAfter = await resetState();
    wrote = false;
    assert(resetAfter.mission_state === "entered", "final reset mission_state check failed");
    assert(Array.isArray(resetAfter.completed_steps) && resetAfter.completed_steps.length === 0, "final reset completed_steps check failed");
    assert(!resetAfter.beacons.some((item) => item.source === qaUser), "final reset write-back cleanup check failed");

    const { body: healthAfterReset } = await fetchJson("/api/health");
    assert(healthAfterReset.mission_state === "entered", "health after reset mission_state check failed");
    assert(healthAfterReset.beacon_count === resetAfter.beacons.length, "health after reset beacon_count check failed");

    console.log(JSON.stringify({
      ok: true,
      base,
      space_id: healthAfterReset.space_id,
      anchors: healthAfterReset.anchor_count,
      beacons_after_reset: healthAfterReset.beacon_count,
      mission_state: healthAfterReset.mission_state,
      cors: "ok",
      cache: "no-store",
      adapter_boundary: adapterBoundary
    }, null, 2));
  } catch (error) {
    if (wrote) {
      try {
        await resetState();
      } catch (resetError) {
        console.error("cleanup reset failed", resetError);
      }
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
