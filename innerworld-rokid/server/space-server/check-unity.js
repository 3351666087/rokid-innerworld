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
  const [controller, imageTrackingObserver, presentationMode, missionState, poseProvider, bindingProbe, boundaryStatus, resolver, editorInput, fallbackOverlay, uxrInput, uxrOverlay, docs] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/InnerWorldRokidImageTrackingObserver.cs"),
    readText("apps/unity-shell/Assets/Scripts/Runtime/RokidPresentationMode.cs"),
    readText("apps/unity-shell/Assets/Scripts/Runtime/InnerWorldMissionState.cs"),
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
  assert(controller.includes("private DeviceManifestResponse deviceManifest;"), "Unity controller device manifest field missing");
  assert(controller.includes("RegisterDeviceSession"), "Unity controller device register coroutine missing");
  assert(controller.includes("PostDeviceHeartbeat"), "Unity controller device heartbeat coroutine missing");
  assert(controller.includes("apiClient.DeviceRegisterUrl"), "Unity controller device register URL missing");
  assert(controller.includes("apiClient.DeviceHeartbeatUrl"), "Unity controller device heartbeat URL missing");
  assert(controller.includes("private WallCalibrationManifest wallCalibrationManifest;"), "Unity controller wall calibration manifest field missing");
  assert(controller.includes("private FieldMarkerManifest fieldMarkerManifest;"), "Unity controller field marker manifest field missing");
  assert(controller.includes("private FieldAcceptanceManifest fieldAcceptanceManifest;"), "Unity controller field acceptance manifest field missing");
  assert(controller.includes("private string fieldAcceptanceLine"), "Unity controller field acceptance status line missing");
  assert(controller.includes("yield return LoadWallCalibrationManifest();"), "Unity controller startup wall calibration fetch missing");
  assert(controller.includes("yield return LoadDeviceManifest();"), "Unity controller startup device manifest fetch missing");
  assert(controller.includes("yield return LoadFieldMarkerManifest();"), "Unity controller startup field marker fetch missing");
  assert(controller.includes("yield return LoadFieldAcceptanceManifest();"), "Unity controller startup field acceptance fetch missing");
  assert(controller.includes("LoadWallCalibrationManifest"), "Unity controller wall calibration coroutine missing");
  assert(controller.includes("LoadFieldMarkerManifest"), "Unity controller field marker coroutine missing");
  assert(controller.includes("LoadFieldAcceptanceManifest"), "Unity controller field acceptance coroutine missing");
  assert(controller.includes("LoadDeviceManifest"), "Unity controller device manifest coroutine missing");
  assert(controller.includes("bootstrap.endpoints.device_manifest"), "Unity controller bootstrap device manifest endpoint missing");
  assert(controller.includes("apiClient.DeviceManifestUrl"), "Unity controller device manifest fallback URL missing");
  assert(controller.includes("JsonUtility.FromJson<DeviceManifestResponse>"), "Unity controller device manifest parsing missing");
  assert(controller.includes("BuildAdapterChecklistReportPayload"), "Unity controller adapter checklist report payload missing");
  assert(controller.includes("BuildAdapterReadinessStatusLine"), "Unity controller adapter readiness HUD status missing");
  assert(controller.includes("BuildAdapterReadinessHeartbeatLine"), "Unity controller adapter readiness heartbeat line missing");
  assert(controller.includes("BuildAdapterReadinessCompactLine"), "Unity controller adapter readiness compact line missing");
  assert(controller.includes("AdapterChecklistSummaryLabel"), "Unity controller adapter checklist summary missing");
  assert(controller.includes("FindAdapterChecklistItem"), "Unity controller adapter checklist lookup missing");
  assert(controller.includes("RKCameraRig") && controller.includes("RKInput 3DoF ray") && controller.includes("PointableUI"), "Unity controller Rokid live adapter checklist UI missing");
  assert(controller.includes("A2/A3 ImageTracking") && controller.includes("SLAM heartbeat"), "Unity controller image tracking / SLAM checklist UI missing");
  assert(controller.includes("a1_spatial_entry_experience"), "Unity controller A1 spatial entry contract missing");
  assert(controller.includes("A1EntryConfirmMinDistanceMeters = 0.4f") && controller.includes("A1EntryConfirmMaxDistanceMeters = 0.5f"), "Unity controller A1 deliberate confirmation window must be 0.4m-0.5m");
  assert(controller.includes("BuildA1SpatialEntryHudLine") && controller.includes("BuildA1SpatialEntryHeartbeatLine"), "Unity controller A1 entry HUD/heartbeat lines missing");
  assert(controller.includes("entry_confirmation_status") && controller.includes("spatial_layer_transition_state") && controller.includes("开启空间层"), "Unity controller A1 confirmation / spatial layer transition fields missing");
  assert(controller.includes("fallback_not_hardware_ready") && controller.includes("fallback_hardware_ready false"), "Unity controller fallback must not claim hardware ready for A1 entry");
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
  assert(controller.includes("BuildFieldMarkerImageTargetAssetLine"), "Unity controller image target asset active line missing");
  assert(controller.includes("FieldMarkerImageTargetAssetReadinessLabel"), "Unity controller image target asset readiness line missing");
  assert(controller.includes("FieldMarkerImageTargetAssetsLabel"), "Unity controller image target asset status summary missing");
  assert(controller.includes("CreateHudPanel") && controller.includes("Target Card") && controller.includes("Radar Strip"), "Unity controller premium HUD panels missing");
  assert(controller.includes("CreateAnchorHalo") && controller.includes("BuildSpatialRouteLine") && controller.includes("TickPremiumSpatialSurfaces"), "Unity controller premium spatial anchor surfaces missing");
  assert(controller.includes("BuildPremiumTargetCardLine") && controller.includes("ImageTargetAssetCardLine") && controller.includes("ArShellStatusCompactLabel"), "Unity controller premium target card / AR shell status missing");
  assert(controller.includes("ApplyPresentationStrategyToMissionState"), "Unity controller must apply presentation strategy to mission state");
  assert(controller.includes("marker.image_target_asset"), "Unity controller must consume marker image_target_asset");
  assert(controller.includes("unity_target_library_status"), "Unity controller must expose Unity target library status");
  assert(controller.includes("rokid_import_status"), "Unity controller must expose Rokid import status");
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
  assert(/BuildFieldMarkerStatusLine\(\)[\s\S]*BuildFieldMarkerReadinessLine[\s\S]*FieldMarkerImageTargetAssetsLabel[\s\S]*BuildFieldMarkerActiveLine/.test(controller), "Unity controller field marker status must summarize image target asset import state");
  assert(/BuildFieldMarkerHeartbeatLine\(\)[\s\S]*BuildFieldMarkerReadinessLine[\s\S]*FieldMarkerImageTargetAssetsLabel/.test(controller), "Unity controller field marker heartbeat must include image target asset status");
  assert(/BuildFieldMarkerActiveLine\(\)[\s\S]*BuildFieldMarkerImageTargetAssetLine\(marker\)/.test(controller), "Unity controller active marker line must consume image target asset details");
  assert(/BuildFieldMarkerImageTargetAssetLine\(FieldMarkerAnchor marker\)[\s\S]*marker\.image_target_asset[\s\S]*asset\.asset_id[\s\S]*asset\.unity_target_library_status[\s\S]*asset\.rokid_import_status[\s\S]*ImageTargetPhysicalSizeLabel\(asset\)[\s\S]*asset\.dpi[\s\S]*asset\.print_version[\s\S]*ShortSha\(asset\.sha256\)[\s\S]*asset\.asset_path/.test(controller), "Unity controller image target asset line must consume required asset fields");
  assert(/ImageTargetPhysicalSizeLabel\(FieldMarkerImageTargetAsset asset\)[\s\S]*asset\.physical_width_mm[\s\S]*asset\.physical_height_mm/.test(controller), "Unity controller image target asset line must consume physical target dimensions");
  assert(/BuildFieldAcceptanceHeartbeatLine\(\)[\s\S]*FieldAcceptanceReadyForHardwareFlag[\s\S]*FieldAcceptanceHardwareEvidenceCount[\s\S]*FieldAcceptanceTrackingGuardLabel[\s\S]*simulator_rehearsal_is_not_hardware_ready/.test(controller), "Unity controller field acceptance heartbeat must include hardware evidence and simulator guard flags");
  assert(controller.includes("a1_spatial_entry_experience"), "Unity controller A1 spatial entry experience token missing");
  assert(controller.includes("A1EntryConfirmMinDistanceMeters = 0.4f") && controller.includes("A1EntryConfirmMaxDistanceMeters = 0.5f"), "Unity controller A1 deliberate confirmation distance guard missing");
  assert(controller.includes("ResetA1SpatialEntryExperience") && controller.includes("PrimeA1SpatialEntryLock") && controller.includes("ConfirmA1SpatialEntryExperience"), "Unity controller A1 entry state machine missing");
  assert(/ConfirmEntryOrCompleteNextStep\(\)[\s\S]*ShouldConfirmA1SpatialEntry\(\)[\s\S]*ConfirmA1SpatialEntryExperience/.test(controller), "Unity controller A1 entry confirmation must gate first action");
  assert(/BuildA1SpatialEntryHeartbeatLine\(\)[\s\S]*entry_confirmation_status[\s\S]*confirmation_window_m[\s\S]*fallback_hardware_ready false/.test(controller), "Unity controller A1 heartbeat must expose confirmation and fallback guard");
  assert(/BuildSdkBindingStatusPayload[\s\S]*adapter_checklist = BuildAdapterChecklistReportPayload\(report\)/.test(controller), "Unity SDK binding payload must include adapter checklist report");
  assert(/BuildAdapterChecklistReportPayload\(RokidSdkBindingReport report\)[\s\S]*a1_entry_lock_ready = IsA1EntryLockReady\(\)[\s\S]*spatial_panels_readable = a1SpatialEntryConfirmed/.test(controller), "Unity adapter checklist report must include A1 lock rehearsal signal");
  assert(controller.includes("fallback_not_hardware_ready") && controller.includes("fallback does not claim hardware ready"), "Unity A1 entry labels must not claim hardware ready");
  assert(/private IEnumerator LoadDeviceManifest\(\)[\s\S]*bootstrap\.endpoints\.device_manifest[\s\S]*apiClient\.DeviceManifestUrl[\s\S]*UnityWebRequest\.Get\(url\)[\s\S]*JsonUtility\.FromJson<DeviceManifestResponse>/.test(controller), "Unity controller must actively GET and parse the device manifest");
  assert(/BuildAdapterReadinessCompactLine\(\)[\s\S]*RKCameraRig[\s\S]*rk_camera_rig[\s\S]*RKInput 3DoF ray[\s\S]*rk_input_3dof_ray[\s\S]*PointableUI[\s\S]*pointable_ui[\s\S]*A1 entry lock[\s\S]*A1EntryAdapterStatus[\s\S]*A2\/A3 ImageTracking[\s\S]*a2_a3_image_tracking[\s\S]*SLAM heartbeat[\s\S]*slam_heartbeat/.test(controller), "Unity controller adapter readiness must expose RKCameraRig/RKInput/PointableUI/A1/ImageTracking/SLAM checklist");
  assert(/BuildAdapterReadinessHeartbeatLine\(\)[\s\S]*BuildAdapterReadinessCompactLine[\s\S]*AdapterChecklistSummaryLabel[\s\S]*live_binding_ready/.test(controller), "Unity controller heartbeat must include adapter readiness checklist status");
  assert(/AdapterChecklistSummaryLabel\(\)[\s\S]*hardware acceptance remains gated/.test(controller), "Unity controller must not claim hardware ready from adapter checklist alone");
  assert(/BuildAdapterChecklistReportPayload[\s\S]*a1_entry_lock_ready\s*=\s*IsA1EntryLockReady\(\)[\s\S]*entry_lock_ready\s*=\s*IsA1EntryLockReady\(\)[\s\S]*trusted_hardware_proof_ready\s*=\s*false/.test(controller), "Unity controller A1 entry checklist must report local lock without trusted hardware proof");
  assert(controller.includes("trustedHardwareMissionAssistLine"), "Unity trusted hardware mission assist HUD line missing");
  assert(/AdvanceMissionFromTrustedImageObservation\(string anchorId, WallCalibrationObservation observation\)[\s\S]*IsTrustedAcceptedHardwareObservation\(observation\)[\s\S]*trusted A1 target locked[\s\S]*deliberate entry confirmation still required/.test(controller), "Unity trusted target mission assist must gate A1 behind deliberate confirmation");
  assert(/AdvanceMissionFromTrustedImageObservation\(string anchorId, WallCalibrationObservation observation\)[\s\S]*PostInteraction\("read", InnerWorldMissionStates\.Reading, "A2"\)[\s\S]*PostInteraction\("find_year", InnerWorldMissionStates\.Doing, "A2"\)/.test(controller), "Unity trusted A2 image target must advance read/find_year only after trusted hardware observation");
  assert(/private IEnumerator PostInteraction\(string stepId, string missionStateValue, string anchorId\)[\s\S]*session_id = CurrentCalibrationSessionId\(\)[\s\S]*device_id = string\.IsNullOrWhiteSpace\(deviceId\)[\s\S]*anchor_id = SafeLabel\(anchorId/.test(controller), "Unity mission interactions must carry trusted provenance session/device/anchor fields");
  assert(/private IEnumerator PostServiceAction\(\)[\s\S]*session_id = CurrentCalibrationSessionId\(\)[\s\S]*device_id = string\.IsNullOrWhiteSpace\(deviceId\)[\s\S]*anchor_id = CurrentActiveAnchorId\(\)/.test(controller), "Unity service action must carry trusted provenance session/device/anchor fields");
  assert(/private IEnumerator PostWriteBack\(string text\)[\s\S]*session_id = CurrentCalibrationSessionId\(\)[\s\S]*device_id = string\.IsNullOrWhiteSpace\(deviceId\)[\s\S]*anchor_id = "A3"/.test(controller), "Unity write-back must carry trusted provenance session/device/anchor fields");
  assert(/private IEnumerator SwitchUserB\(\)[\s\S]*session_id = CurrentCalibrationSessionId\(\)[\s\S]*device_id = string\.IsNullOrWhiteSpace\(deviceId\)[\s\S]*anchor_id = "A3"/.test(controller), "Unity User B readback confirmation must carry trusted provenance session/device/anchor fields");
  assert(/bool serviceReady = IsMissionStepComplete\("service_action"\)\s*\|\|\s*MissionStateIs\(InnerWorldMissionStates\.ServiceReady\);/.test(controller), "Unity trusted A3 image target must require completed service_action or service_ready state before TimeMark write-back");
  assert(!/bool serviceReady =[\s\S]{0,220}(Writing|WritebackReady)/.test(controller), "Unity trusted A3 TimeMark gate must not accept loose writing/writeback-ready labels without service_action");
  assert(/AdvanceMissionFromTrustedImageObservation\(string anchorId, WallCalibrationObservation observation\)[\s\S]*service action required before TimeMark[\s\S]*PostWriteBack\(text\)/.test(controller), "Unity trusted A3 image target must gate TimeMark write-back behind service action");
  assert(imageTrackingObserver.includes("IW_TARGET_EVENT") && imageTrackingObserver.includes("image_index=") && imageTrackingObserver.includes("size_m=") && imageTrackingObserver.includes("pose_position_m="), "Rokid image tracking observer must log stable IW_TARGET_EVENT diagnostics");
  assert(controller.includes("IW_TARGET_IGNORED_UNKNOWN_INDEX") && controller.includes("IW_TARGET_GATE_LIVE_PAIRING_REQUIRED") && controller.includes("IW_TARGET_THROTTLED"), "Unity trusted target diagnostics must expose unknown-index, live-pairing gate, and throttle tokens");
  assert(controller.includes("IW_TARGET_POST_START") && controller.includes("IW_TARGET_POST_RESULT") && controller.includes("IW_TARGET_POST_FAIL"), "Unity trusted target diagnostics must expose POST start/result/fail tokens");
  assert(controller.includes("IW_TARGET_MISSION_ASSIST") && controller.includes("a2_read_find_year_posted") && controller.includes("a3_service_action_required") && controller.includes("a3_timemark_write_back_posted"), "Unity trusted target diagnostics must expose mission assist outcomes");
  assert(controller.includes("TrustedRokidHardwareObservationGateReason") && controller.includes("device_session_missing") && controller.includes("operator_pairing_missing") && controller.includes("live_binding_not_ready"), "Unity target diagnostics must preserve specific live-pairing gate reasons");
  assert(controller.includes("pendingTrustedTargetObservations") && controller.includes("QueuePendingTrustedTargetObservation") && controller.includes("TryFlushPendingTrustedTargetObservations"), "Unity trusted target events must queue until live-bound heartbeat ack");
  assert(controller.includes("ServerAckedLiveBindingReady") && controller.includes("server_live_binding_heartbeat_ack_missing") && controller.includes("lastDeviceHeartbeat.session_id"), "Unity trusted target gate must require server-acknowledged live binding heartbeat for the same session");
  assert(controller.includes("lastDeviceHeartbeat.hardware_acceptance_eligible") && controller.includes("lastDeviceHeartbeat.pairing") && controller.includes("lastDeviceHeartbeat.pairing.paired"), "Unity trusted target gate must require heartbeat-acknowledged operator pairing and hardware eligibility");
  const targetLogLines = `${controller}\n${imageTrackingObserver}`.split(/\r?\n/).filter((line) => line.includes("IW_TARGET_"));
  assert(targetLogLines.length >= 8, "Unity target diagnostics token coverage too small");
  assert(!targetLogLines.some((line) => /(operatorPairingCode|pairing_code|CleanOperatorPairingCode|deviceSessionId|session_id)/.test(line)), "Unity IW_TARGET diagnostics must not log raw pairing codes or session ids");
  const rehearsalObservationStart = controller.indexOf("private IEnumerator SubmitWallCalibrationObservation(string trackingMode)");
  const trustedObservationStart = controller.indexOf("public void SubmitRokidTrackedImageObservation");
  const rehearsalObservationBody = rehearsalObservationStart >= 0 && trustedObservationStart > rehearsalObservationStart
    ? controller.slice(rehearsalObservationStart, trustedObservationStart)
    : "";
  assert(rehearsalObservationBody && !rehearsalObservationBody.includes("AdvanceMissionFromTrustedImageObservation"), "Unity simulator/manual calibration observations must not trigger trusted mission assist");
  assert(/private string BuildRuntimeContractLine\(\)[\s\S]*BuildWallCalibrationStatusLine[\s\S]*BuildFieldMarkerStatusLine[\s\S]*BuildFieldAcceptanceStatusLine/.test(controller), "Unity controller HUD runtime line must expose wall calibration, field marker, and field acceptance status");
  assert(/private string BuildWallCalibrationHeartbeatLine\(\)[\s\S]*BuildWallCalibrationObservationLine[\s\S]*BuildFieldMarkerHeartbeatLine[\s\S]*BuildFieldAcceptanceHeartbeatLine/.test(controller), "Unity controller heartbeat payload must expose last calibration observation, field marker status, and field acceptance status");
  assert(/private void RefreshHud\(\)[\s\S]*FieldAcceptanceHudBadge/.test(controller), "Unity controller main HUD must expose field acceptance status");
  assert(/private void RefreshTargetHud\(\)[\s\S]*BuildWallCalibrationObservationLine[\s\S]*BuildFieldMarkerActiveLine[\s\S]*BuildFieldAcceptanceDebugLine/.test(controller), "Unity controller target HUD must expose last calibration observation, active field marker, and field acceptance details");
  assert(/private void RefreshInputStatusLine\(\)[\s\S]*BuildWallCalibrationObservationLine[\s\S]*BuildFieldMarkerReadinessLine[\s\S]*FieldAcceptanceHudBadge/.test(controller), "Unity controller device/input status must expose calibration observation, field marker readiness, and field acceptance status");
  assert(/BuildPremiumTargetCardLine\(string debugLine\)[\s\S]*SpatialFocusLine[\s\S]*FieldMarkerTargetSummary[\s\S]*ImageTargetAssetCardLine[\s\S]*CalibrationCompactLine[\s\S]*AcceptanceCompactLine/.test(controller), "Unity controller premium target card must summarize focus, marker, image asset, calibration, and acceptance");
  assert(/BuildRadarHudLine\(\)[\s\S]*RadarAnchorSegment\("A1"[\s\S]*RadarAnchorSegment\("A2"[\s\S]*RadarAnchorSegment\("A3"[\s\S]*ArShellStatusCompactLabel/.test(controller), "Unity controller radar HUD must expose A1/A2/A3 route and AR shell status");
  assert(/BuildSdkBindingStatusPayload[\s\S]*message = BuildFieldAcceptanceHeartbeatMessage\(report.Message\)/.test(controller), "Unity controller SDK heartbeat payload must include field acceptance status");
  assert(/private string BuildFieldAcceptanceHeartbeatMessage\(string sdkMessage\)[\s\S]*BuildWallCalibrationHeartbeatMessage\(sdkMessage\)[\s\S]*BuildA1SpatialEntryHeartbeatLine\(\)[\s\S]*BuildAdapterReadinessHeartbeatLine\(\)[\s\S]*BuildFieldAcceptanceHeartbeatLine\(\)[\s\S]*BuildFieldAcceptanceBlockingLine\(\)/.test(controller), "Unity controller field acceptance heartbeat message must include A1 entry, adapter readiness, wall calibration, acceptance summary, and blockers");
  assert(controller.includes("BuildSdkBindingStatusPayload"), "Unity controller SDK binding heartbeat payload missing");
  assert(controller.includes("BuildDeviceRegisterRequest"), "Unity controller device register payload builder missing");
  assert(/\[NonSerialized\]\s+public string operatorPairingCode/.test(controller), "Unity controller pairing code must be non-serialized runtime memory");
  assert(controller.includes("INNERWORLD_OPERATOR_PAIRING_CODE") && controller.includes("--innerworld-pairing-code"), "Unity controller pairing code runtime injection path missing");
  assert(controller.includes("CleanOperatorPairingCode"), "Unity controller pairing code sanitizer missing");
  assert(controller.includes("compact.Length == 8") && controller.includes("compact.Substring(0, 4)") && controller.includes("compact.Substring(4, 4)"), "Unity controller pairing code sanitizer must normalize to ABCD-EFGH or empty");
  assert(controller.includes("devicePairingLine"), "Unity controller pairing status line missing");
  assert(controller.includes("PairingHudBadge"), "Unity controller pairing HUD badge missing");
  assert(/private DeviceRegisterRequest BuildDeviceRegisterRequest\(\)[\s\S]*pairing_code\s*=\s*CleanOperatorPairingCode\(\)/.test(controller), "Unity controller must put cleaned pairing_code into DeviceRegisterRequest");
  assert(/RefreshHud\(\)[\s\S]*PairingHudBadge\(\)/.test(controller), "Unity HUD must expose pairing status without showing the code");
  assert(/BuildRuntimeContractLine\(\)[\s\S]*devicePairingLine/.test(controller), "Unity runtime detail must expose pairing status");
  assert(/RefreshInputStatusLine\(\)[\s\S]*PairingHudBadge\(\)/.test(controller), "Unity input status must expose pairing status");
  assert(/Debug\.Log\([^)]*devicePairingLine/.test(controller), "Unity log must expose pairing status without showing the code");
  assert(!/Debug\.Log(?:Warning|Error)?\([^)]*(operatorPairingCode|pairing_code|CleanOperatorPairingCode)/.test(controller), "Unity controller must not log plaintext pairing code");
  assert(!/\[Header\(\"Device Pairing\"\)\]\s+public string operatorPairingCode/.test(controller), "Unity controller must not expose pairing code as serialized Inspector field");
  assert(!/(PlayerPrefs\.SetString|File\.WriteAllText|File\.AppendAllText|localStorage|sessionStorage)[\s\S]{0,120}(operatorPairingCode|pairing_code|pairing code)/i.test(controller), "Unity controller must not persist plaintext pairing code");
  assert(controller.includes("BuildDeviceHeartbeatRequest"), "Unity controller device heartbeat payload builder missing");
  assert(/BuildDeviceHeartbeatRequest\(\)[\s\S]*input_frame\s*=\s*BuildDeviceInputFramePayload\(\)/.test(controller), "Unity controller heartbeat must include sanitized input_frame");
  assert(controller.includes("BuildDeviceInputFramePayload") && controller.includes("DeviceInputFramePayload"), "Unity controller input frame payload builder missing");
  assert(controller.includes("pointable_ui_focus") && controller.includes("voice_text_present"), "Unity controller input frame focus/voice evidence missing");
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
  assert(uxrInput.includes("using Rokid.UXR.Module;"), "Rokid UXR input must bind the official SDK namespace");
  assert(uxrInput.includes("RKNativeInput"), "Rokid UXR input must bind RKNativeInput");
  assert(uxrInput.includes("rokid-uxr-rkinput-3dof"), "Rokid UXR input live adapter name missing");
  assert(uxrInput.includes("public bool IsSdkBindingReady"), "Rokid UXR input SDK readiness flag missing");
  assert(uxrInput.includes("KEY_OK") && uxrInput.includes("KEY_BACK") && uxrInput.includes("KEY_MOUSE_FIRST"), "Rokid UXR input key mapping missing");
  assert(uxrOverlay.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR overlay file must be fully guarded");
  assert(uxrOverlay.includes("rokid-uxr-worldspace-overlay"), "Rokid UXR overlay live adapter name missing");
  assert(uxrOverlay.includes("public bool IsSdkBindingReady"), "Rokid UXR overlay SDK readiness flag missing");
  assert(presentationMode.includes("RokidSpatialEntryStates"), "Unity presentation strategy spatial entry states missing");
  assert(presentationMode.includes("RokidImageTargetLockStates"), "Unity presentation strategy image target lock states missing");
  assert(presentationMode.includes("RokidDiscoveryLayerStates"), "Unity presentation strategy discovery/radar states missing");
  assert(presentationMode.includes("RokidWritebackReadinessStates"), "Unity presentation strategy writeback readiness states missing");
  assert(presentationMode.includes("RokidDeviceSafetyModes"), "Unity presentation strategy operator-safe device states missing");
  assert(presentationMode.includes("RokidA1SpatialEntryStates") && presentationMode.includes("a1_spatial_entry_experience") && presentationMode.includes("entry_confirmation_min_meters") && presentationMode.includes("fallback_claims_hardware_ready = false"), "Unity presentation strategy A1 spatial entry slice missing");
  assert(presentationMode.includes("premium_metrics"), "Unity presentation strategy premium metrics missing");
  assert(missionState.includes("public InnerWorldArShellState ar_shell"), "Unity mission state AR shell aggregate missing");
  assert(missionState.includes("ApplyPresentationStrategy") && missionState.includes("RefreshArShellState"), "Unity mission state must consume presentation strategy and refresh AR shell state");
  assert(missionState.includes("image_target_lock_quality") && missionState.includes("discovery_radar_anchor_count") && missionState.includes("operator_safe_device_mode"), "Unity mission state AR shell metrics missing");
  assert(missionState.includes("public string a1_spatial_entry_experience") && missionState.includes("public string entry_confirmation_status") && missionState.includes("public string spatial_layer_transition_state") && missionState.includes("fallback_claims_hardware_ready"), "Unity mission state A1 entry runtime fields missing");
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
  assert(client.includes("DeviceAdapterChecklistUrl") && client.includes("device_adapter_checklist = Endpoint"), "Unity endpoint map device adapter checklist missing");
  assert(payloads.includes("public RokidLiveAdapterChecklistReport adapter_checklist;"), "Unity SDK binding adapter checklist payload missing");
  assert(payloads.includes("public bool rk_camera_rig_ready;") && payloads.includes("public bool a2_a3_image_tracking_ready;") && payloads.includes("public bool trusted_hardware_proof_ready;"), "Unity adapter checklist report keys missing");
  assert(dtos.includes("public sealed class DeviceRuntimeSessionResponse"), "Unity device register response DTO missing");
  assert(dtos.includes("public sealed class DeviceManifestResponse"), "Unity device manifest response DTO missing");
  assert(dtos.includes("public DeviceA1SpatialEntryExperience a1_spatial_entry_experience;"), "Unity DTO A1 spatial entry field missing");
  assert(dtos.includes("public sealed class DeviceA1SpatialEntryExperience") && dtos.includes("public string entry_confirmation_status;") && dtos.includes("public string spatial_layer_transition_state;") && dtos.includes("public bool fallback_claims_hardware_ready;"), "Unity DTO A1 spatial entry contract missing");
  assert(dtos.includes("public SpaceApiEndpoint device_adapter_checklist;"), "Unity endpoint DTO device adapter checklist missing");
  assert(dtos.includes("public DeviceAdapterSlot[] adapter_slots;"), "Unity device manifest adapter_slots DTO missing");
  assert(dtos.includes("public DeviceAdapterReadiness adapter_readiness;"), "Unity device manifest adapter_readiness DTO missing");
  assert(dtos.includes("public DeviceA1SpatialEntryExperience a1_spatial_entry_experience;") && dtos.includes("public bool fallback_claims_hardware_ready;"), "Unity A1 spatial entry DTO missing");
  assert(dtos.includes("public sealed class DeviceAdapterChecklistItem"), "Unity device manifest adapter checklist DTO missing");
  assert(dtos.includes("public RokidSdkBindingManifestStatus sdk_binding_status;"), "Unity device manifest SDK binding status DTO missing");
  assert(dtos.includes("public RokidSdkClientReportContract client_report_contract;"), "Unity SDK binding report contract DTO missing");
  assert(dtos.includes("public sealed class DeviceHeartbeatResponse"), "Unity device heartbeat response DTO missing");
  assert(dtos.includes("public DevicePairingState pairing;") && dtos.includes("public bool hardware_acceptance_eligible;"), "Unity heartbeat DTO must include pairing and hardware eligibility ack");
  assert(dtos.includes("public sealed class DeviceHealthStatus"), "Unity device health DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationManifest"), "Unity wall calibration manifest DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationObservationResult"), "Unity wall calibration observation result DTO missing");
  assert(dtos.includes("public bool hardware_observation_trusted;"), "Unity wall calibration acceptance trusted hardware flag DTO missing");
  assert(dtos.includes("public WallCalibrationHardwareSession hardware_session;"), "Unity wall calibration hardware session proof DTO missing");
  assert(dtos.includes("public sealed class WallCalibrationHardwareSession"), "Unity wall calibration hardware session DTO missing");
  assert(dtos.includes("public int hardware_calibrated_anchor_count"), "Unity wall calibration hardware-only count DTO missing");
  assert(dtos.includes("public string[] hardware_calibrated_anchor_ids"), "Unity wall calibration hardware-only IDs DTO missing");
  assert(dtos.includes("public bool rehearsal_ready"), "Unity wall calibration rehearsal readiness DTO missing");
  assert(dtos.includes("public sealed class FieldMarkerManifest"), "Unity field marker manifest DTO missing");
  assert(dtos.includes("public sealed class FieldMarkerAnchor"), "Unity field marker anchor DTO missing");
  assert(dtos.includes("public FieldMarkerImageTargetAsset image_target_asset;"), "Unity field marker image_target_asset DTO field missing");
  assert(dtos.includes("public sealed class FieldMarkerImageTargetAsset"), "Unity field marker image target asset DTO missing");
  assert(dtos.includes("public string asset_id;"), "Unity image target asset_id DTO missing");
  assert(dtos.includes("public string asset_path;"), "Unity image target asset_path DTO missing");
  assert(dtos.includes("public string sha256;"), "Unity image target sha256 DTO missing");
  assert(dtos.includes("public float physical_width_mm;"), "Unity image target physical_width_mm DTO missing");
  assert(dtos.includes("public float physical_height_mm;"), "Unity image target physical_height_mm DTO missing");
  assert(dtos.includes("public int dpi;"), "Unity image target dpi DTO missing");
  assert(dtos.includes("public string print_version;"), "Unity image target print_version DTO missing");
  assert(dtos.includes("public string unity_target_library_status;"), "Unity image target Unity import status DTO missing");
  assert(dtos.includes("public string rokid_import_status;"), "Unity image target Rokid import status DTO missing");
  assert(dtos.includes("public sealed class FieldAcceptanceManifest"), "Unity field acceptance manifest DTO missing");
  assert(dtos.includes("public FieldAcceptanceSummary summary"), "Unity field acceptance summary DTO missing");
  assert(dtos.includes("public FieldAcceptanceGate[] gates"), "Unity field acceptance gates DTO missing");
  assert(dtos.includes("public FieldAcceptanceBlockingItem[] blocking_items"), "Unity field acceptance blocking item DTO missing");
  assert(dtos.includes("public bool simulator_rehearsal_is_not_hardware_ready"), "Unity field acceptance simulator guard DTO missing");
  assert(payloads.includes("public sealed class DeviceRegisterRequest"), "Unity device register request DTO missing");
  assert(payloads.includes("public string pairing_code;"), "Unity device register request pairing_code field missing");
  assert(payloads.includes("public sealed class DeviceHeartbeatRequest"), "Unity device heartbeat request DTO missing");
  assert(/public sealed class InteractionRequest[\s\S]*public string session_id;[\s\S]*public string device_id;[\s\S]*public string anchor_id;/.test(payloads), "Unity interaction request provenance fields missing");
  assert(/public sealed class ServiceActionRequest[\s\S]*public string session_id;[\s\S]*public string device_id;/.test(payloads), "Unity service action request provenance fields missing");
  assert(/public sealed class WriteBackRequest[\s\S]*public string session_id;[\s\S]*public string device_id;/.test(payloads), "Unity write-back request provenance fields missing");
  assert(payloads.includes("public DeviceInputFramePayload input_frame;"), "Unity device heartbeat input_frame DTO missing");
  assert(payloads.includes("public sealed class DeviceInputFramePayload"), "Unity device input frame payload DTO missing");
  assert(payloads.includes("public DeviceVector3 ray_origin;") && payloads.includes("public DeviceVector3 ray_direction;"), "Unity device input frame ray DTO missing");
  assert(payloads.includes("public bool pointable_ui_focus;"), "Unity device input frame PointableUI focus DTO missing");
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
