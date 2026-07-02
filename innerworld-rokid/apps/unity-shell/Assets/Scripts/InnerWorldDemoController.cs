using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using InnerWorld.Rokid.Protocol;
using InnerWorld.Rokid.Runtime;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Networking;
using UnityEngine.UI;

namespace InnerWorld.Rokid
{
    public sealed class InnerWorldDemoController : MonoBehaviour
    {
        [Header("Localhost API")]
        public string baseUrl = "http://localhost:5177";
        public string spaceId = "innerworld_campus_wall";
        public string deviceProfile = "rokid-ar";
        public string presentationMode = "desktop_fallback";
        public string configFileName = "innerworld-config.json";

        [Header("Scene")]
        public Vector3 cameraPosition = new Vector3(0f, 1.45f, -0.35f);
        public Vector3 wallCenter = new Vector3(0f, 1.35f, 3.2f);

        private readonly List<GameObject> spawnedObjects = new List<GameObject>();
        private readonly Dictionary<string, AnchorVisualState> anchorVisuals = new Dictionary<string, AnchorVisualState>();
        private SpaceResponse space;
        private Text statusText;
        private Text detailText;
        private Text stepText;
        private Text sourceText;
        private Text targetText;
        private Text keyHintText;
        private int localStepIndex;
        private bool usingFallback;
        private Font uiFont;
        private SpaceApiClient apiClient;
        private DeviceBootstrapResponse bootstrap;
        private InnerWorldRuntimeConfig runtimeConfig;
        private InnerWorldMissionState missionState = new InnerWorldMissionState();
        private InnerWorldEvidenceChainResponse evidenceChain;
        private InnerWorldSessionPlanResponse sessionPlan;
        private WallCalibrationManifest wallCalibrationManifest;
        private FieldMarkerManifest fieldMarkerManifest;
        private RokidPresentationStrategy presentationStrategy;
        private RokidAdapterBoundaryStatus rokidAdapterStatus;
        private EditorRokidInputSource editorRokidInputSource;
        private IRokidInputSource rokidInputSource;
        private IRokidInputStateSink rokidInputStateSink;
        private IRokidOverlayRenderer rokidOverlayRenderer;
        private DeviceRuntimeSessionResponse deviceSession;
        private DeviceHeartbeatResponse lastDeviceHeartbeat;
        private string deviceSessionId = string.Empty;
        private string deviceId = string.Empty;
        private string deviceRuntimeLine = "device session pending";
        private string wallCalibrationLine = "wall calibration pending";
        private string fieldMarkerLine = "field markers pending";
        private WallCalibrationObservationResult lastWallCalibrationObservationResult;
        private WallCalibrationObservation lastWallCalibrationObservation;
        private string wallCalibrationObservationLine = "calibration observation pending";
        private string calibrationRehearsalSessionId = string.Empty;
        private float heartbeatClockSeconds;
        private bool heartbeatInFlight;
        private bool wallCalibrationObservationInFlight;
        private string currentGazeAnchorId = string.Empty;
        private string currentGazeAnchorLabel = string.Empty;
        private bool currentGazeSelecting;
        private string selectedAnchorId = string.Empty;
        private GameObject gazeReticle;
        private LineRenderer gazeReticleLine;
        private Material gazeReticleMaterial;

        private const float GazeHitRadiusMeters = 0.16f;
        private const int GazeReticleSegments = 48;
        private const string UnityClientVersion = "unity-runtime-0.2.0";

        private void Awake()
        {
            ApplyRuntimeConfig();
            RefreshApiClient();
            CreateRokidInputSource();
            uiFont = Font.CreateDynamicFontFromOSFont(new[] { "Microsoft YaHei UI", "Microsoft YaHei", "Arial" }, 16);
            EnsureCameraAndLight();
            EnsureEventSystem();
            BuildWall();
            BuildGazeReticle();
            BuildHud();
        }

        private void Start()
        {
            StartCoroutine(BootstrapAndLoadSpace());
        }

        private void Update()
        {
            TickRokidInput();
            TickDeviceHeartbeat();

            if (Input.GetKeyDown(KeyCode.R)) StartCoroutine(BootstrapAndLoadSpace());
            if (!IsRokidInputActive() && Input.GetKeyDown(KeyCode.Space)) CompleteNextStep();
            if (Input.GetKeyDown(KeyCode.S)) StartCoroutine(PostServiceAction());
            if (Input.GetKeyDown(KeyCode.W)) StartCoroutine(PostWriteBack());
            if (Input.GetKeyDown(KeyCode.B)) StartCoroutine(SwitchUserB());
            if (Input.GetKeyDown(KeyCode.C)) StartCoroutine(SubmitWallCalibrationObservation("manual"));
        }

        private IEnumerator BootstrapAndLoadSpace()
        {
            EnsureApiClient();
            yield return LoadBootstrap();
            yield return LoadWallCalibrationManifest();
            yield return LoadFieldMarkerManifest();
            yield return RegisterDeviceSession();
            yield return SubmitWallCalibrationObservation("simulator");
            yield return LoadSpace();
        }

        private IEnumerator LoadBootstrap()
        {
            EnsureApiClient();
            bootstrap = null;
            SetRokidConnection(RokidConnectionStatus.Connecting, "Loading device bootstrap");
            SetStatus("Bootstrapping Rokid simulator", apiClient.BootstrapUrl);

            using (UnityWebRequest request = UnityWebRequest.Get(apiClient.BootstrapUrl))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    bootstrap = JsonUtility.FromJson<DeviceBootstrapResponse>(request.downloadHandler.text);
                    ApplyBootstrapRuntimeContract();
                    SetRokidConnection(RokidConnectionStatus.Connected, "Bootstrap ready");
                }
                else
                {
                    Debug.LogWarning("Device bootstrap unavailable: " + request.error);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }
        }

        private void TickRokidInput()
        {
            if (!IsRokidInputActive()) return;

            rokidInputSource.Tick(Time.deltaTime);
            UpdateRokidGazeTarget();
            RenderRokidOverlayFrame();

            RokidInputFrame frame;
            if (rokidInputSource.TryReadFrame(out frame))
            {
                ConsumeRokidInput(frame);
            }
        }

        private void UpdateRokidGazeTarget()
        {
            if (rokidInputSource == null || !rokidInputSource.IsPoseValid)
            {
                ClearGazeVisualTarget();
                return;
            }

            RokidGazeState gaze;
            if (!rokidInputSource.TryGetGaze(out gaze))
            {
                ClearGazeVisualTarget();
                return;
            }

            RaycastHit hit;
            AnchorClickTarget target;
            if (TryGetAnchorHit(gaze, out target, out hit))
            {
                AnchorData anchor = FindAnchor(target.anchorId);
                string label = anchor != null ? anchor.label : target.anchorId;
                if (rokidInputStateSink != null)
                {
                    rokidInputStateSink.SetGazeAnchorHit(target.anchorId, label, hit.point, hit.distance);
                }
                SetGazeVisualTarget(target.anchorId, label, hit.point, gaze.IsSelecting);
                return;
            }

            if (rokidInputStateSink != null)
            {
                rokidInputStateSink.ClearAnchorTarget();
            }
            ClearGazeVisualTarget();
        }

        private void ConsumeRokidInput(RokidInputFrame frame)
        {
            if (frame.Command == RokidInputCommand.Confirm)
            {
                CompleteNextStep();
            }
            else if (frame.Command == RokidInputCommand.Back)
            {
                StartCoroutine(BootstrapAndLoadSpace());
            }

            if (frame.HasGazeSelect && !IsPointerOverUi())
            {
                RokidAnchorTarget target = rokidInputSource != null ? rokidInputSource.AnchorTarget : frame.AnchorTarget;
                if (target.IsValid)
                {
                    SelectAnchor(target.AnchorId);
                }
            }
        }

        public void SelectAnchor(string anchorId)
        {
            if (space == null) return;

            selectedAnchorId = string.IsNullOrEmpty(anchorId) ? string.Empty : anchorId.Trim();
            AnchorData anchor = FindAnchor(anchorId);
            if (missionState != null)
            {
                missionState.SelectAnchor(selectedAnchorId, anchor != null ? anchor.label : string.Empty, anchor != null ? anchor.kind : string.Empty);
            }

            BeaconData[] beacons = FindBeacons(anchorId);
            string beaconLine = beacons.Length == 0 ? "No beacon yet" : beacons[beacons.Length - 1].display_text;

            SetStatus("Anchor " + anchorId + " selected", anchor != null ? anchor.label : "Unknown anchor");
            SetDetail(beaconLine + "\n" + GetMissionLine());
            RefreshAnchorVisualStates();
            RefreshTargetHud();
        }

        private IEnumerator LoadSpace()
        {
            EnsureApiClient();
            SetRokidConnection(RokidConnectionStatus.Connecting, "Loading space");
            SetStatus("Loading Space API", apiClient.SpaceUrl);
            usingFallback = false;

            string url = apiClient.SpaceUrl;
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    space = JsonUtility.FromJson<SpaceResponse>(request.downloadHandler.text);
                    usingFallback = false;
                    SetRokidConnection(RokidConnectionStatus.Connected, "Space loaded");
                }
                else
                {
                    bool canUseFallback = runtimeConfig == null || runtimeConfig.IsOfflineFallbackAllowed;
                    Debug.LogWarning("Space API unavailable: " + request.error);
                    if (canUseFallback)
                    {
                        space = JsonUtility.FromJson<SpaceResponse>(FallbackJson);
                        usingFallback = true;
                        SetRokidConnection(RokidConnectionStatus.OfflineFallback, "Using fallback JSON");
                    }
                    else
                    {
                        space = null;
                        usingFallback = false;
                        SetStatus("Space API unavailable", request.error + " " + url);
                        SetRokidConnection(RokidConnectionStatus.Error, "Offline fallback disabled");
                        yield break;
                    }
                }
            }

            SyncMissionStateFromSpace();
            RenderAnchors();
            RefreshHud();
            if (!usingFallback)
            {
                yield return LoadRuntimeServiceContracts();
            }
        }

        private IEnumerator PostInteraction(string stepId)
        {
            InteractionRequest request = new InteractionRequest
            {
                source = RequestSourceName(),
                user_id = CurrentUserId(),
                step_id = stepId,
                mission_state = "doing"
            };
            yield return PostJson(apiClient.InteractionsUrl, JsonUtility.ToJson(request), "Interaction posted");
            yield return LoadSpace();
        }

        private IEnumerator PostServiceAction()
        {
            ServiceActionRequest request = new ServiceActionRequest
            {
                source = RequestSourceName(),
                user_id = CurrentUserId(),
                action_id = "JOIN_EVENT_1430",
                label = "Join 14:30 demo",
                anchor_id = CurrentActiveAnchorId(),
                step_id = "service_action"
            };
            yield return PostJson(apiClient.ServiceActionsUrl, JsonUtility.ToJson(request), "Service action posted");
            yield return LoadSpace();
        }

        private IEnumerator RegisterDeviceSession()
        {
            EnsureApiClient();
            if (bootstrap == null)
            {
                deviceRuntimeLine = "device session skipped: bootstrap unavailable";
                yield break;
            }

            DeviceRegisterRequest payload = BuildDeviceRegisterRequest();
            string json = JsonUtility.ToJson(payload);
            SetRokidConnection(RokidConnectionStatus.Connecting, "Registering device runtime");

            using (UnityWebRequest request = new UnityWebRequest(apiClient.DeviceRegisterUrl, "POST"))
            {
                byte[] body = Encoding.UTF8.GetBytes(json);
                request.uploadHandler = new UploadHandlerRaw(body);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    deviceSession = JsonUtility.FromJson<DeviceRuntimeSessionResponse>(request.downloadHandler.text);
                    deviceSessionId = deviceSession != null ? deviceSession.session_id : string.Empty;
                    deviceId = deviceSession != null ? deviceSession.device_id : payload.device_id;
                    heartbeatClockSeconds = 0f;
                    deviceRuntimeLine = "device session " + ShortId(deviceSessionId) + " registered";
                    SetRokidConnection(RokidConnectionStatus.Connected, deviceRuntimeLine);
                    StartCoroutine(PostDeviceHeartbeat());
                }
                else
                {
                    deviceSession = null;
                    deviceSessionId = string.Empty;
                    deviceRuntimeLine = "device register failed: " + request.error;
                    Debug.LogWarning(deviceRuntimeLine);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }
        }

        private IEnumerator LoadWallCalibrationManifest()
        {
            EnsureApiClient();
            wallCalibrationManifest = null;
            wallCalibrationLine = "wall calibration loading";
            lastWallCalibrationObservationResult = null;
            lastWallCalibrationObservation = null;
            wallCalibrationObservationLine = "calibration observation pending";
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.wall_calibration : null, apiClient.WallCalibrationUrl);
            SetRokidConnection(RokidConnectionStatus.Connecting, wallCalibrationLine);

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        wallCalibrationManifest = JsonUtility.FromJson<WallCalibrationManifest>(request.downloadHandler.text);
                        if (wallCalibrationManifest == null || string.IsNullOrWhiteSpace(wallCalibrationManifest.schema))
                        {
                            wallCalibrationLine = "wall calibration invalid";
                            Debug.LogWarning(wallCalibrationLine + ": missing manifest schema | " + url);
                            SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationLine);
                        }
                        else
                        {
                            wallCalibrationLine = BuildWallCalibrationStatusLine();
                            Debug.Log("Wall calibration manifest loaded: " + wallCalibrationLine + " | " + url);
                            SetRokidConnection(RokidConnectionStatus.Connected, wallCalibrationLine);
                        }
                    }
                    catch (Exception error)
                    {
                        wallCalibrationManifest = null;
                        wallCalibrationLine = "wall calibration parse failed";
                        Debug.LogWarning(wallCalibrationLine + ": " + error.Message + " | " + url);
                        SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationLine);
                    }
                }
                else
                {
                    wallCalibrationLine = "wall calibration unavailable: " + request.error;
                    Debug.LogWarning(wallCalibrationLine + " | " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }

            if (space != null)
            {
                RefreshHud();
            }
        }

        private IEnumerator LoadFieldMarkerManifest()
        {
            EnsureApiClient();
            fieldMarkerManifest = null;
            fieldMarkerLine = "field markers loading";
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.field_markers : null, apiClient.FieldMarkersUrl);
            SetRokidConnection(RokidConnectionStatus.Connecting, fieldMarkerLine);

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        fieldMarkerManifest = JsonUtility.FromJson<FieldMarkerManifest>(request.downloadHandler.text);
                        if (fieldMarkerManifest == null || string.IsNullOrWhiteSpace(fieldMarkerManifest.schema))
                        {
                            fieldMarkerLine = "field markers invalid";
                            Debug.LogWarning(fieldMarkerLine + ": missing manifest schema | " + url);
                            SetRokidConnection(RokidConnectionStatus.Error, fieldMarkerLine);
                        }
                        else
                        {
                            fieldMarkerLine = BuildFieldMarkerStatusLine();
                            Debug.Log("Field marker manifest loaded: " + fieldMarkerLine + " | " + url);
                            SetRokidConnection(RokidConnectionStatus.Connected, fieldMarkerLine);
                        }
                    }
                    catch (Exception error)
                    {
                        fieldMarkerManifest = null;
                        fieldMarkerLine = "field markers parse failed";
                        Debug.LogWarning(fieldMarkerLine + ": " + error.Message + " | " + url);
                        SetRokidConnection(RokidConnectionStatus.Error, fieldMarkerLine);
                    }
                }
                else
                {
                    fieldMarkerLine = "field markers unavailable: " + request.error;
                    Debug.LogWarning(fieldMarkerLine + " | " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }

            if (space != null)
            {
                RefreshHud();
            }
        }

        private IEnumerator SubmitWallCalibrationObservation(string trackingMode)
        {
            EnsureApiClient();
            if (wallCalibrationObservationInFlight)
            {
                yield break;
            }

            WallCalibrationAnchor anchor = ResolveCurrentWallCalibrationAnchor();
            string mode = NormalizeCalibrationTrackingMode(trackingMode);
            if (anchor == null || anchor.expected_pose == null || anchor.expected_pose.position == null)
            {
                wallCalibrationObservationLine = "calibration observation skipped | anchor unavailable";
                Debug.LogWarning(wallCalibrationObservationLine);
                SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationObservationLine);
                if (space != null)
                {
                    RefreshHud();
                }
                yield break;
            }

            WallCalibrationObservationPayload payload = BuildWallCalibrationObservationPayload(anchor, mode);
            string json = JsonUtility.ToJson(payload);
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.wall_calibration_observations : null, apiClient.WallCalibrationObservationsUrl);
            wallCalibrationObservationInFlight = true;
            wallCalibrationObservationLine = "calibration observation " + mode + " posting | anchor " + anchor.anchor_id;
            SetRokidConnection(RokidConnectionStatus.Connecting, wallCalibrationObservationLine);

            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] body = Encoding.UTF8.GetBytes(json);
                request.uploadHandler = new UploadHandlerRaw(body);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        lastWallCalibrationObservationResult = JsonUtility.FromJson<WallCalibrationObservationResult>(request.downloadHandler.text);
                        lastWallCalibrationObservation = lastWallCalibrationObservationResult != null
                            ? lastWallCalibrationObservationResult.observation
                            : null;
                        if (lastWallCalibrationObservationResult != null && wallCalibrationManifest != null)
                        {
                            if (wallCalibrationManifest.runtime == null)
                            {
                                wallCalibrationManifest.runtime = new WallCalibrationRuntime();
                            }
                            if (lastWallCalibrationObservationResult.summary != null)
                            {
                                wallCalibrationManifest.runtime.summary = lastWallCalibrationObservationResult.summary;
                            }
                            if (lastWallCalibrationObservation != null)
                            {
                                anchor.latest_observation = lastWallCalibrationObservation;
                                UpdateFieldMarkerObservation(anchor.anchor_id, lastWallCalibrationObservation, lastWallCalibrationObservationResult.summary);
                            }
                        }

                        wallCalibrationObservationLine = BuildWallCalibrationObservationLine();
                        wallCalibrationLine = BuildWallCalibrationStatusLine();
                        fieldMarkerLine = BuildFieldMarkerStatusLine();
                        Debug.Log("Wall calibration observation posted: " + wallCalibrationObservationLine + " | " + url);
                        SetStatus("Calibration observation posted", wallCalibrationObservationLine);
                        SetRokidConnection(RokidConnectionStatus.Connected, wallCalibrationObservationLine);
                    }
                    catch (Exception error)
                    {
                        lastWallCalibrationObservationResult = null;
                        lastWallCalibrationObservation = null;
                        wallCalibrationObservationLine = "calibration observation parse failed | anchor " + anchor.anchor_id;
                        Debug.LogWarning(wallCalibrationObservationLine + ": " + error.Message + " | " + url);
                        SetStatus("Calibration observation failed", error.Message);
                        SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationObservationLine);
                    }
                }
                else
                {
                    wallCalibrationObservationLine = "calibration observation failed | anchor " + anchor.anchor_id + " | http " + request.responseCode;
                    Debug.LogWarning(wallCalibrationObservationLine + ": " + request.error + " | " + url);
                    SetStatus("Calibration observation failed", request.error + " " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationObservationLine);
                }
            }

            wallCalibrationObservationInFlight = false;
            if (space != null)
            {
                RefreshHud();
            }
        }

        private void TickDeviceHeartbeat()
        {
            if (usingFallback || string.IsNullOrEmpty(deviceSessionId) || heartbeatInFlight)
            {
                return;
            }

            int intervalMs = runtimeConfig != null ? runtimeConfig.health_interval_ms : InnerWorldRuntimeConfig.DefaultHealthIntervalMs;
            float intervalSeconds = Mathf.Max(0.5f, intervalMs / 1000f);
            heartbeatClockSeconds += Time.deltaTime;
            if (heartbeatClockSeconds < intervalSeconds)
            {
                return;
            }

            heartbeatClockSeconds = 0f;
            StartCoroutine(PostDeviceHeartbeat());
        }

        private IEnumerator PostDeviceHeartbeat()
        {
            EnsureApiClient();
            if (string.IsNullOrEmpty(deviceSessionId) || heartbeatInFlight)
            {
                yield break;
            }

            heartbeatInFlight = true;
            DeviceHeartbeatRequest payload = BuildDeviceHeartbeatRequest();
            string json = JsonUtility.ToJson(payload);

            using (UnityWebRequest request = new UnityWebRequest(apiClient.DeviceHeartbeatUrl, "POST"))
            {
                byte[] body = Encoding.UTF8.GetBytes(json);
                request.uploadHandler = new UploadHandlerRaw(body);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    lastDeviceHeartbeat = JsonUtility.FromJson<DeviceHeartbeatResponse>(request.downloadHandler.text);
                    string severity = lastDeviceHeartbeat != null && lastDeviceHeartbeat.health != null
                        ? lastDeviceHeartbeat.health.severity
                        : "unknown";
                    string activeAnchor = lastDeviceHeartbeat != null && lastDeviceHeartbeat.mission_snapshot != null && lastDeviceHeartbeat.mission_snapshot.active_anchor != null
                        ? lastDeviceHeartbeat.mission_snapshot.active_anchor.anchor_id
                        : CurrentActiveAnchorId();
                    deviceRuntimeLine = "device heartbeat " + severity + " | " + activeAnchor + " | " + ShortId(deviceSessionId);
                    SetRokidConnection(RokidConnectionStatus.Connected, deviceRuntimeLine);
                }
                else
                {
                    deviceRuntimeLine = "device heartbeat failed: " + request.error;
                    Debug.LogWarning(deviceRuntimeLine);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }

            heartbeatInFlight = false;
        }

        private IEnumerator PostWriteBack()
        {
            string text = "Unity shell writeback " + DateTime.Now.ToString("HH:mm:ss");
            WriteBackRequest request = new WriteBackRequest
            {
                user_id = CurrentUserId(),
                anchor_id = "A3",
                title = "Unity shell",
                text = text
            };
            yield return PostJson(apiClient.WriteBackUrl, JsonUtility.ToJson(request), "Writeback posted");
            yield return LoadSpace();
        }

        private IEnumerator SwitchUserB()
        {
            InteractionRequest request = new InteractionRequest
            {
                source = RequestSourceName(),
                user_id = "B",
                mission_state = "complete"
            };
            yield return PostJson(apiClient.InteractionsUrl, JsonUtility.ToJson(request), "Switched to User B");
            yield return LoadSpace();
        }

        private IEnumerator PostJson(string url, string payload, string successMessage)
        {
            EnsureApiClient();
            if (usingFallback)
            {
                SetStatus("Space API unavailable", "Check " + apiClient.BaseUrl);
                SetRokidConnection(RokidConnectionStatus.OfflineFallback, "POST skipped while fallback is active");
                yield break;
            }

            byte[] body = Encoding.UTF8.GetBytes(payload);
            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                request.uploadHandler = new UploadHandlerRaw(body);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    SetStatus(successMessage, url);
                    SetRokidConnection(RokidConnectionStatus.Connected, successMessage);
                }
                else
                {
                    SetStatus("POST failed", request.error + " " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }
        }

        private void CompleteNextStep()
        {
            if (space == null || space.mission == null || space.mission.steps == null || space.mission.steps.Length == 0)
            {
                SetStatus("Mission unavailable", "Reload the space first");
                return;
            }

            int index = Mathf.Clamp(localStepIndex, 0, space.mission.steps.Length - 1);
            MissionStepData step = space.mission.steps[index];
            if (missionState != null)
            {
                missionState.MarkStepComplete(step.step_id);
            }

            localStepIndex = Mathf.Min(localStepIndex + 1, space.mission.steps.Length);
            StartCoroutine(PostInteraction(step.step_id));
        }

        private void RefreshHud()
        {
            if (space == null)
            {
                SetStatus("Space missing", "No data loaded");
                return;
            }

            string source = usingFallback ? "fallback" : "space-api";
            string runtime = missionState != null ? missionState.mission_state : "local";
            SetStatus(space.name, space.space_id + " | " + source + " | " + runtime + " | " + WallCalibrationHudBadge());
            SetDetail(GetMissionLine() + "\nAnchors: " + SafeAnchors().Length + " / Beacons: " + SafeBeacons().Length + "\n" + BuildRuntimeContractLine());
            RefreshInputStatusLine();
            RefreshTargetHud();
            if (keyHintText != null) keyHintText.text = "Keys: R Reload | Space/Enter Confirm | Esc Back | Mouse Gaze | C Calib | S/W/B";
        }

        private string GetMissionLine()
        {
            if (space == null || space.mission == null || space.mission.steps == null || space.mission.steps.Length == 0)
            {
                return "Mission: unavailable";
            }

            int index = missionState != null ? missionState.current_step_index : Mathf.Clamp(localStepIndex, 0, space.mission.steps.Length - 1);
            MissionStepData step = space.mission.steps[index];
            if (stepText != null)
            {
                string progress = missionState != null ? " | done " + missionState.CompletedStepCount : string.Empty;
                stepText.text = "Step " + (index + 1) + "/" + space.mission.steps.Length + ": " + step.label + progress;
            }
            return step.label + " - " + step.hint;
        }

        private void EnsureCameraAndLight()
        {
            Camera camera = Camera.main;
            if (camera == null)
            {
                GameObject cameraObject = new GameObject("Main Camera");
                camera = cameraObject.AddComponent<Camera>();
                cameraObject.tag = "MainCamera";
            }

            camera.transform.position = cameraPosition;
            camera.transform.rotation = Quaternion.LookRotation((wallCenter - cameraPosition).normalized, Vector3.up);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.04f, 0.055f, 0.07f);
            camera.fieldOfView = 58f;

            if (FindObjectOfType<Light>() == null)
            {
                GameObject lightObject = new GameObject("Key Light");
                Light light = lightObject.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.6f;
                light.transform.rotation = Quaternion.Euler(42f, -35f, 0f);
            }
        }

        private void EnsureEventSystem()
        {
            if (FindObjectOfType<EventSystem>() != null) return;

            GameObject eventSystem = new GameObject("EventSystem");
            eventSystem.AddComponent<EventSystem>();
            eventSystem.AddComponent<StandaloneInputModule>();
        }

        private void BuildWall()
        {
            GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "Campus Memory Wall";
            wall.transform.position = wallCenter;
            wall.transform.localScale = new Vector3(4.1f, 2.25f, 0.08f);
            ApplyMaterial(wall.GetComponent<Renderer>(), new Color(0.08f, 0.105f, 0.13f));

            GameObject glow = GameObject.CreatePrimitive(PrimitiveType.Cube);
            glow.name = "Wall Inner Glow";
            glow.transform.position = wallCenter + new Vector3(0f, 0f, -0.055f);
            glow.transform.localScale = new Vector3(3.65f, 1.82f, 0.025f);
            ApplyMaterial(glow.GetComponent<Renderer>(), new Color(0.12f, 0.22f, 0.24f));
        }

        private void BuildGazeReticle()
        {
            gazeReticle = new GameObject("Gaze Anchor Reticle");
            gazeReticleLine = gazeReticle.AddComponent<LineRenderer>();
            gazeReticleLine.useWorldSpace = false;
            gazeReticleLine.loop = true;
            gazeReticleLine.positionCount = GazeReticleSegments;
            gazeReticleLine.startWidth = 0.01f;
            gazeReticleLine.endWidth = 0.01f;
            gazeReticleLine.numCapVertices = 2;

            Shader shader = FindRuntimeShader();
            if (shader != null)
            {
                gazeReticleMaterial = new Material(shader);
                SetMaterialColor(gazeReticleMaterial, new Color(0.68f, 1f, 1f, 1f), 0.85f);
                gazeReticleLine.material = gazeReticleMaterial;
            }

            SetGazeReticleRadius(0.11f);
            gazeReticle.SetActive(false);
        }

        private void BuildHud()
        {
            GameObject canvasObject = new GameObject("HUD Canvas");
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            canvasObject.AddComponent<GraphicRaycaster>();

            GameObject panel = CreateUiObject("Panel", canvasObject.transform);
            RectTransform panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchorMin = new Vector2(0f, 1f);
            panelRect.anchorMax = new Vector2(0f, 1f);
            panelRect.pivot = new Vector2(0f, 1f);
            panelRect.anchoredPosition = new Vector2(24f, -24f);
            panelRect.sizeDelta = new Vector2(500f, 390f);
            Image panelImage = panel.AddComponent<Image>();
            panelImage.color = new Color(0.03f, 0.045f, 0.055f, 0.88f);

            sourceText = CreateText("Source", panel.transform, 13, FontStyle.Bold);
            SetRect(sourceText.rectTransform, 18f, -14f, 460f, 42f);

            statusText = CreateText("Status", panel.transform, 18, FontStyle.Bold);
            SetRect(statusText.rectTransform, 18f, -62f, 430f, 48f);

            stepText = CreateText("Step", panel.transform, 15, FontStyle.Bold);
            SetRect(stepText.rectTransform, 18f, -116f, 430f, 32f);

            detailText = CreateText("Detail", panel.transform, 14, FontStyle.Normal);
            SetRect(detailText.rectTransform, 18f, -150f, 450f, 78f);

            targetText = CreateText("Target", panel.transform, 13, FontStyle.Bold);
            targetText.color = new Color(0.98f, 0.9f, 0.42f);
            SetRect(targetText.rectTransform, 18f, -232f, 460f, 54f);

            keyHintText = CreateText("Key Hints", panel.transform, 13, FontStyle.Bold);
            keyHintText.color = new Color(0.76f, 0.93f, 1f);
            SetRect(keyHintText.rectTransform, 18f, -292f, 460f, 32f);

            float x = 18f;
            CreateButton("Reload", panel.transform, x, -330f, 74f, () => StartCoroutine(BootstrapAndLoadSpace()));
            x += 82f;
            CreateButton("Next", panel.transform, x, -330f, 64f, CompleteNextStep);
            x += 72f;
            CreateButton("Service", panel.transform, x, -330f, 80f, () => StartCoroutine(PostServiceAction()));
            x += 88f;
            CreateButton("Write", panel.transform, x, -330f, 66f, () => StartCoroutine(PostWriteBack()));
            x += 74f;
            CreateButton("User B", panel.transform, x, -330f, 70f, () => StartCoroutine(SwitchUserB()));
            x += 78f;
            CreateButton("Calib", panel.transform, x, -330f, 68f, () => StartCoroutine(SubmitWallCalibrationObservation("manual")));

            RefreshTargetHud();
        }

        private void RenderAnchors()
        {
            foreach (GameObject item in spawnedObjects)
            {
                if (item != null) Destroy(item);
            }
            spawnedObjects.Clear();
            anchorVisuals.Clear();

            foreach (AnchorData anchor in SafeAnchors())
            {
                Vector3 position = anchor.pose != null
                    ? new Vector3(anchor.pose.x, anchor.pose.y, anchor.pose.z)
                    : wallCenter;
                Vector3 displayPosition = AnchorDisplayPosition(anchor, position);

                GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                marker.name = "Anchor " + anchor.anchor_id + " - " + anchor.label;
                marker.transform.position = displayPosition;
                Vector3 baseScale = anchor.kind == "write_back" ? Vector3.one * 0.28f : Vector3.one * 0.24f;
                Color baseColor = ColorForAnchor(anchor.kind);
                marker.transform.localScale = baseScale;
                Renderer markerRenderer = marker.GetComponent<Renderer>();
                ApplyMaterial(markerRenderer, baseColor);
                AnchorClickTarget click = marker.AddComponent<AnchorClickTarget>();
                click.anchorId = anchor.anchor_id;
                click.controller = this;
                spawnedObjects.Add(marker);

                GameObject label = new GameObject("Label " + anchor.anchor_id);
                label.transform.position = displayPosition + new Vector3(-0.22f, 0.26f, -0.03f);
                label.transform.rotation = Quaternion.LookRotation((label.transform.position - cameraPosition).normalized, Vector3.up);
                TextMesh mesh = label.AddComponent<TextMesh>();
                mesh.text = anchor.anchor_id + "  " + anchor.label + "\n" + AnchorBeaconLine(anchor.anchor_id);
                mesh.font = uiFont;
                mesh.fontSize = 36;
                mesh.characterSize = 0.018f;
                mesh.anchor = TextAnchor.MiddleLeft;
                mesh.color = new Color(0.88f, 0.96f, 1f);
                MeshRenderer meshRenderer = label.GetComponent<MeshRenderer>();
                if (meshRenderer != null && uiFont != null) meshRenderer.material = uiFont.material;
                spawnedObjects.Add(label);

                anchorVisuals[anchor.anchor_id] = new AnchorVisualState(anchor, marker.transform, markerRenderer, mesh, baseScale, baseColor);
            }

            if (!string.IsNullOrEmpty(selectedAnchorId) && !anchorVisuals.ContainsKey(selectedAnchorId))
            {
                selectedAnchorId = string.Empty;
            }

            RefreshAnchorVisualStates();
        }

        private Vector3 AnchorDisplayPosition(AnchorData anchor, Vector3 source)
        {
            float x = source.x;
            float y = source.y;
            if (anchor != null)
            {
                if (anchor.anchor_id == "A1")
                {
                    x = -0.7f;
                    y = 0.92f;
                }
                else if (anchor.anchor_id == "A2")
                {
                    x = 0f;
                    y = 1.45f;
                }
                else if (anchor.anchor_id == "A3")
                {
                    x = 0.7f;
                    y = 0.92f;
                }
            }

            return new Vector3(x, y, wallCenter.z - 0.24f);
        }

        private string AnchorBeaconLine(string anchorId)
        {
            BeaconData[] beacons = FindBeacons(anchorId);
            if (beacons.Length == 0) return "No memory";
            return beacons[beacons.Length - 1].display_text;
        }

        private void ApplyMaterial(Renderer renderer, Color color)
        {
            if (renderer == null) return;

            Shader shader = FindRuntimeShader();
            Material material = shader != null ? new Material(shader) : renderer.material;
            if (material == null) return;

            SetMaterialColor(material, color, 0.25f);
            renderer.material = material;
        }

        private void SetRendererColor(Renderer renderer, Color color, float emissionStrength)
        {
            if (renderer == null) return;

            Material material = renderer.material;
            SetMaterialColor(material, color, emissionStrength);
        }

        private void SetMaterialColor(Material material, Color color, float emissionStrength)
        {
            if (material == null) return;

            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            if (material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * Mathf.Max(0f, emissionStrength));
            }
        }

        private Shader FindRuntimeShader()
        {
            string[] shaderNames =
            {
                "Universal Render Pipeline/Unlit",
                "Universal Render Pipeline/Lit",
                "Unlit/Color",
                "Sprites/Default",
                "UI/Default",
                "Standard"
            };

            foreach (string shaderName in shaderNames)
            {
                Shader shader = Shader.Find(shaderName);
                if (shader != null) return shader;
            }

            Debug.LogWarning("No runtime color shader found; using Unity default material.");
            return null;
        }

        private Color ColorForAnchor(string kind)
        {
            if (kind == "entry") return new Color(0.35f, 0.78f, 0.95f);
            if (kind == "write_back") return new Color(1f, 0.73f, 0.32f);
            return new Color(0.55f, 0.95f, 0.72f);
        }

        private bool TryGetAnchorHit(RokidGazeState gaze, out AnchorClickTarget target, out RaycastHit hit)
        {
            target = null;
            hit = default(RaycastHit);

            RaycastHit directHit;
            if (Physics.Raycast(gaze.Ray, out directHit, 20f) && TryGetAnchorTarget(directHit.collider, out target))
            {
                hit = directHit;
                return true;
            }

            RaycastHit softHit;
            if (Physics.SphereCast(gaze.Ray, GazeHitRadiusMeters, out softHit, 20f) && TryGetAnchorTarget(softHit.collider, out target))
            {
                hit = softHit;
                return true;
            }

            return false;
        }

        private bool TryGetAnchorTarget(Collider collider, out AnchorClickTarget target)
        {
            target = null;
            if (collider == null) return false;

            target = collider.GetComponent<AnchorClickTarget>();
            return target != null;
        }

        private void SetGazeVisualTarget(string anchorId, string label, Vector3 hitPoint, bool isSelecting)
        {
            currentGazeAnchorId = string.IsNullOrEmpty(anchorId) ? string.Empty : anchorId.Trim();
            currentGazeAnchorLabel = string.IsNullOrEmpty(label) ? currentGazeAnchorId : label.Trim();
            currentGazeSelecting = isSelecting;
            if (missionState != null)
            {
                AnchorData anchor = FindAnchor(currentGazeAnchorId);
                missionState.FocusAnchor(currentGazeAnchorId, currentGazeAnchorLabel, anchor != null ? anchor.kind : string.Empty);
            }

            UpdateGazeReticle(hitPoint, isSelecting, currentGazeAnchorId == selectedAnchorId);
            RefreshAnchorVisualStates();
            RefreshTargetHud();
        }

        private void ClearGazeVisualTarget()
        {
            if (string.IsNullOrEmpty(currentGazeAnchorId) && gazeReticle != null && !gazeReticle.activeSelf)
            {
                return;
            }

            currentGazeAnchorId = string.Empty;
            currentGazeAnchorLabel = string.Empty;
            currentGazeSelecting = false;
            if (missionState != null && string.IsNullOrEmpty(selectedAnchorId))
            {
                missionState.ClearAnchorSelection();
            }

            if (gazeReticle != null) gazeReticle.SetActive(false);
            RefreshAnchorVisualStates();
            RefreshTargetHud();
        }

        private void RefreshAnchorVisualStates()
        {
            foreach (AnchorVisualState visual in anchorVisuals.Values)
            {
                bool isGaze = visual.Anchor != null && visual.Anchor.anchor_id == currentGazeAnchorId;
                bool isSelected = visual.Anchor != null && visual.Anchor.anchor_id == selectedAnchorId;
                float scaleMultiplier = 1f;
                Color markerColor = visual.BaseColor;
                Color labelColor = new Color(0.88f, 0.96f, 1f);

                if (isSelected)
                {
                    scaleMultiplier = 1.34f;
                    markerColor = new Color(1f, 0.88f, 0.24f);
                    labelColor = new Color(1f, 0.92f, 0.42f);
                }

                if (isGaze)
                {
                    scaleMultiplier = isSelected ? 1.52f : 1.2f;
                    markerColor = isSelected ? new Color(1f, 0.82f, 0.18f) : new Color(0.68f, 1f, 1f);
                    labelColor = isSelected ? new Color(1f, 0.95f, 0.48f) : new Color(0.72f, 1f, 1f);
                }

                if (visual.MarkerTransform != null)
                {
                    visual.MarkerTransform.localScale = visual.BaseScale * scaleMultiplier;
                }

                SetRendererColor(visual.MarkerRenderer, markerColor, isGaze || isSelected ? 0.65f : 0.25f);

                if (visual.LabelMesh != null)
                {
                    visual.LabelMesh.color = labelColor;
                    visual.LabelMesh.text = BuildAnchorLabel(visual.Anchor, isGaze, isSelected);
                }
            }
        }

        private string BuildAnchorLabel(AnchorData anchor, bool isGaze, bool isSelected)
        {
            if (anchor == null) return string.Empty;

            string prefix = string.Empty;
            if (isSelected) prefix += "[SELECTED] ";
            if (isGaze) prefix += "[GAZE] ";
            return prefix + anchor.anchor_id + "  " + anchor.label + "\n" + AnchorBeaconLine(anchor.anchor_id);
        }

        private void UpdateGazeReticle(Vector3 hitPoint, bool isSelecting, bool isSelected)
        {
            if (gazeReticle == null || gazeReticleLine == null) return;

            Camera camera = Camera.main;
            Vector3 cameraWorldPosition = camera != null ? camera.transform.position : cameraPosition;
            Vector3 towardCamera = cameraWorldPosition - hitPoint;
            if (towardCamera.sqrMagnitude < 0.0001f) towardCamera = Vector3.back;
            towardCamera.Normalize();

            gazeReticle.transform.position = hitPoint + towardCamera * 0.018f;
            gazeReticle.transform.rotation = Quaternion.LookRotation(towardCamera, Vector3.up);
            SetGazeReticleRadius(isSelecting || isSelected ? 0.14f : 0.11f);

            Color color = isSelecting || isSelected ? new Color(1f, 0.9f, 0.22f, 1f) : new Color(0.68f, 1f, 1f, 1f);
            gazeReticleLine.startColor = color;
            gazeReticleLine.endColor = color;
            SetMaterialColor(gazeReticleMaterial, color, 0.85f);
            gazeReticle.SetActive(true);
        }

        private void SetGazeReticleRadius(float radius)
        {
            if (gazeReticleLine == null) return;

            float safeRadius = Mathf.Max(0.02f, radius);
            for (int i = 0; i < GazeReticleSegments; i++)
            {
                float angle = (Mathf.PI * 2f * i) / GazeReticleSegments;
                gazeReticleLine.SetPosition(i, new Vector3(Mathf.Cos(angle) * safeRadius, Mathf.Sin(angle) * safeRadius, 0f));
            }
        }

        private void RefreshTargetHud()
        {
            if (targetText == null) return;

            string gazeLine = string.IsNullOrEmpty(currentGazeAnchorId)
                ? "Gaze: none"
                : "Gaze: " + currentGazeAnchorId + " " + CurrentAnchorLabel(currentGazeAnchorId, currentGazeAnchorLabel);
            if (!string.IsNullOrEmpty(currentGazeAnchorId) && currentGazeSelecting)
            {
                gazeLine += " (select)";
            }

            string selectedLine = string.IsNullOrEmpty(selectedAnchorId)
                ? "Selected: none"
                : "Selected: " + selectedAnchorId + " " + CurrentAnchorLabel(selectedAnchorId, string.Empty);

            targetText.text = gazeLine + "\n" + selectedLine + "\n" + BuildWallCalibrationObservationLine() + " | " + BuildFieldMarkerActiveLine();
        }

        private string CurrentAnchorLabel(string anchorId, string fallback)
        {
            AnchorData anchor = FindAnchor(anchorId);
            if (anchor != null && !string.IsNullOrWhiteSpace(anchor.label)) return anchor.label.Trim();
            if (!string.IsNullOrWhiteSpace(fallback)) return fallback.Trim();
            return string.IsNullOrEmpty(anchorId) ? "unknown" : anchorId;
        }

        private GameObject CreateUiObject(string name, Transform parent)
        {
            GameObject item = new GameObject(name);
            item.transform.SetParent(parent, false);
            item.AddComponent<RectTransform>();
            return item;
        }

        private Text CreateText(string name, Transform parent, int size, FontStyle style)
        {
            GameObject item = CreateUiObject(name, parent);
            Text text = item.AddComponent<Text>();
            text.font = uiFont;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = new Color(0.9f, 0.96f, 1f);
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Truncate;
            return text;
        }

        private Button CreateButton(string label, Transform parent, float x, float y, float width, UnityEngine.Events.UnityAction action)
        {
            GameObject item = CreateUiObject(label + " Button", parent);
            SetRect(item.GetComponent<RectTransform>(), x, y, width, 32f);
            Image image = item.AddComponent<Image>();
            image.color = new Color(0.14f, 0.26f, 0.31f, 0.95f);
            Button button = item.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(action);

            Text text = CreateText(label + " Label", item.transform, 13, FontStyle.Bold);
            text.alignment = TextAnchor.MiddleCenter;
            text.color = Color.white;
            text.raycastTarget = false;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            StretchRect(text.rectTransform);
            return button;
        }

        private void SetRect(RectTransform rect, float x, float y, float width, float height)
        {
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(x, y);
            rect.sizeDelta = new Vector2(width, height);
        }

        private void StretchRect(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private void SetStatus(string title, string subtitle)
        {
            if (statusText != null) statusText.text = title + "\n" + subtitle;
        }

        private void SetDetail(string text)
        {
            if (detailText != null) detailText.text = text;
        }

        private AnchorData FindAnchor(string anchorId)
        {
            foreach (AnchorData anchor in SafeAnchors())
            {
                if (anchor.anchor_id == anchorId) return anchor;
            }
            return null;
        }

        private BeaconData[] FindBeacons(string anchorId)
        {
            List<BeaconData> matches = new List<BeaconData>();
            foreach (BeaconData beacon in SafeBeacons())
            {
                if (beacon.anchor_id == anchorId) matches.Add(beacon);
            }
            return matches.ToArray();
        }

        private AnchorData[] SafeAnchors()
        {
            return space != null && space.anchors != null ? space.anchors : new AnchorData[0];
        }

        private BeaconData[] SafeBeacons()
        {
            return space != null && space.beacons != null ? space.beacons : new BeaconData[0];
        }

        private void RefreshApiClient()
        {
            int nearbyRadius = runtimeConfig != null ? runtimeConfig.nearby_radius_meters : SpaceApiClient.DefaultNearbyRadiusMeters;
            apiClient = new SpaceApiClient(baseUrl, spaceId, deviceProfile, nearbyRadius);
            baseUrl = apiClient.BaseUrl;
            spaceId = apiClient.SpaceId;
            deviceProfile = apiClient.DeviceProfile;

            if (rokidInputStateSink != null)
            {
                rokidInputStateSink.SetBaseUrl(apiClient.BaseUrl);
                RefreshInputStatusLine();
            }
        }

        private void EnsureApiClient()
        {
            if (apiClient == null)
            {
                RefreshApiClient();
            }
        }

        private void CreateRokidInputSource()
        {
            presentationStrategy = RokidPresentationStrategy.Resolve(presentationMode, CurrentPresentationEnvironment());
            RokidAdapterResolution resolution = RokidAdapterResolver.Resolve(presentationStrategy);
            rokidInputSource = resolution.InputSource;
            rokidOverlayRenderer = resolution.OverlayRenderer;
            rokidAdapterStatus = resolution.Status;
            editorRokidInputSource = rokidInputSource as EditorRokidInputSource;
            rokidInputStateSink = rokidInputSource as IRokidInputStateSink;

            if (rokidInputSource == null)
            {
                editorRokidInputSource = new EditorRokidInputSource();
                rokidInputSource = editorRokidInputSource;
                rokidInputStateSink = editorRokidInputSource;
            }

            if (rokidInputStateSink != null)
            {
                rokidInputStateSink.SetBaseUrl(apiClient != null ? apiClient.BaseUrl : baseUrl);
                rokidInputStateSink.SetConnection(RokidConnectionStatus.Disconnected, PresentationStatusMessage());
            }

            RefreshInputStatusLine();
        }

        private bool IsRokidInputActive()
        {
            return rokidInputSource != null && rokidInputSource.IsAvailable;
        }

        private void SetRokidConnection(RokidConnectionStatus status, string message)
        {
            if (rokidInputStateSink != null)
            {
                rokidInputStateSink.SetConnection(status, message);
            }

            RefreshInputStatusLine();
        }

        private void RefreshInputStatusLine()
        {
            if (sourceText == null) return;

            RokidConnectionInfo connection = CurrentConnectionInfo();
            string mode = presentationStrategy != null ? presentationStrategy.mode.ToString() : presentationMode;
            string observation = BuildWallCalibrationObservationLine();
            sourceText.text = "INPUT " + CurrentInputSourceName() + " | " + mode + " | " + AdapterBoundaryLabel() + " | " + connection.Status + " | " + CurrentDeviceProfile()
                + "\n" + (apiClient != null ? apiClient.BaseUrl : baseUrl) + " | " + observation + " | " + BuildFieldMarkerReadinessLine();
        }

        private RokidConnectionInfo CurrentConnectionInfo()
        {
            return rokidInputSource != null ? rokidInputSource.Connection : RokidConnectionInfo.Disconnected(baseUrl);
        }

        private string CurrentInputSourceName()
        {
            return rokidInputSource != null ? rokidInputSource.SourceName : "keyboard";
        }

        private string AdapterBoundaryLabel()
        {
            if (string.IsNullOrEmpty(rokidAdapterStatus.DefineSymbol))
            {
                return "adapter pending";
            }

            if (rokidAdapterStatus.IsSdkLiveBindingReady)
            {
                return "sdk live";
            }

            if (rokidAdapterStatus.IsSdkPackageDetected)
            {
                return "sdk package";
            }

            return rokidAdapterStatus.UsesRokidUxr ? "sdk stub" : "fallback";
        }

        private string CurrentDeviceProfile()
        {
            if (bootstrap != null && !string.IsNullOrWhiteSpace(bootstrap.profile)) return bootstrap.profile.Trim();
            if (apiClient != null) return apiClient.DeviceProfile;
            return string.IsNullOrWhiteSpace(deviceProfile) ? SpaceApiClient.DefaultDeviceProfile : deviceProfile.Trim();
        }

        private string RequestSourceName()
        {
            return IsRokidInputActive() ? rokidInputSource.SourceName : "unity_shell";
        }

        private string CurrentUserId()
        {
            if (space != null && space.runtime != null && !string.IsNullOrWhiteSpace(space.runtime.active_user))
            {
                return space.runtime.active_user.Trim();
            }

            if (missionState != null && !string.IsNullOrWhiteSpace(missionState.active_user))
            {
                return missionState.active_user.Trim();
            }

            return runtimeConfig != null ? runtimeConfig.active_user : InnerWorldRuntimeConfig.DefaultActiveUser;
        }

        private bool IsPointerOverUi()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
        }

        private void ApplyRuntimeConfig()
        {
            runtimeConfig = InnerWorldRuntimeConfig.FromCurrentProcess(LoadRuntimeConfigJson());
            baseUrl = runtimeConfig.base_url;
            spaceId = runtimeConfig.space_id;
            deviceProfile = runtimeConfig.device_profile;
            presentationMode = runtimeConfig.presentation_mode;
        }

        private string LoadRuntimeConfigJson()
        {
            string persistentConfig = System.IO.Path.Combine(Application.persistentDataPath, configFileName);
            string json = TryReadConfigJson(persistentConfig);
            if (!string.IsNullOrWhiteSpace(json)) return json;

            string streamingConfig = System.IO.Path.Combine(Application.streamingAssetsPath, configFileName);
            if (!streamingConfig.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                json = TryReadConfigJson(streamingConfig);
                if (!string.IsNullOrWhiteSpace(json)) return json;
            }

            return TryReadResourceConfigJson();
        }

        private string TryReadConfigJson(string path)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(path) || !System.IO.File.Exists(path)) return null;
                return System.IO.File.ReadAllText(path, Encoding.UTF8);
            }
            catch (Exception error)
            {
                Debug.LogWarning("Failed to read InnerWorld runtime config: " + path + " / " + error.Message);
                return null;
            }
        }

        private string TryReadResourceConfigJson()
        {
            try
            {
                string resourceName = System.IO.Path.GetFileNameWithoutExtension(configFileName);
                TextAsset asset = Resources.Load<TextAsset>(resourceName);
                if (asset == null || string.IsNullOrWhiteSpace(asset.text)) return null;
                return asset.text;
            }
            catch (Exception error)
            {
                Debug.LogWarning("Failed to read InnerWorld runtime config resource: " + error.Message);
                return null;
            }
        }

        private void SyncMissionStateFromSpace()
        {
            if (space == null)
            {
                missionState = new InnerWorldMissionState();
                localStepIndex = 0;
                return;
            }

            InnerWorldMissionStepState[] steps = BuildMissionStepStates(space.mission);
            string missionId = space.mission != null ? space.mission.mission_id : string.Empty;
            string title = space.mission != null ? space.mission.title : string.Empty;
            missionState = InnerWorldMissionState.Create(missionId, title, steps);

            RuntimeData runtime = space.runtime;
            string state = runtime != null ? runtime.mission_state : (space.mission != null ? space.mission.state : InnerWorldMissionStates.Entered);
            int stepIndex = runtime != null ? runtime.current_step_index : localStepIndex;
            string[] completedSteps = runtime != null ? runtime.completed_steps : null;
            string userId = runtime != null ? runtime.active_user : (runtimeConfig != null ? runtimeConfig.active_user : InnerWorldRuntimeConfig.DefaultActiveUser);
            missionState.ApplyRuntime(state, stepIndex, completedSteps, userId);
            localStepIndex = missionState.current_step_index;
        }

        private void ApplyBootstrapRuntimeContract()
        {
            if (bootstrap == null) return;

            if (bootstrap.client_hints != null && runtimeConfig != null)
            {
                if (bootstrap.client_hints.poll_interval_ms > 0) runtimeConfig.poll_interval_ms = bootstrap.client_hints.poll_interval_ms;
                if (bootstrap.client_hints.health_interval_ms > 0) runtimeConfig.health_interval_ms = bootstrap.client_hints.health_interval_ms;
                if (bootstrap.client_hints.request_timeout_ms > 0) runtimeConfig.request_timeout_ms = bootstrap.client_hints.request_timeout_ms;
            }

            if (bootstrap.runtime != null && missionState != null)
            {
                missionState.ApplyRuntime(
                    bootstrap.runtime.mission_state,
                    bootstrap.mission != null ? bootstrap.mission.current_step_index : missionState.current_step_index,
                    bootstrap.runtime.completed_steps,
                    bootstrap.runtime.active_user);
                localStepIndex = missionState.current_step_index;
            }
        }

        private IEnumerator LoadRuntimeServiceContracts()
        {
            EnsureApiClient();
            yield return LoadEvidenceChain();
            yield return LoadSessionPlan();
            RefreshHud();
        }

        private IEnumerator LoadEvidenceChain()
        {
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.evidence_chain : null, apiClient.EvidenceChainUrl);
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success)
                {
                    evidenceChain = JsonUtility.FromJson<InnerWorldEvidenceChainResponse>(request.downloadHandler.text);
                }
            }
        }

        private IEnumerator LoadSessionPlan()
        {
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.session_plan : null, apiClient.SessionPlanUrl);
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success)
                {
                    sessionPlan = JsonUtility.FromJson<InnerWorldSessionPlanResponse>(request.downloadHandler.text);
                }
            }
        }

        private InnerWorldMissionStepState[] BuildMissionStepStates(MissionData mission)
        {
            if (mission == null || mission.steps == null || mission.steps.Length == 0)
            {
                return new InnerWorldMissionStepState[0];
            }

            InnerWorldMissionStepState[] steps = new InnerWorldMissionStepState[mission.steps.Length];
            for (int index = 0; index < mission.steps.Length; index++)
            {
                MissionStepData step = mission.steps[index];
                steps[index] = step != null
                    ? InnerWorldMissionStepState.Create(step.step_id, step.label, step.anchor_id, step.hint)
                    : new InnerWorldMissionStepState();
            }

            return steps;
        }

        private string BuildRuntimeContractLine()
        {
            string evidence = evidenceChain != null ? (evidenceChain.IsReady ? "evidence ready" : "evidence pending") : "evidence unknown";
            string session = sessionPlan != null && sessionPlan.IsSchemaCompatible ? "session plan" : "session unknown";
            string device = bootstrap != null && bootstrap.runtime != null ? "device beacons " + bootstrap.runtime.beacon_count : "device runtime unknown";
            return evidence + " | " + session + " | " + device + "\n" + BuildWallCalibrationStatusLine() + "\n" + BuildFieldMarkerStatusLine() + "\n" + deviceRuntimeLine + " | " + AdapterBoundaryLabel();
        }

        private WallCalibrationObservationPayload BuildWallCalibrationObservationPayload(WallCalibrationAnchor anchor, string trackingMode)
        {
            float confidence = CalibrationObservationConfidence(anchor, trackingMode);
            return new WallCalibrationObservationPayload
            {
                session_id = CurrentCalibrationSessionId(),
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId.Trim(),
                anchor_id = anchor != null ? anchor.anchor_id : CurrentActiveAnchorId(),
                tracking_mode = trackingMode,
                observed_pose = BuildObservedPoseFromExpectedPose(anchor != null ? anchor.expected_pose : null, confidence),
                confidence = confidence,
                notes = "Unity " + trackingMode + " calibration rehearsal; observed_pose copied from manifest expected_pose for current anchor.",
                client_time = DateTime.UtcNow.ToString("o")
            };
        }

        private DevicePosePayload BuildObservedPoseFromExpectedPose(WallCalibrationPose expectedPose, float confidence)
        {
            DeviceVector3 position = expectedPose != null && expectedPose.position != null
                ? expectedPose.position
                : new DeviceVector3();
            DeviceQuaternion rotation = expectedPose != null && expectedPose.rotation != null
                ? expectedPose.rotation
                : new DeviceQuaternion { w = 1f };

            return new DevicePosePayload
            {
                confidence = confidence,
                position = new DeviceVector3
                {
                    x = position.x,
                    y = position.y,
                    z = position.z
                },
                rotation = new DeviceQuaternion
                {
                    x = rotation.x,
                    y = rotation.y,
                    z = rotation.z,
                    w = rotation.w == 0f ? 1f : rotation.w
                }
            };
        }

        private DeviceRegisterRequest BuildDeviceRegisterRequest()
        {
            return new DeviceRegisterRequest
            {
                profile = CurrentDeviceProfile(),
                device_id = CurrentDeviceId(),
                client_version = UnityClientVersion,
                capabilities = RequiredDeviceCapabilities(),
                network = BuildDeviceNetworkStatus(),
                sdk_binding_status = BuildSdkBindingStatusPayload("unity_register")
            };
        }

        private DeviceHeartbeatRequest BuildDeviceHeartbeatRequest()
        {
            return new DeviceHeartbeatRequest
            {
                session_id = deviceSessionId,
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId,
                battery = BuildDeviceBatteryStatus(),
                network = BuildDeviceNetworkStatus(),
                pose = BuildDevicePosePayload(),
                active_anchor = CurrentActiveAnchorId(),
                current_user = CurrentUserId(),
                sdk_binding_status = BuildSdkBindingStatusPayload("unity_heartbeat")
            };
        }

        private string[] RequiredDeviceCapabilities()
        {
            return new[]
            {
                "display.hud_overlay",
                "pose.head_tracking",
                "input.gaze_or_touch",
                "network.http_json",
                "anchors.local_alignment",
                "telemetry.battery"
            };
        }

        private DeviceNetworkStatus BuildDeviceNetworkStatus()
        {
            return new DeviceNetworkStatus
            {
                online = Application.internetReachability != NetworkReachability.NotReachable,
                transport = IsLoopbackBaseUrl(apiClient != null ? apiClient.BaseUrl : baseUrl) ? "localhost" : "wifi",
                rtt_ms = 32,
                lan_reachable = true,
                http_cleartext_allowed = UsesCleartextHttp(apiClient != null ? apiClient.BaseUrl : baseUrl)
            };
        }

        private DeviceBatteryStatus BuildDeviceBatteryStatus()
        {
            float batteryLevel = SystemInfo.batteryLevel;
            int percent = batteryLevel >= 0f ? Mathf.RoundToInt(Mathf.Clamp01(batteryLevel) * 100f) : 100;
            return new DeviceBatteryStatus
            {
                level_percent = percent,
                charging = SystemInfo.batteryStatus == BatteryStatus.Charging,
                temperature_c = 32f
            };
        }

        private DevicePosePayload BuildDevicePosePayload()
        {
            RokidPose pose = CurrentRokidPose();
            return new DevicePosePayload
            {
                confidence = rokidInputSource != null && rokidInputSource.IsPoseValid ? 0.92f : 0.72f,
                position = new DeviceVector3
                {
                    x = pose.Position.x,
                    y = pose.Position.y,
                    z = pose.Position.z
                },
                rotation = new DeviceQuaternion
                {
                    x = pose.Rotation.x,
                    y = pose.Rotation.y,
                    z = pose.Rotation.z,
                    w = pose.Rotation.w
                }
            };
        }

        private RokidPose CurrentRokidPose()
        {
            if (rokidInputSource != null && rokidInputSource.IsPoseValid)
            {
                return rokidInputSource.HeadPose;
            }

            Camera camera = Camera.main;
            if (camera != null)
            {
                return new RokidPose(camera.transform.position, camera.transform.rotation);
            }

            return RokidPose.Identity;
        }

        private RokidSdkBindingStatusPayload BuildSdkBindingStatusPayload(string source)
        {
            RokidSdkBindingReport report = rokidAdapterStatus.SdkBinding ?? RokidSdkBindingProbe.Detect();
            return new RokidSdkBindingStatusPayload
            {
                schema = RokidSdkBindingReport.Schema,
                source = source,
                define_symbol = report.DefineSymbol,
                stage = SdkBindingStageValue(report.Stage),
                boundary_compiled = report.BoundaryCompiled,
                package_detected = report.PackageDetected,
                input_binding_ready = report.InputBindingReady,
                overlay_binding_ready = report.OverlayBindingReady,
                live_binding_ready = report.LiveBindingReady,
                candidate_assemblies = report.CandidateAssemblies,
                candidate_types = report.CandidateTypes,
                message = BuildWallCalibrationHeartbeatMessage(report.Message)
            };
        }

        private string BuildWallCalibrationHeartbeatMessage(string sdkMessage)
        {
            string calibration = BuildWallCalibrationHeartbeatLine();
            if (string.IsNullOrWhiteSpace(sdkMessage)) return calibration;
            return calibration + " | " + sdkMessage.Trim();
        }

        private string BuildWallCalibrationHeartbeatLine()
        {
            WallCalibrationSummary summary = CurrentWallCalibrationSummary();
            string schema = WallCalibrationSchemaLabel();
            int anchorCount = WallCalibrationAnchorCount();
            string ready = summary != null && summary.ready_for_hardware ? "true" : "false";
            return "wall calibration: " + schema + ", anchors " + anchorCount + ", ready_for_hardware " + ready + ", calibrated " + CalibratedAnchorIdsLabel(summary) + ", hardware calibrated " + HardwareCalibratedAnchorIdsLabel(summary) + ", " + BuildWallCalibrationObservationLine() + " | " + BuildFieldMarkerHeartbeatLine();
        }

        private string BuildWallCalibrationStatusLine()
        {
            if (wallCalibrationManifest == null)
            {
                return string.IsNullOrWhiteSpace(wallCalibrationLine) ? "wall calibration pending" : wallCalibrationLine;
            }

            return "wall calibration schema " + WallCalibrationSchemaLabel()
                + " | anchors " + WallCalibrationAnchorCount()
                + " | ready_for_hardware " + WallCalibrationReadyFlag()
                + " | calibrated " + CalibratedAnchorIdsLabel(CurrentWallCalibrationSummary())
                + " | hardware " + HardwareCalibratedAnchorIdsLabel(CurrentWallCalibrationSummary())
                + " | " + BuildWallCalibrationObservationLine();
        }

        private string WallCalibrationHudBadge()
        {
            if (wallCalibrationManifest == null) return "calibration pending";
            return WallCalibrationReadyFlag() ? "calibration summary ready" : "calibration summary pending";
        }

        private string BuildWallCalibrationObservationLine()
        {
            if (lastWallCalibrationObservation == null)
            {
                return string.IsNullOrWhiteSpace(wallCalibrationObservationLine) ? "calibration observation pending" : wallCalibrationObservationLine;
            }

            return "observation " + SafeLabel(lastWallCalibrationObservation.tracking_mode, "unknown")
                + " " + SafeLabel(lastWallCalibrationObservation.status, "unknown")
                + " | anchor " + SafeLabel(lastWallCalibrationObservation.anchor_id, "unknown")
                + " | issues " + IssuesLabel(lastWallCalibrationObservation.issues);
        }

        private string BuildFieldMarkerHeartbeatLine()
        {
            return "field markers: " + FieldMarkerSchemaLabel()
                + ", " + BuildFieldMarkerReadinessLine()
                + ", markers " + FieldMarkerIdsLabel();
        }

        private string BuildFieldMarkerStatusLine()
        {
            if (fieldMarkerManifest == null)
            {
                return string.IsNullOrWhiteSpace(fieldMarkerLine) ? "field markers pending" : fieldMarkerLine;
            }

            return "field markers schema " + FieldMarkerSchemaLabel()
                + " | " + BuildFieldMarkerReadinessLine()
                + " | markers " + FieldMarkerIdsLabel()
                + " | active " + BuildFieldMarkerActiveLine();
        }

        private string BuildFieldMarkerReadinessLine()
        {
            return (FieldMarkerPrintReadyFlag() ? "print kit ready" : "print kit pending")
                + " | " + FieldMarkerSimulatorRehearsalLabel()
                + " | " + FieldMarkerHardwareReadinessLabel();
        }

        private string BuildFieldMarkerActiveLine()
        {
            FieldMarkerAnchor marker = ResolveCurrentFieldMarkerAnchor();
            if (marker == null)
            {
                return "field marker active none";
            }

            string markerId = marker.marker != null ? SafeLabel(marker.marker.marker_id, marker.anchor_id) : SafeLabel(marker.anchor_id, "unknown");
            string markerType = marker.marker != null ? SafeLabel(marker.marker.marker_type, "marker") : "marker";
            return marker.anchor_id
                + " " + markerId
                + " " + markerType
                + " | modes " + TrackingModesLabel(marker.tracking_modes)
                + " | expected " + PosePositionLabel(marker.expected_pose);
        }

        private string FieldMarkerSchemaLabel()
        {
            return fieldMarkerManifest != null && !string.IsNullOrWhiteSpace(fieldMarkerManifest.schema)
                ? fieldMarkerManifest.schema.Trim()
                : "schema unknown";
        }

        private int FieldMarkerCount()
        {
            return fieldMarkerManifest != null && fieldMarkerManifest.markers != null ? fieldMarkerManifest.markers.Length : 0;
        }

        private bool FieldMarkerPrintReadyFlag()
        {
            if (fieldMarkerManifest == null || !fieldMarkerManifest.ok || string.IsNullOrWhiteSpace(fieldMarkerManifest.schema))
            {
                return false;
            }

            int requiredCardCount = fieldMarkerManifest.print_contract != null && fieldMarkerManifest.print_contract.card_count > 0
                ? fieldMarkerManifest.print_contract.card_count
                : 3;

            return string.Equals(fieldMarkerManifest.schema.Trim(), "innerworld-field-markers/v1", StringComparison.Ordinal)
                && FieldMarkerCount() >= requiredCardCount
                && FieldMarkerRequiredIdsReady();
        }

        private bool FieldMarkerRequiredIdsReady()
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null)
            {
                return false;
            }

            string[] requiredMarkerIds = fieldMarkerManifest.acceptance != null
                ? fieldMarkerManifest.acceptance.required_marker_ids
                : null;
            if (requiredMarkerIds == null || requiredMarkerIds.Length == 0)
            {
                return true;
            }

            foreach (string requiredMarkerId in requiredMarkerIds)
            {
                if (!string.IsNullOrWhiteSpace(requiredMarkerId) && FindFieldMarkerByMarkerId(requiredMarkerId.Trim()) == null)
                {
                    return false;
                }
            }

            return true;
        }

        private string FieldMarkerSimulatorRehearsalLabel()
        {
            if (lastWallCalibrationObservation != null && string.Equals(lastWallCalibrationObservation.tracking_mode, "simulator", StringComparison.Ordinal))
            {
                return "simulator rehearsal active";
            }

            if (fieldMarkerManifest != null && fieldMarkerManifest.markers != null)
            {
                foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
                {
                    if (marker != null && marker.latest_observation != null && string.Equals(marker.latest_observation.tracking_mode, "simulator", StringComparison.Ordinal))
                    {
                        return "simulator rehearsal active";
                    }
                }
            }

            return "simulator rehearsal pending";
        }

        private string FieldMarkerHardwareReadinessLabel()
        {
            WallCalibrationSummary summary = CurrentWallCalibrationSummary();
            bool ready = summary != null && summary.ready_for_hardware;
            if (ready) return "hardware ready";
            int hardwareCount = summary != null ? summary.hardware_calibrated_anchor_count : 0;
            return "hardware pending " + hardwareCount + "/3";
        }

        private string FieldMarkerIdsLabel()
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null || fieldMarkerManifest.markers.Length == 0)
            {
                return "none";
            }

            List<string> markerIds = new List<string>();
            foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
            {
                if (marker == null) continue;
                if (marker.marker != null && !string.IsNullOrWhiteSpace(marker.marker.marker_id))
                {
                    markerIds.Add(marker.marker.marker_id.Trim());
                }
                else if (!string.IsNullOrWhiteSpace(marker.anchor_id))
                {
                    markerIds.Add(marker.anchor_id.Trim());
                }
            }

            return markerIds.Count == 0 ? "none" : string.Join(",", markerIds.ToArray());
        }

        private string TrackingModesLabel(string[] modes)
        {
            if (modes == null || modes.Length == 0) return "none";
            List<string> clean = new List<string>();
            foreach (string mode in modes)
            {
                if (!string.IsNullOrWhiteSpace(mode)) clean.Add(mode.Trim());
            }

            return clean.Count == 0 ? "none" : string.Join(",", clean.ToArray());
        }

        private string PosePositionLabel(WallCalibrationPose pose)
        {
            if (pose == null || pose.position == null) return "pose pending";
            return "x " + pose.position.x.ToString("0.00")
                + " y " + pose.position.y.ToString("0.00")
                + " z " + pose.position.z.ToString("0.00");
        }

        private bool WallCalibrationReadyFlag()
        {
            WallCalibrationSummary summary = CurrentWallCalibrationSummary();
            return summary != null && summary.ready_for_hardware;
        }

        private string WallCalibrationSchemaLabel()
        {
            return wallCalibrationManifest != null && !string.IsNullOrWhiteSpace(wallCalibrationManifest.schema)
                ? wallCalibrationManifest.schema.Trim()
                : "schema unknown";
        }

        private int WallCalibrationAnchorCount()
        {
            return wallCalibrationManifest != null && wallCalibrationManifest.anchors != null ? wallCalibrationManifest.anchors.Length : 0;
        }

        private WallCalibrationSummary CurrentWallCalibrationSummary()
        {
            return wallCalibrationManifest != null && wallCalibrationManifest.runtime != null
                ? wallCalibrationManifest.runtime.summary
                : null;
        }

        private string CalibratedAnchorIdsLabel(WallCalibrationSummary summary)
        {
            if (summary == null || summary.calibrated_anchor_ids == null || summary.calibrated_anchor_ids.Length == 0)
            {
                return "none";
            }

            List<string> anchorIds = new List<string>();
            foreach (string anchorId in summary.calibrated_anchor_ids)
            {
                if (!string.IsNullOrWhiteSpace(anchorId)) anchorIds.Add(anchorId.Trim());
            }

            return anchorIds.Count == 0 ? "none" : string.Join(",", anchorIds.ToArray());
        }

        private string HardwareCalibratedAnchorIdsLabel(WallCalibrationSummary summary)
        {
            if (summary == null || summary.hardware_calibrated_anchor_ids == null || summary.hardware_calibrated_anchor_ids.Length == 0)
            {
                return "none";
            }

            List<string> anchorIds = new List<string>();
            foreach (string anchorId in summary.hardware_calibrated_anchor_ids)
            {
                if (!string.IsNullOrWhiteSpace(anchorId)) anchorIds.Add(anchorId.Trim());
            }

            return anchorIds.Count == 0 ? "none" : string.Join(",", anchorIds.ToArray());
        }

        private WallCalibrationAnchor ResolveCurrentWallCalibrationAnchor()
        {
            WallCalibrationAnchor anchor = FindWallCalibrationAnchor(CurrentActiveAnchorId());
            if (anchor != null) return anchor;

            if (bootstrap != null && bootstrap.mission != null && bootstrap.mission.steps != null && bootstrap.mission.steps.Length > 0)
            {
                int stepIndex = Mathf.Clamp(bootstrap.mission.current_step_index, 0, bootstrap.mission.steps.Length - 1);
                MissionStep step = bootstrap.mission.steps[stepIndex];
                if (step != null)
                {
                    anchor = FindWallCalibrationAnchor(step.anchor_id);
                    if (anchor != null) return anchor;
                }
            }

            string[] preferredAnchors = { "A1", "A2", "A3" };
            foreach (string anchorId in preferredAnchors)
            {
                anchor = FindWallCalibrationAnchor(anchorId);
                if (anchor != null) return anchor;
            }

            return wallCalibrationManifest != null && wallCalibrationManifest.anchors != null && wallCalibrationManifest.anchors.Length > 0
                ? wallCalibrationManifest.anchors[0]
                : null;
        }

        private WallCalibrationAnchor FindWallCalibrationAnchor(string anchorId)
        {
            if (wallCalibrationManifest == null || wallCalibrationManifest.anchors == null || string.IsNullOrWhiteSpace(anchorId))
            {
                return null;
            }

            string cleanAnchorId = anchorId.Trim();
            foreach (WallCalibrationAnchor anchor in wallCalibrationManifest.anchors)
            {
                if (anchor != null && string.Equals(anchor.anchor_id, cleanAnchorId, StringComparison.Ordinal))
                {
                    return anchor;
                }
            }

            return null;
        }

        private FieldMarkerAnchor ResolveCurrentFieldMarkerAnchor()
        {
            FieldMarkerAnchor marker = FindFieldMarkerAnchor(CurrentActiveAnchorId());
            if (marker != null) return marker;

            if (bootstrap != null && bootstrap.mission != null && bootstrap.mission.steps != null && bootstrap.mission.steps.Length > 0)
            {
                int stepIndex = Mathf.Clamp(bootstrap.mission.current_step_index, 0, bootstrap.mission.steps.Length - 1);
                MissionStep step = bootstrap.mission.steps[stepIndex];
                if (step != null)
                {
                    marker = FindFieldMarkerAnchor(step.anchor_id);
                    if (marker != null) return marker;
                }
            }

            string[] preferredAnchors = { "A1", "A2", "A3" };
            foreach (string anchorId in preferredAnchors)
            {
                marker = FindFieldMarkerAnchor(anchorId);
                if (marker != null) return marker;
            }

            return fieldMarkerManifest != null && fieldMarkerManifest.markers != null && fieldMarkerManifest.markers.Length > 0
                ? fieldMarkerManifest.markers[0]
                : null;
        }

        private FieldMarkerAnchor FindFieldMarkerAnchor(string anchorId)
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null || string.IsNullOrWhiteSpace(anchorId))
            {
                return null;
            }

            string cleanAnchorId = anchorId.Trim();
            foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
            {
                if (marker != null && string.Equals(marker.anchor_id, cleanAnchorId, StringComparison.Ordinal))
                {
                    return marker;
                }
            }

            return null;
        }

        private FieldMarkerAnchor FindFieldMarkerByMarkerId(string markerId)
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null || string.IsNullOrWhiteSpace(markerId))
            {
                return null;
            }

            string cleanMarkerId = markerId.Trim();
            foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
            {
                if (marker != null && marker.marker != null && string.Equals(marker.marker.marker_id, cleanMarkerId, StringComparison.Ordinal))
                {
                    return marker;
                }
            }

            return null;
        }

        private void UpdateFieldMarkerObservation(string anchorId, WallCalibrationObservation observation, WallCalibrationSummary summary)
        {
            FieldMarkerAnchor marker = FindFieldMarkerAnchor(anchorId);
            if (marker != null)
            {
                marker.latest_observation = observation;
            }

            if (fieldMarkerManifest != null && fieldMarkerManifest.calibration_manifest != null && summary != null)
            {
                fieldMarkerManifest.calibration_manifest.ready_for_hardware = summary.ready_for_hardware;
                fieldMarkerManifest.calibration_manifest.calibrated_anchor_ids = summary.calibrated_anchor_ids;
            }
        }

        private float CalibrationObservationConfidence(WallCalibrationAnchor anchor, string trackingMode)
        {
            float baseConfidence = string.Equals(trackingMode, "manual", StringComparison.Ordinal) ? 0.82f : 0.92f;
            if (anchor != null && anchor.acceptance != null && anchor.acceptance.confidence_min > 0f)
            {
                baseConfidence = Mathf.Max(baseConfidence, anchor.acceptance.confidence_min + 0.12f);
            }

            return Mathf.Clamp01(baseConfidence);
        }

        private string NormalizeCalibrationTrackingMode(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "manual";
            string clean = value.Trim().ToLowerInvariant();
            if (clean == "qr" || clean == "image_tracking" || clean == "slam" || clean == "manual" || clean == "simulator")
            {
                return clean;
            }

            return "unknown";
        }

        private string CurrentCalibrationSessionId()
        {
            if (!string.IsNullOrWhiteSpace(deviceSessionId)) return deviceSessionId.Trim();
            if (string.IsNullOrWhiteSpace(calibrationRehearsalSessionId))
            {
                calibrationRehearsalSessionId = "unity-calibration-rehearsal-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            }

            return calibrationRehearsalSessionId;
        }

        private string IssuesLabel(string[] issues)
        {
            if (issues == null || issues.Length == 0) return "none";
            List<string> clean = new List<string>();
            foreach (string issue in issues)
            {
                if (!string.IsNullOrWhiteSpace(issue)) clean.Add(issue.Trim());
            }

            return clean.Count == 0 ? "none" : string.Join(",", clean.ToArray());
        }

        private string SafeLabel(string value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private string SdkBindingStageValue(RokidSdkBindingStage stage)
        {
            switch (stage)
            {
                case RokidSdkBindingStage.BoundaryCompiled:
                    return "boundary_compiled";
                case RokidSdkBindingStage.PackageDetected:
                    return "package_detected";
                case RokidSdkBindingStage.LiveBindingReady:
                    return "live_binding_ready";
                default:
                    return "fallback_only";
            }
        }

        private string CurrentDeviceId()
        {
            return "unity-shell-" + SanitizeDeviceToken(CurrentDeviceProfile());
        }

        private string CurrentActiveAnchorId()
        {
            if (!string.IsNullOrWhiteSpace(selectedAnchorId)) return selectedAnchorId.Trim();
            if (!string.IsNullOrWhiteSpace(currentGazeAnchorId)) return currentGazeAnchorId.Trim();
            if (missionState != null && missionState.anchor_selection != null && !string.IsNullOrWhiteSpace(missionState.anchor_selection.anchor_id))
            {
                return missionState.anchor_selection.anchor_id.Trim();
            }
            if (missionState != null && missionState.CurrentStep != null && !string.IsNullOrWhiteSpace(missionState.CurrentStep.anchor_id))
            {
                return missionState.CurrentStep.anchor_id.Trim();
            }
            return "A1";
        }

        private string SanitizeDeviceToken(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "runtime";
            StringBuilder builder = new StringBuilder();
            string clean = value.Trim();
            for (int index = 0; index < clean.Length; index++)
            {
                char ch = clean[index];
                if (char.IsLetterOrDigit(ch) || ch == '.' || ch == '_' || ch == '-')
                {
                    builder.Append(ch);
                }
                else if (builder.Length == 0 || builder[builder.Length - 1] != '-')
                {
                    builder.Append('-');
                }
            }
            return builder.Length == 0 ? "runtime" : builder.ToString().Trim('-');
        }

        private string ShortId(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "no-session";
            string clean = value.Trim();
            return clean.Length <= 12 ? clean : clean.Substring(0, 12);
        }

        private bool UsesCleartextHttp(string value)
        {
            return !string.IsNullOrWhiteSpace(value) && value.Trim().StartsWith("http://", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsLoopbackBaseUrl(string value)
        {
            try
            {
                Uri uri = new Uri(value);
                string host = uri.Host;
                return string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return true;
            }
        }

        private int RequestTimeoutSeconds()
        {
            int timeoutMs = runtimeConfig != null ? runtimeConfig.request_timeout_ms : InnerWorldRuntimeConfig.DefaultRequestTimeoutMs;
            return Mathf.Max(1, Mathf.CeilToInt(timeoutMs / 1000f));
        }

        private string ResolveEndpointUrl(SpaceApiEndpoint endpoint, string fallbackUrl)
        {
            if (endpoint != null && !string.IsNullOrWhiteSpace(endpoint.url))
            {
                return endpoint.url.Trim();
            }

            return fallbackUrl;
        }

        private RokidPresentationEnvironment CurrentPresentationEnvironment()
        {
            bool isAndroid = Application.platform == RuntimePlatform.Android;
            bool isEditor = Application.isEditor;
            bool hasRokidSdk = RokidSdkBindingProbe.Detect().BoundaryCompiled;
            return RokidPresentationEnvironment.Create(isAndroid, isEditor, hasRokidSdk, false, false, false);
        }

        private void RenderRokidOverlayFrame()
        {
            if (rokidOverlayRenderer == null || rokidInputSource == null)
            {
                return;
            }

            RokidInputFrame inputFrame = rokidInputSource.CurrentFrame;
            RokidOverlayFrame overlayFrame = new RokidOverlayFrame(
                RokidOverlayKind.Status,
                GetMissionLine(),
                inputFrame.Gaze,
                inputFrame.AnchorTarget,
                inputFrame.VoiceText,
                inputFrame.Connection);
            rokidOverlayRenderer.Render(overlayFrame);
        }

        private string PresentationStatusMessage()
        {
            if (!string.IsNullOrWhiteSpace(rokidAdapterStatus.Message))
            {
                return rokidAdapterStatus.Message;
            }

            if (presentationStrategy == null || string.IsNullOrWhiteSpace(presentationStrategy.fallback_reason))
            {
                return "Simulator ready";
            }

            return presentationStrategy.fallback_reason;
        }

        private sealed class AnchorVisualState
        {
            public readonly AnchorData Anchor;
            public readonly Transform MarkerTransform;
            public readonly Renderer MarkerRenderer;
            public readonly TextMesh LabelMesh;
            public readonly Vector3 BaseScale;
            public readonly Color BaseColor;

            public AnchorVisualState(
                AnchorData anchor,
                Transform markerTransform,
                Renderer markerRenderer,
                TextMesh labelMesh,
                Vector3 baseScale,
                Color baseColor)
            {
                Anchor = anchor;
                MarkerTransform = markerTransform;
                MarkerRenderer = markerRenderer;
                LabelMesh = labelMesh;
                BaseScale = baseScale;
                BaseColor = baseColor;
            }
        }

        private const string FallbackJson = "{\"space_id\":\"innerworld_campus_wall\",\"name\":\"Campus Memory Wall\",\"anchors\":[{\"anchor_id\":\"A1\",\"label\":\"Entry Poster\",\"pose\":{\"x\":-1.6,\"y\":1.25,\"z\":3.1},\"kind\":\"entry\"},{\"anchor_id\":\"A2\",\"label\":\"Memory Beacon\",\"pose\":{\"x\":0,\"y\":1.5,\"z\":3.0},\"kind\":\"memory\"},{\"anchor_id\":\"A3\",\"label\":\"Writeback Point\",\"pose\":{\"x\":1.55,\"y\":1.18,\"z\":3.2},\"kind\":\"write_back\"}],\"beacons\":[{\"beacon_id\":\"B_FALLBACK_1\",\"anchor_id\":\"A1\",\"display_text\":\"Local fallback ready\"},{\"beacon_id\":\"B_FALLBACK_2\",\"anchor_id\":\"A2\",\"display_text\":\"Start npm run dev\"}],\"mission\":{\"title\":\"Find hidden year\",\"steps\":[{\"step_id\":\"read\",\"label\":\"Read memory\",\"hint\":\"Look at A2.\"},{\"step_id\":\"service_action\",\"label\":\"Join event\",\"hint\":\"Post service action.\"},{\"step_id\":\"write_back\",\"label\":\"Write back\",\"hint\":\"Leave a note at A3.\"}]}}";
    }

    public sealed class AnchorClickTarget : MonoBehaviour
    {
        public string anchorId;
        public InnerWorldDemoController controller;

        private void OnMouseDown()
        {
            if (controller != null) controller.SelectAnchor(anchorId);
        }
    }

    [Serializable]
    public sealed class SpaceResponse
    {
        public string space_id;
        public string name;
        public AnchorData[] anchors;
        public BeaconData[] beacons;
        public MissionData mission;
        public RuntimeData runtime;
        public ServiceActionData[] service_actions;
    }

    [Serializable]
    public sealed class AnchorData
    {
        public string anchor_id;
        public string label;
        public PoseData pose;
        public string kind;
        public string default_state;
    }

    [Serializable]
    public sealed class PoseData
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class BeaconData
    {
        public string beacon_id;
        public string anchor_id;
        public string layer;
        public string title;
        public string body;
        public string display_text;
        public string source;
        public string created_at;
    }

    [Serializable]
    public sealed class MissionData
    {
        public string mission_id;
        public string state;
        public string title;
        public MissionStepData[] steps;
        public string expected_answer;
    }

    [Serializable]
    public sealed class MissionStepData
    {
        public string step_id;
        public string label;
        public string anchor_id;
        public string hint;
    }

    [Serializable]
    public sealed class RuntimeData
    {
        public string active_user;
        public string mission_state;
        public int current_step_index;
        public string[] completed_steps;
    }

    [Serializable]
    public sealed class ServiceActionData
    {
        public string action_id;
        public string label;
        public string status;
    }

}
