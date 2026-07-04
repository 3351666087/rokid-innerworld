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

        [NonSerialized]
        public string operatorPairingCode = "";

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
        private Text systemText;
        private Text radarText;
        private int localStepIndex;
        private bool usingFallback;
        private Font uiFont;
        private SpaceApiClient apiClient;
        private DeviceBootstrapResponse bootstrap;
        private DeviceManifestResponse deviceManifest;
        private InnerWorldRuntimeConfig runtimeConfig;
        private InnerWorldMissionState missionState = new InnerWorldMissionState();
        private InnerWorldEvidenceChainResponse evidenceChain;
        private InnerWorldSessionPlanResponse sessionPlan;
        private WallCalibrationManifest wallCalibrationManifest;
        private FieldMarkerManifest fieldMarkerManifest;
        private FieldAcceptanceManifest fieldAcceptanceManifest;
        private FieldOperatorPlanManifest fieldOperatorPlan;
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
        private string deviceManifestLine = "device manifest pending";
        private string devicePairingLine = "pairing required-for-hardware";
        private string wallCalibrationLine = "wall calibration pending";
        private string fieldMarkerLine = "field markers pending";
        private string fieldAcceptanceLine = "field acceptance pending";
        private string fieldOperatorPlanLine = "operator plan pending";
        private WallCalibrationObservationResult lastWallCalibrationObservationResult;
        private WallCalibrationObservation lastWallCalibrationObservation;
        private string wallCalibrationObservationLine = "calibration observation pending";
        private string trustedHardwareMissionAssistLine = "trusted target mission assist pending";
        private string calibrationRehearsalSessionId = string.Empty;
        private readonly Dictionary<string, float> trustedHardwareObservationPostedAt = new Dictionary<string, float>();
        private readonly Dictionary<string, PendingTrustedTargetObservation> pendingTrustedTargetObservations = new Dictionary<string, PendingTrustedTargetObservation>();
        private float heartbeatClockSeconds;
        private bool heartbeatInFlight;
        private bool wallCalibrationObservationInFlight;
        private string currentGazeAnchorId = string.Empty;
        private string currentGazeAnchorLabel = string.Empty;
        private bool currentGazeSelecting;
        private string selectedAnchorId = string.Empty;
        private bool a1SpatialEntryLocked;
        private bool a1SpatialEntryConfirmed;
        private string a1EntryLockState = RokidA1SpatialEntryStates.WaitingForA1;
        private string entryConfirmationStatus = "entry_confirmation_pending";
        private string spatialLayerTransitionState = RokidA1SpatialEntryStates.SpatialLayerStandby;
        private string spatialLayerTransitionLabel = "Spatial layer waits for A1 deliberate confirmation.";
        private float a1EntryConfirmationDistanceMeters = A1EntryConfirmationFallbackDistanceMeters;
        private GameObject gazeReticle;
        private LineRenderer gazeReticleLine;
        private Material gazeReticleMaterial;
        private float visualClockSeconds;

        private const string A1EntryAnchorId = "A1";
        private const float GazeHitRadiusMeters = 0.16f;
        private const int GazeReticleSegments = 48;
        private const float A1EntryConfirmMinDistanceMeters = 0.4f;
        private const float A1EntryConfirmMaxDistanceMeters = 0.5f;
        private const float A1EntryConfirmationFallbackDistanceMeters = 0.45f;
        private const float TrustedHardwareObservationMinIntervalSeconds = 4f;
        private const string UnityClientVersion = "unity-runtime-0.2.0";
        private const string OperatorPairingCodeEnv = "INNERWORLD_OPERATOR_PAIRING_CODE";
        private const string OperatorPairingCodeArg = "--innerworld-pairing-code";
        private const string OperatorPairingCodeIntentExtra = "innerworld_pairing_code";
        private const string OperatorPairingCodeIntentExtraQualified = "com.innerworld.rokid.OPERATOR_PAIRING_CODE";

        private sealed class PendingTrustedTargetObservation
        {
            public string anchorId;
            public int imageIndex;
            public Pose pose;
            public Vector2 size;
            public string eventType;
            public string gateReason;
            public float queuedAtSeconds;
        }

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
            visualClockSeconds += Time.deltaTime;
            TickRokidInput();
            TickDeviceHeartbeat();
            TickPremiumSpatialSurfaces();

            if (Input.GetKeyDown(KeyCode.R)) StartCoroutine(BootstrapAndLoadSpace());
            if (!IsRokidInputActive() && (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))) ConfirmEntryOrCompleteNextStep();
            if (Input.GetKeyDown(KeyCode.S)) StartCoroutine(PostServiceAction());
            if (Input.GetKeyDown(KeyCode.W)) StartCoroutine(PostWriteBack());
            if (Input.GetKeyDown(KeyCode.B)) StartCoroutine(SwitchUserB());
            if (Input.GetKeyDown(KeyCode.C)) StartCoroutine(SubmitWallCalibrationObservation("manual"));
        }

        private IEnumerator BootstrapAndLoadSpace()
        {
            ResetA1SpatialEntryExperience();
            EnsureApiClient();
            yield return LoadBootstrap();
            yield return LoadDeviceManifest();
            yield return LoadWallCalibrationManifest();
            yield return LoadFieldMarkerManifest();
            yield return LoadFieldAcceptanceManifest();
            yield return RegisterDeviceSession();
            yield return SubmitWallCalibrationObservation("simulator");
            yield return LoadSpace();
        }

        private IEnumerator LoadBootstrap()
        {
            EnsureApiClient();
            bootstrap = null;
            deviceManifest = null;
            deviceManifestLine = "device manifest pending";
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

        private IEnumerator LoadDeviceManifest()
        {
            EnsureApiClient();
            deviceManifest = null;
            deviceManifestLine = "device manifest loading";
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.device_manifest : null, apiClient.DeviceManifestUrl);
            SetRokidConnection(RokidConnectionStatus.Connecting, deviceManifestLine);

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        deviceManifest = JsonUtility.FromJson<DeviceManifestResponse>(request.downloadHandler.text);
                        if (deviceManifest == null || !deviceManifest.ok)
                        {
                            deviceManifestLine = "device manifest invalid";
                            Debug.LogWarning(deviceManifestLine + " | " + url);
                            SetRokidConnection(RokidConnectionStatus.Error, deviceManifestLine);
                        }
                        else
                        {
                            deviceManifestLine = BuildAdapterReadinessStatusLine();
                            Debug.Log("Device manifest loaded: " + deviceManifestLine + " | " + url);
                            SetRokidConnection(RokidConnectionStatus.Connected, deviceManifestLine);
                        }
                    }
                    catch (Exception error)
                    {
                        deviceManifest = null;
                        deviceManifestLine = "device manifest parse failed";
                        Debug.LogWarning(deviceManifestLine + ": " + error.Message + " | " + url);
                        SetRokidConnection(RokidConnectionStatus.Error, deviceManifestLine);
                    }
                }
                else
                {
                    deviceManifestLine = "device manifest unavailable: " + request.error;
                    Debug.LogWarning(deviceManifestLine + " | " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, request.error);
                }
            }

            if (space != null)
            {
                RefreshHud();
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
                ConfirmEntryOrCompleteNextStep();
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
            if (IsA1EntryAnchor(selectedAnchorId))
            {
                PrimeA1SpatialEntryLock("anchor_select");
            }

            BeaconData[] beacons = FindBeacons(anchorId);
            string beaconLine = beacons.Length == 0 ? "No beacon yet" : beacons[beacons.Length - 1].display_text;

            SetStatus("Anchor " + anchorId + " selected", anchor != null ? anchor.label : "Unknown anchor");
            SetDetail(beaconLine + "\n" + GetMissionLine());
            RefreshAnchorVisualStates();
            RefreshTargetHud();
        }

        private void ConfirmEntryOrCompleteNextStep()
        {
            if (ShouldConfirmA1SpatialEntry())
            {
                ConfirmA1SpatialEntryExperience("keyboard_confirm");
                return;
            }

            CompleteNextStep();
        }

        private bool ShouldConfirmA1SpatialEntry()
        {
            return !a1SpatialEntryConfirmed && IsA1EntryAnchor(CurrentActiveAnchorId());
        }

        private void ResetA1SpatialEntryExperience()
        {
            a1SpatialEntryLocked = false;
            a1SpatialEntryConfirmed = false;
            a1EntryLockState = RokidA1SpatialEntryStates.WaitingForA1;
            entryConfirmationStatus = "entry_confirmation_pending";
            spatialLayerTransitionState = RokidA1SpatialEntryStates.SpatialLayerStandby;
            spatialLayerTransitionLabel = "Spatial layer waits for A1 deliberate confirmation.";
            a1EntryConfirmationDistanceMeters = A1EntryConfirmationFallbackDistanceMeters;
            ApplyLocalA1SpatialEntryToMissionState();
        }

        private void PrimeA1SpatialEntryLock(string source)
        {
            if (a1SpatialEntryConfirmed)
            {
                return;
            }

            a1SpatialEntryLocked = true;
            a1EntryLockState = RokidA1SpatialEntryStates.LockCandidate;
            entryConfirmationStatus = "entry_confirmation_ready";
            spatialLayerTransitionState = RokidA1SpatialEntryStates.SpatialLayerStandby;
            spatialLayerTransitionLabel = "A1 lock candidate; confirm at " + A1EntryConfirmationWindowLabel() + " to 开启空间层.";
            ApplyLocalA1SpatialEntryToMissionState();
        }

        private void ConfirmA1SpatialEntryExperience(string source)
        {
            selectedAnchorId = A1EntryAnchorId;
            AnchorData anchor = FindAnchor(A1EntryAnchorId);
            a1SpatialEntryLocked = true;
            a1SpatialEntryConfirmed = true;
            a1EntryLockState = RokidA1SpatialEntryStates.DeliberateConfirmed;
            entryConfirmationStatus = "entry_confirmation_confirmed";
            spatialLayerTransitionState = RokidA1SpatialEntryStates.SpatialLayerOpening;
            spatialLayerTransitionLabel = "开启空间层 transition armed from A1 deliberate confirmation.";
            a1EntryConfirmationDistanceMeters = A1EntryConfirmationFallbackDistanceMeters;

            if (missionState != null)
            {
                missionState.SelectAnchor(A1EntryAnchorId, anchor != null ? anchor.label : "Entry Poster", anchor != null ? anchor.kind : "entry");
            }
            ApplyLocalA1SpatialEntryToMissionState();
            SetStatus("A1 spatial entry confirmed", "0.45m deliberate confirmation · 开启空间层 · fallback is not hardware ready");
            RefreshAnchorVisualStates();
            RefreshHud();
        }

        private void ApplyLocalA1SpatialEntryToMissionState()
        {
            if (missionState == null || missionState.ar_shell == null)
            {
                return;
            }

            missionState.ar_shell.SetA1SpatialEntryExperience(
                "a1_spatial_entry_experience",
                a1EntryLockState,
                A1EntryLockLabel(),
                entryConfirmationStatus,
                A1EntryConfirmMinDistanceMeters,
                A1EntryConfirmMaxDistanceMeters,
                a1EntryConfirmationDistanceMeters,
                spatialLayerTransitionState,
                spatialLayerTransitionLabel,
                false);

            if (a1SpatialEntryConfirmed)
            {
                missionState.ar_shell.SetSpatialEntry(
                    RokidSpatialEntryStates.A1EntryConfirmed,
                    "Spatial entry: A1 deliberate confirmation, fallback not hardware ready");
            }
            missionState.ar_shell.RefreshStatusLabel();
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
            yield return PostInteraction(stepId, "doing");
        }

        private IEnumerator PostInteraction(string stepId, string missionStateValue)
        {
            yield return PostInteraction(stepId, missionStateValue, CurrentActiveAnchorId());
        }

        private IEnumerator PostInteraction(string stepId, string missionStateValue, string anchorId)
        {
            InteractionRequest request = new InteractionRequest
            {
                source = RequestSourceName(),
                session_id = CurrentCalibrationSessionId(),
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId.Trim(),
                anchor_id = SafeLabel(anchorId, CurrentActiveAnchorId()),
                user_id = CurrentUserId(),
                step_id = stepId,
                mission_state = string.IsNullOrWhiteSpace(missionStateValue) ? "doing" : missionStateValue.Trim()
            };
            yield return PostJson(apiClient.InteractionsUrl, JsonUtility.ToJson(request), "Interaction posted");
            yield return LoadSpace();
        }

        private IEnumerator PostServiceAction()
        {
            ServiceActionRequest request = new ServiceActionRequest
            {
                source = RequestSourceName(),
                session_id = CurrentCalibrationSessionId(),
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId.Trim(),
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
                devicePairingLine = "pairing required-for-hardware";
                yield break;
            }

            devicePairingLine = HasOperatorPairingCode() ? "pairing submitted" : "pairing required-for-hardware";
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
                    string responseJson = request.downloadHandler.text;
                    deviceSession = JsonUtility.FromJson<DeviceRuntimeSessionResponse>(responseJson);
                    deviceSessionId = deviceSession != null ? deviceSession.session_id : string.Empty;
                    deviceId = deviceSession != null ? deviceSession.device_id : payload.device_id;
                    heartbeatClockSeconds = 0f;
                    devicePairingLine = BuildDevicePairingLine(responseJson);
                    deviceRuntimeLine = "device session " + ShortId(deviceSessionId) + " registered";
                    Debug.Log("Device pairing status: " + devicePairingLine);
                    SetRokidConnection(RokidConnectionStatus.Connected, deviceRuntimeLine);
                    StartCoroutine(PostDeviceHeartbeat());
                }
                else
                {
                    deviceSession = null;
                    deviceSessionId = string.Empty;
                    if (HasOperatorPairingCode()) devicePairingLine = "pairing submitted: register failed";
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

        private IEnumerator LoadFieldAcceptanceManifest()
        {
            EnsureApiClient();
            fieldAcceptanceManifest = null;
            fieldAcceptanceLine = "field acceptance loading";
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.field_acceptance : null, apiClient.FieldAcceptanceUrl);
            SetRokidConnection(RokidConnectionStatus.Connecting, fieldAcceptanceLine);

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        fieldAcceptanceManifest = JsonUtility.FromJson<FieldAcceptanceManifest>(request.downloadHandler.text);
                        if (fieldAcceptanceManifest == null || string.IsNullOrWhiteSpace(fieldAcceptanceManifest.schema))
                        {
                            fieldAcceptanceLine = "field acceptance invalid";
                            Debug.LogWarning(fieldAcceptanceLine + ": missing manifest schema | " + url);
                            SetRokidConnection(RokidConnectionStatus.Error, fieldAcceptanceLine);
                        }
                        else
                        {
                            fieldAcceptanceLine = BuildFieldAcceptanceStatusLine();
                            Debug.Log("Field acceptance loaded: " + fieldAcceptanceLine + " | " + url);
                            SetRokidConnection(RokidConnectionStatus.Connected, fieldAcceptanceLine);
                        }
                    }
                    catch (Exception error)
                    {
                        fieldAcceptanceManifest = null;
                        fieldAcceptanceLine = "field acceptance parse failed";
                        Debug.LogWarning(fieldAcceptanceLine + ": " + error.Message + " | " + url);
                        SetRokidConnection(RokidConnectionStatus.Error, fieldAcceptanceLine);
                    }
                }
                else
                {
                    fieldAcceptanceLine = "field acceptance unavailable: " + request.error;
                    Debug.LogWarning(fieldAcceptanceLine + " | " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, fieldAcceptanceLine);
                }
            }

            if (space != null)
            {
                RefreshHud();
            }
        }

        private IEnumerator LoadFieldOperatorPlanManifest()
        {
            EnsureApiClient();
            fieldOperatorPlan = null;
            fieldOperatorPlanLine = "operator plan loading";
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.field_operator_plan : null, apiClient.FieldOperatorPlanUrl);

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.timeout = RequestTimeoutSeconds();
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        fieldOperatorPlan = JsonUtility.FromJson<FieldOperatorPlanManifest>(request.downloadHandler.text);
                        if (fieldOperatorPlan == null || string.IsNullOrWhiteSpace(fieldOperatorPlan.schema))
                        {
                            fieldOperatorPlan = null;
                            fieldOperatorPlanLine = "operator phase unknown";
                            Debug.LogWarning(fieldOperatorPlanLine + ": missing schema | " + url);
                        }
                        else
                        {
                            fieldOperatorPlanLine = BuildFieldOperatorPlanStatusLine();
                            Debug.Log("Field operator plan loaded: " + fieldOperatorPlanLine + " | " + url);
                        }
                    }
                    catch (Exception error)
                    {
                        fieldOperatorPlan = null;
                        fieldOperatorPlanLine = "operator phase unknown";
                        Debug.LogWarning("Field operator plan parse failed: " + error.Message + " | " + url);
                    }
                }
                else
                {
                    fieldOperatorPlanLine = "operator phase unknown";
                    Debug.LogWarning("Field operator plan unavailable: " + request.error + " | " + url);
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
            yield return LoadFieldAcceptanceManifest();
            yield return LoadFieldOperatorPlanManifest();
            if (space != null)
            {
                RefreshHud();
            }
        }

        public void SubmitRokidTrackedImageObservation(int imageIndex, Pose pose, Vector2 size, string eventType)
        {
            string anchorId = AnchorIdForRokidTrackedImageIndex(imageIndex);
            if (string.IsNullOrWhiteSpace(anchorId))
            {
                wallCalibrationObservationLine = "trusted image observation ignored | unknown image index " + imageIndex;
                Debug.LogWarning("IW_TARGET_IGNORED_UNKNOWN_INDEX image_index=" + imageIndex
                    + " event=" + SafeLabel(eventType, "event"));
                RefreshHud();
                return;
            }

            string trustedGateReason = TrustedRokidHardwareObservationGateReason();
            SelectAnchor(anchorId);
            if (IsA1EntryAnchor(anchorId))
            {
                PrimeA1SpatialEntryLock("rokid_tracked_image");
            }

            if (!string.IsNullOrEmpty(trustedGateReason))
            {
                QueuePendingTrustedTargetObservation(anchorId, imageIndex, pose, size, eventType, trustedGateReason);
                wallCalibrationObservationLine = "trusted image observation pending | live paired session required | anchor " + anchorId;
                Debug.Log("IW_TARGET_GATE_LIVE_PAIRING_REQUIRED anchor=" + SafeLabel(anchorId, "unknown")
                    + " image_index=" + imageIndex
                    + " event=" + SafeLabel(eventType, "event")
                    + " reason=" + trustedGateReason
                    + " queued=true");
                RefreshHud();
                return;
            }

            if (!ShouldPostTrustedHardwareObservation(anchorId, eventType))
            {
                return;
            }

            StartCoroutine(SubmitRokidTrackedImageObservation(anchorId, imageIndex, pose, size, eventType));
        }

        private IEnumerator SubmitRokidTrackedImageObservation(string anchorId, int imageIndex, Pose pose, Vector2 size, string eventType)
        {
            EnsureApiClient();
            if (wallCalibrationObservationInFlight)
            {
                yield break;
            }

            WallCalibrationAnchor anchor = FindWallCalibrationAnchor(anchorId);
            string mode = TrustedTrackingModeForAnchor(anchorId);
            WallCalibrationObservationPayload payload = BuildRokidTrackedImageObservationPayload(anchor, anchorId, imageIndex, pose, size, mode, eventType);
            string json = JsonUtility.ToJson(payload);
            string url = ResolveEndpointUrl(bootstrap != null && bootstrap.endpoints != null ? bootstrap.endpoints.wall_calibration_observations : null, apiClient.WallCalibrationObservationsUrl);
            bool shouldAdvanceTrustedMission = false;
            wallCalibrationObservationInFlight = true;
            wallCalibrationObservationLine = "trusted " + mode + " observation posting | anchor " + anchorId + " | image " + imageIndex;
            Debug.Log("IW_TARGET_POST_START anchor=" + SafeLabel(anchorId, "unknown")
                + " image_index=" + imageIndex
                + " mode=" + SafeLabel(mode, "unknown")
                + " event=" + SafeLabel(eventType, "event"));
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
                                WallCalibrationAnchor resolvedAnchor = anchor ?? FindWallCalibrationAnchor(anchorId);
                                if (resolvedAnchor != null)
                                {
                                    resolvedAnchor.latest_observation = lastWallCalibrationObservation;
                                }
                                UpdateFieldMarkerObservation(anchorId, lastWallCalibrationObservation, lastWallCalibrationObservationResult.summary);
                            }
                        }

                        wallCalibrationObservationLine = BuildWallCalibrationObservationLine();
                        wallCalibrationLine = BuildWallCalibrationStatusLine();
                        fieldMarkerLine = BuildFieldMarkerStatusLine();
                        Debug.Log("Trusted Rokid image observation posted: " + wallCalibrationObservationLine + " | " + url);
                        SetStatus("Trusted image observation posted", wallCalibrationObservationLine);
                        SetRokidConnection(RokidConnectionStatus.Connected, wallCalibrationObservationLine);
                        shouldAdvanceTrustedMission = IsTrustedAcceptedHardwareObservation(lastWallCalibrationObservation);
                        Debug.Log("IW_TARGET_POST_RESULT anchor=" + SafeLabel(anchorId, "unknown")
                            + " status=" + SafeLabel(lastWallCalibrationObservation != null ? lastWallCalibrationObservation.status : null, "missing")
                            + " trusted=" + BoolLabel(lastWallCalibrationObservation != null
                                && lastWallCalibrationObservation.acceptance != null
                                && lastWallCalibrationObservation.acceptance.hardware_observation_trusted)
                            + " mission_assist_candidate=" + BoolLabel(shouldAdvanceTrustedMission));
                    }
                    catch (Exception error)
                    {
                        lastWallCalibrationObservationResult = null;
                        lastWallCalibrationObservation = null;
                        wallCalibrationObservationLine = "trusted image observation parse failed | anchor " + anchorId;
                        Debug.LogWarning("IW_TARGET_POST_FAIL anchor=" + SafeLabel(anchorId, "unknown")
                            + " stage=parse"
                            + " error=" + SafeLabel(error.GetType().Name, "parse_error"));
                        Debug.LogWarning(wallCalibrationObservationLine + ": " + error.Message + " | " + url);
                        SetStatus("Trusted image observation failed", error.Message);
                        SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationObservationLine);
                    }
                }
                else
                {
                    wallCalibrationObservationLine = "trusted image observation failed | anchor " + anchorId + " | http " + request.responseCode;
                    Debug.LogWarning("IW_TARGET_POST_FAIL anchor=" + SafeLabel(anchorId, "unknown")
                        + " stage=http"
                        + " status_code=" + request.responseCode);
                    Debug.LogWarning(wallCalibrationObservationLine + ": " + request.error + " | " + url);
                    SetStatus("Trusted image observation failed", request.error + " " + url);
                    SetRokidConnection(RokidConnectionStatus.Error, wallCalibrationObservationLine);
                }
            }

            wallCalibrationObservationInFlight = false;
            if (shouldAdvanceTrustedMission)
            {
                yield return AdvanceMissionFromTrustedImageObservation(anchorId, lastWallCalibrationObservation);
            }
            yield return LoadFieldAcceptanceManifest();
            yield return LoadFieldOperatorPlanManifest();
            if (space != null)
            {
                RefreshHud();
            }

            TryFlushPendingTrustedTargetObservations("post_complete");
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
                    TryFlushPendingTrustedTargetObservations("heartbeat_ack");
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
            yield return PostWriteBack(text);
        }

        private IEnumerator PostWriteBack(string text)
        {
            WriteBackRequest request = new WriteBackRequest
            {
                source = RequestSourceName(),
                session_id = CurrentCalibrationSessionId(),
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId.Trim(),
                user_id = CurrentUserId(),
                anchor_id = "A3",
                title = "Unity shell",
                text = string.IsNullOrWhiteSpace(text) ? "Unity shell writeback" : text.Trim()
            };
            yield return PostJson(apiClient.WriteBackUrl, JsonUtility.ToJson(request), "Writeback posted");
            yield return LoadSpace();
        }

        private IEnumerator SwitchUserB()
        {
            InteractionRequest request = new InteractionRequest
            {
                source = RequestSourceName(),
                session_id = CurrentCalibrationSessionId(),
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId.Trim(),
                anchor_id = "A3",
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

        private IEnumerator AdvanceMissionFromTrustedImageObservation(string anchorId, WallCalibrationObservation observation)
        {
            string cleanAnchorId = SafeLabel(anchorId, string.Empty);
            if (!IsTrustedAcceptedHardwareObservation(observation))
            {
                trustedHardwareMissionAssistLine = "trusted target mission assist gated | anchor " + SafeLabel(cleanAnchorId, "unknown");
                LogTargetMissionAssist(cleanAnchorId, "gated_untrusted_observation");
                yield break;
            }

            if (IsA1EntryAnchor(cleanAnchorId))
            {
                trustedHardwareMissionAssistLine = "trusted A1 target locked | deliberate entry confirmation still required";
                LogTargetMissionAssist(cleanAnchorId, "a1_deliberate_confirmation_required");
                yield break;
            }

            if (string.Equals(cleanAnchorId, "A2", StringComparison.OrdinalIgnoreCase))
            {
                bool postedRead = false;
                if (MissionHasStep("read") && !IsMissionStepComplete("read"))
                {
                    yield return PostInteraction("read", InnerWorldMissionStates.Reading, "A2");
                    postedRead = true;
                }
                if (MissionHasStep("find_year") && !IsMissionStepComplete("find_year"))
                {
                    yield return PostInteraction("find_year", InnerWorldMissionStates.Doing, "A2");
                    postedRead = true;
                }

                trustedHardwareMissionAssistLine = postedRead
                    ? "trusted A2 mission assist posted read/find_year"
                    : "trusted A2 mission assist already complete";
                LogTargetMissionAssist(cleanAnchorId, postedRead ? "a2_read_find_year_posted" : "a2_read_find_year_already_complete");
                yield break;
            }

            if (string.Equals(cleanAnchorId, "A3", StringComparison.OrdinalIgnoreCase))
            {
                bool serviceReady = IsMissionStepComplete("service_action")
                    || MissionStateIs(InnerWorldMissionStates.ServiceReady);
                if (!serviceReady)
                {
                    trustedHardwareMissionAssistLine = "trusted A3 target locked | service action required before TimeMark";
                    LogTargetMissionAssist(cleanAnchorId, "a3_service_action_required");
                    yield break;
                }

                if (MissionHasStep("write_back") && !IsMissionStepComplete("write_back"))
                {
                    string text = "Rokid trusted TimeMark " + DateTime.Now.ToString("HH:mm:ss");
                    yield return PostWriteBack(text);
                    trustedHardwareMissionAssistLine = "trusted A3 mission assist posted TimeMark write-back";
                    LogTargetMissionAssist(cleanAnchorId, "a3_timemark_write_back_posted");
                    yield break;
                }

                trustedHardwareMissionAssistLine = "trusted A3 mission assist write-back already complete";
                LogTargetMissionAssist(cleanAnchorId, "a3_timemark_write_back_already_complete");
            }
        }

        private void LogTargetMissionAssist(string anchorId, string action)
        {
            Debug.Log("IW_TARGET_MISSION_ASSIST anchor=" + SafeLabel(anchorId, "unknown")
                + " action=" + SafeLabel(action, "unknown"));
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
            SetStatus("InnerWorld Spatial Layer", space.name + " | " + source + " | " + runtime);
            SetDetail(BuildExecutiveRuntimeLine());
            GetMissionLine();
            RefreshInputStatusLine();
            RefreshTargetHud();
            RefreshRadarHud();
            if (keyHintText != null) keyHintText.text = "R reload | Space/Enter confirm | C calibrate | S service | W write | B user";
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
                string progress = missionState != null ? " | " + MissionProgressLabel() : string.Empty;
                stepText.text = "NOW " + (index + 1) + "/" + space.mission.steps.Length + "  " + step.label + progress;
            }
            return step.label + " - " + step.hint;
        }

        private string BuildExecutiveRuntimeLine()
        {
            string missionLine = GetMissionLine();
            return missionLine
                + "\n" + MissionProgressLabel() + " | anchors " + SafeAnchors().Length + " | beacons " + SafeBeacons().Length
                + "\nDevice " + ShortId(deviceSessionId) + " | " + PairingHudBadge() + " | " + AdapterBoundaryLabel()
                + "\nEntry " + BuildA1SpatialEntryHudLine()
                + "\nAdapter " + BuildAdapterReadinessStatusLine()
                + "\nWall " + WallCalibrationHudBadge() + " | " + BuildFieldMarkerReadinessLine()
                + "\nSite " + FieldAcceptanceHudBadge() + " | blockers " + FieldAcceptanceBlockingCount()
                + "\nOperator " + BuildFieldOperatorPlanHudLine()
                + "\nShell " + ArShellStatusCompactLabel()
                + "\nTarget " + ActiveAnchorSummaryLabel();
        }

        private string MissionProgressLabel()
        {
            if (space == null || space.mission == null || space.mission.steps == null || space.mission.steps.Length == 0)
            {
                return "progress 0/0";
            }

            int done = missionState != null ? missionState.CompletedStepCount : Mathf.Clamp(localStepIndex, 0, space.mission.steps.Length);
            return "progress " + done + "/" + space.mission.steps.Length;
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

            GameObject panel = CreateHudPanel(
                "Operator Rail",
                canvasObject.transform,
                new Vector2(0f, 1f),
                new Vector2(0f, 1f),
                new Vector2(24f, -24f),
                new Vector2(440f, 318f),
                new Color(0.02f, 0.03f, 0.038f, 0.82f));
            CreateAccentBar("Operator Accent", panel.transform, new Color(0.36f, 0.92f, 1f, 0.92f), 3f, true);

            sourceText = CreateText("Source", panel.transform, 13, FontStyle.Bold);
            sourceText.color = new Color(0.72f, 0.88f, 0.95f);
            SetRect(sourceText.rectTransform, 18f, -14f, 400f, 42f);

            statusText = CreateText("Status", panel.transform, 18, FontStyle.Bold);
            statusText.color = new Color(0.94f, 0.98f, 1f);
            SetRect(statusText.rectTransform, 18f, -62f, 400f, 52f);

            stepText = CreateText("Step", panel.transform, 15, FontStyle.Bold);
            stepText.color = new Color(0.96f, 0.9f, 0.55f);
            SetRect(stepText.rectTransform, 18f, -120f, 400f, 30f);

            detailText = CreateText("Detail", panel.transform, 12, FontStyle.Normal);
            detailText.color = new Color(0.78f, 0.88f, 0.92f);
            SetRect(detailText.rectTransform, 18f, -154f, 400f, 142f);

            GameObject targetPanel = CreateHudPanel(
                "Target Card",
                canvasObject.transform,
                new Vector2(1f, 1f),
                new Vector2(1f, 1f),
                new Vector2(-24f, -24f),
                new Vector2(420f, 252f),
                new Color(0.025f, 0.034f, 0.042f, 0.8f));
            CreateAccentBar("Target Accent", targetPanel.transform, new Color(1f, 0.82f, 0.26f, 0.92f), 3f, true);

            systemText = CreateText("System", targetPanel.transform, 12, FontStyle.Bold);
            systemText.color = new Color(0.7f, 0.86f, 0.94f);
            SetRect(systemText.rectTransform, 18f, -14f, 382f, 34f);

            targetText = CreateText("Target", targetPanel.transform, 13, FontStyle.Bold);
            targetText.color = new Color(0.98f, 0.9f, 0.42f);
            SetRect(targetText.rectTransform, 18f, -54f, 382f, 178f);

            GameObject radarPanel = CreateHudPanel(
                "Radar Strip",
                canvasObject.transform,
                new Vector2(0.5f, 0f),
                new Vector2(0.5f, 0f),
                new Vector2(0f, 22f),
                new Vector2(820f, 96f),
                new Color(0.018f, 0.026f, 0.032f, 0.82f));
            CreateAccentBar("Radar Accent", radarPanel.transform, new Color(0.42f, 1f, 0.74f, 0.86f), 2f, false);

            radarText = CreateText("Radar", radarPanel.transform, 13, FontStyle.Bold);
            radarText.color = new Color(0.72f, 1f, 0.88f);
            SetRect(radarText.rectTransform, 18f, -12f, 520f, 42f);

            keyHintText = CreateText("Key Hints", radarPanel.transform, 12, FontStyle.Bold);
            keyHintText.color = new Color(0.76f, 0.93f, 1f);
            SetRect(keyHintText.rectTransform, 18f, -56f, 520f, 24f);

            float x = 552f;
            CreateButton("Reload", radarPanel.transform, x, -14f, 72f, () => StartCoroutine(BootstrapAndLoadSpace()));
            x += 78f;
            CreateButton("Next", radarPanel.transform, x, -14f, 58f, CompleteNextStep);
            x += 64f;
            CreateButton("Svc", radarPanel.transform, x, -14f, 50f, () => StartCoroutine(PostServiceAction()));
            x += 56f;
            CreateButton("Write", radarPanel.transform, x, -14f, 58f, () => StartCoroutine(PostWriteBack()));
            x = 552f;
            CreateButton("User B", radarPanel.transform, x, -52f, 72f, () => StartCoroutine(SwitchUserB()));
            x += 78f;
            CreateButton("Calib", radarPanel.transform, x, -52f, 58f, () => StartCoroutine(SubmitWallCalibrationObservation("manual")));

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

                GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Quad);
                marker.name = "Anchor " + anchor.anchor_id + " - " + anchor.label;
                marker.transform.position = displayPosition;
                marker.transform.rotation = Quaternion.LookRotation((cameraPosition - displayPosition).normalized, Vector3.up);
                Vector3 baseScale = AnchorBaseScale(anchor);
                Color baseColor = ColorForAnchor(anchor.kind);
                marker.transform.localScale = baseScale;
                Renderer markerRenderer = marker.GetComponent<Renderer>();
                ApplyMaterial(markerRenderer, baseColor);
                AnchorClickTarget click = marker.AddComponent<AnchorClickTarget>();
                click.anchorId = anchor.anchor_id;
                click.controller = this;
                spawnedObjects.Add(marker);

                GameObject label = new GameObject("Label " + anchor.anchor_id);
                label.transform.position = displayPosition + new Vector3(-0.26f, 0.28f, -0.03f);
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

                LineRenderer haloLine = CreateAnchorHalo(anchor.anchor_id, displayPosition, baseColor);
                LineRenderer stemLine = CreateAnchorStem(anchor.anchor_id, displayPosition, baseColor);
                anchorVisuals[anchor.anchor_id] = new AnchorVisualState(anchor, marker.transform, markerRenderer, mesh, haloLine, stemLine, baseScale, baseColor);
            }

            BuildSpatialRouteLine();

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

        private Vector3 AnchorBaseScale(AnchorData anchor)
        {
            if (anchor != null && anchor.kind == "write_back") return new Vector3(0.34f, 0.22f, 1f);
            if (anchor != null && anchor.kind == "entry") return new Vector3(0.32f, 0.2f, 1f);
            return new Vector3(0.36f, 0.24f, 1f);
        }

        private LineRenderer CreateAnchorHalo(string anchorId, Vector3 displayPosition, Color color)
        {
            GameObject halo = new GameObject("Halo " + anchorId);
            halo.transform.position = displayPosition + new Vector3(0f, 0f, -0.018f);
            halo.transform.rotation = Quaternion.LookRotation((cameraPosition - displayPosition).normalized, Vector3.up);
            LineRenderer line = halo.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.loop = true;
            line.positionCount = 72;
            line.numCapVertices = 4;
            line.startWidth = 0.006f;
            line.endWidth = 0.006f;
            line.startColor = color;
            line.endColor = color;
            Material material = CreateLineMaterial(color, 0.6f);
            if (material != null) line.material = material;
            SetCircleLine(line, 0.24f);
            spawnedObjects.Add(halo);
            return line;
        }

        private LineRenderer CreateAnchorStem(string anchorId, Vector3 displayPosition, Color color)
        {
            GameObject stem = new GameObject("Stem " + anchorId);
            LineRenderer line = stem.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 2;
            line.numCapVertices = 4;
            line.startWidth = 0.008f;
            line.endWidth = 0.002f;
            line.startColor = color;
            line.endColor = new Color(color.r, color.g, color.b, 0.18f);
            Material material = CreateLineMaterial(color, 0.45f);
            if (material != null) line.material = material;
            line.SetPosition(0, displayPosition + new Vector3(0f, -0.02f, -0.03f));
            line.SetPosition(1, displayPosition + new Vector3(0f, -0.46f, 0.08f));
            spawnedObjects.Add(stem);
            return line;
        }

        private void BuildSpatialRouteLine()
        {
            if (!anchorVisuals.ContainsKey("A1") || !anchorVisuals.ContainsKey("A2") || !anchorVisuals.ContainsKey("A3"))
            {
                return;
            }

            GameObject route = new GameObject("A1 A2 A3 Spatial Route");
            LineRenderer line = route.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 3;
            line.numCapVertices = 6;
            line.numCornerVertices = 8;
            line.startWidth = 0.012f;
            line.endWidth = 0.012f;
            Color color = new Color(0.42f, 1f, 0.84f, 0.72f);
            line.startColor = color;
            line.endColor = color;
            Material material = CreateLineMaterial(color, 0.5f);
            if (material != null) line.material = material;
            line.SetPosition(0, anchorVisuals["A1"].MarkerTransform.position + new Vector3(0f, 0f, -0.045f));
            line.SetPosition(1, anchorVisuals["A2"].MarkerTransform.position + new Vector3(0f, 0f, -0.045f));
            line.SetPosition(2, anchorVisuals["A3"].MarkerTransform.position + new Vector3(0f, 0f, -0.045f));
            spawnedObjects.Add(route);
        }

        private string AnchorBeaconLine(string anchorId)
        {
            BeaconData[] beacons = FindBeacons(anchorId);
            if (beacons.Length == 0) return "layer pending";
            return beacons[beacons.Length - 1].display_text;
        }

        private string AnchorKindLabel(AnchorData anchor)
        {
            if (anchor == null || string.IsNullOrWhiteSpace(anchor.kind)) return "spatial node";
            if (anchor.kind == "entry") return "entry gate";
            if (anchor.kind == "write_back") return "write-back node";
            if (anchor.kind == "memory") return "memory beacon";
            return anchor.kind.Trim();
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

        private Material CreateLineMaterial(Color color, float emissionStrength)
        {
            Shader shader = FindRuntimeShader();
            if (shader == null) return null;
            Material material = new Material(shader);
            SetMaterialColor(material, color, emissionStrength);
            return material;
        }

        private void SetCircleLine(LineRenderer line, float radius)
        {
            if (line == null) return;

            int count = Mathf.Max(8, line.positionCount);
            float safeRadius = Mathf.Max(0.03f, radius);
            for (int index = 0; index < count; index++)
            {
                float angle = (Mathf.PI * 2f * index) / count;
                line.SetPosition(index, new Vector3(Mathf.Cos(angle) * safeRadius, Mathf.Sin(angle) * safeRadius, 0f));
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
            if (IsA1EntryAnchor(currentGazeAnchorId))
            {
                PrimeA1SpatialEntryLock("gaze_focus");
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
            int visualIndex = 0;
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
                ApplyLineColor(visual.HaloLine, markerColor, isGaze || isSelected ? 0.75f : 0.35f);
                ApplyLineColor(visual.StemLine, markerColor, isGaze || isSelected ? 0.48f : 0.2f);

                if (visual.LabelMesh != null)
                {
                    visual.LabelMesh.color = labelColor;
                    visual.LabelMesh.text = BuildAnchorLabel(visual.Anchor, isGaze, isSelected);
                }

                AnimateAnchorVisual(visual, isGaze, isSelected, visualIndex);
                visualIndex++;
            }

            RefreshRadarHud();
        }

        private string BuildAnchorLabel(AnchorData anchor, bool isGaze, bool isSelected)
        {
            if (anchor == null) return string.Empty;

            string prefix = string.Empty;
            if (isSelected) prefix += "LOCK ";
            if (isGaze) prefix += "FOCUS ";
            return prefix + anchor.anchor_id + "  " + anchor.label + "\n" + AnchorKindLabel(anchor) + " | " + AnchorBeaconLine(anchor.anchor_id);
        }

        private void TickPremiumSpatialSurfaces()
        {
            int index = 0;
            foreach (AnchorVisualState visual in anchorVisuals.Values)
            {
                bool isGaze = visual.Anchor != null && visual.Anchor.anchor_id == currentGazeAnchorId;
                bool isSelected = visual.Anchor != null && visual.Anchor.anchor_id == selectedAnchorId;
                AnimateAnchorVisual(visual, isGaze, isSelected, index);
                index++;
            }
        }

        private void AnimateAnchorVisual(AnchorVisualState visual, bool isGaze, bool isSelected, int index)
        {
            if (visual == null) return;

            float wave = 0.5f + 0.5f * Mathf.Sin(visualClockSeconds * (isSelected ? 3.2f : 1.8f) + index * 0.9f);
            float baseRadius = isSelected ? 0.31f : (isGaze ? 0.28f : 0.23f);
            if (visual.HaloLine != null)
            {
                SetCircleLine(visual.HaloLine, baseRadius + wave * (isGaze || isSelected ? 0.018f : 0.008f));
                visual.HaloLine.startWidth = isSelected ? 0.012f : (isGaze ? 0.009f : 0.005f);
                visual.HaloLine.endWidth = visual.HaloLine.startWidth;
            }

            if (visual.StemLine != null)
            {
                visual.StemLine.startWidth = isSelected ? 0.012f : 0.007f + wave * 0.002f;
            }
        }

        private void ApplyLineColor(LineRenderer line, Color color, float alpha)
        {
            if (line == null) return;

            Color lineColor = new Color(color.r, color.g, color.b, Mathf.Clamp01(alpha));
            line.startColor = lineColor;
            line.endColor = new Color(color.r, color.g, color.b, Mathf.Clamp01(alpha * 0.55f));
            SetMaterialColor(line.material, lineColor, alpha);
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

            string debugLine = BuildWallCalibrationObservationLine() + " | " + BuildFieldMarkerActiveLine() + "\n" + BuildFieldAcceptanceDebugLine() + "\n" + BuildFieldOperatorPlanDebugLine();
            targetText.text = BuildPremiumTargetCardLine(debugLine);
            if (systemText != null) systemText.text = "ACTIVE TARGET | " + SpatialLockQualityLabel();
            RefreshRadarHud();
        }

        private string BuildPremiumTargetCardLine(string debugLine)
        {
            FieldMarkerAnchor marker = ResolveCurrentFieldMarkerAnchor();
            return SpatialFocusLine()
                + "\n" + BuildA1SpatialEntryHudLine()
                + "\n" + FieldMarkerTargetSummary(marker)
                + "\n" + ImageTargetAssetCardLine(marker)
                + "\n" + CalibrationCompactLine()
                + "\n" + AcceptanceCompactLine()
                + "\n" + BuildFieldOperatorPlanTargetLine();
        }

        private string SpatialFocusLine()
        {
            string focusAnchor = CurrentActiveAnchorId();
            string label = CurrentAnchorLabel(focusAnchor, currentGazeAnchorLabel);
            string mode = string.IsNullOrEmpty(selectedAnchorId) ? "focus" : "locked";
            if (!string.IsNullOrEmpty(currentGazeAnchorId) && currentGazeSelecting) mode = "selecting";
            return mode.ToUpperInvariant() + " " + focusAnchor + " | " + label;
        }

        private string BuildA1SpatialEntryHudLine()
        {
            return "a1_spatial_entry_experience | " + a1EntryLockState
                + " | " + entryConfirmationStatus
                + " | " + A1EntryConfirmationWindowLabel()
                + " | " + spatialLayerTransitionState
                + " | " + spatialLayerTransitionLabel
                + " | fallback_not_hardware_ready";
        }

        private string BuildA1SpatialEntryHeartbeatLine()
        {
            return "a1_spatial_entry_experience: a1_lock_state " + a1EntryLockState
                + ", entry_confirmation_status " + entryConfirmationStatus
                + ", confirmation_window_m " + A1EntryConfirmMinDistanceMeters.ToString("0.00") + "-" + A1EntryConfirmMaxDistanceMeters.ToString("0.00")
                + ", confirmation_distance_m " + a1EntryConfirmationDistanceMeters.ToString("0.00")
                + ", spatial_layer_transition_state " + spatialLayerTransitionState
                + ", readiness " + A1SpatialEntryReadinessStatus()
                + ", fallback_hardware_ready false";
        }

        private string A1SpatialEntryReadinessStatus()
        {
            if (a1SpatialEntryConfirmed) return "ready_to_open_spatial_layer";
            if (a1SpatialEntryLocked) return "ready_for_deliberate_confirmation";
            return "waiting_for_a1_lock";
        }

        private string A1EntryLockLabel()
        {
            if (a1SpatialEntryConfirmed)
            {
                return "A1 lock confirmed at " + A1EntryConfirmationFallbackDistanceMeters.ToString("0.00") + "m; fallback does not claim hardware ready";
            }

            if (a1SpatialEntryLocked)
            {
                return "A1 lock candidate; deliberate confirmation window " + A1EntryConfirmationWindowLabel();
            }

            return "A1 lock waiting; stand near Entry Poster before opening spatial layer";
        }

        private string A1EntryConfirmationWindowLabel()
        {
            return A1EntryConfirmMinDistanceMeters.ToString("0.0") + "m-" + A1EntryConfirmMaxDistanceMeters.ToString("0.0") + "m deliberate confirmation";
        }

        private string FieldMarkerTargetSummary(FieldMarkerAnchor marker)
        {
            if (marker == null) return "Marker none | waiting for field manifest";
            string markerId = marker.marker != null ? SafeLabel(marker.marker.marker_id, marker.anchor_id) : SafeLabel(marker.anchor_id, "unknown");
            string markerType = marker.marker != null ? SafeLabel(marker.marker.marker_type, "marker") : "marker";
            return "Marker " + markerId + " | " + markerType + " | " + TrackingModesLabel(marker.tracking_modes);
        }

        private string ImageTargetAssetCardLine(FieldMarkerAnchor marker)
        {
            if (marker == null || !IsImageTargetMarker(marker))
            {
                return "Asset QR entry | no image target import needed";
            }

            FieldMarkerImageTargetAsset asset = marker.image_target_asset;
            if (asset == null)
            {
                return "Asset missing | add target image before hardware import";
            }

            return "Asset " + SafeLabel(asset.asset_id, "unknown")
                + " | " + ShortAssetStatus(asset.unity_target_library_status)
                + " / " + ShortAssetStatus(asset.rokid_import_status)
                + " | " + ImageTargetPhysicalSizeLabel(asset)
                + " | sha " + ShortSha(asset.sha256);
        }

        private string CalibrationCompactLine()
        {
            string ready = WallCalibrationReadyFlag() ? "hardware lock ready" : "hardware lock pending";
            return "Wall " + ready + " | " + BuildWallCalibrationObservationLine();
        }

        private string AcceptanceCompactLine()
        {
            return "Site gates " + FieldAcceptanceReadyGateCount() + "/" + FieldAcceptanceTotalGateCount()
                + " ready | blockers " + FieldAcceptanceBlockingCount()
                + " | " + FieldAcceptanceTrackingGuardLabel();
        }

        private string ActiveAnchorSummaryLabel()
        {
            string anchorId = CurrentActiveAnchorId();
            return anchorId + " " + CurrentAnchorLabel(anchorId, currentGazeAnchorLabel) + " | " + SpatialLockQualityLabel();
        }

        private string SpatialLockQualityLabel()
        {
            if (!string.IsNullOrEmpty(selectedAnchorId)) return "locked";
            if (!string.IsNullOrEmpty(currentGazeAnchorId) && currentGazeSelecting) return "selecting";
            if (!string.IsNullOrEmpty(currentGazeAnchorId)) return "focus";
            return "searching";
        }

        private string ShortAssetStatus(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "pending";
            string clean = value.Trim();
            if (clean.IndexOf("ready", StringComparison.OrdinalIgnoreCase) >= 0) return "ready";
            if (clean.IndexOf("import", StringComparison.OrdinalIgnoreCase) >= 0) return "import";
            if (clean.IndexOf("pending", StringComparison.OrdinalIgnoreCase) >= 0) return "pending";
            return clean.Length <= 18 ? clean : clean.Substring(0, 18);
        }

        private string ArShellStatusCompactLabel()
        {
            if (missionState != null && !string.IsNullOrWhiteSpace(missionState.ArShellStatusLabel))
            {
                string label = missionState.ArShellStatusLabel.Trim();
                return label.Length <= 92 ? label : label.Substring(0, 92);
            }

            return presentationStrategy != null ? presentationStrategy.PremiumStatusLine : "AR shell pending";
        }

        private void RefreshRadarHud()
        {
            if (radarText == null) return;
            radarText.text = BuildRadarHudLine();
        }

        private string BuildRadarHudLine()
        {
            return "RADAR  "
                + RadarAnchorSegment("A1", "ENTRY")
                + "  ->  " + RadarAnchorSegment("A2", "MEMORY")
                + "  ->  " + RadarAnchorSegment("A3", "WRITE")
                + "\n" + MissionProgressLabel()
                + " | " + SpatialLockQualityLabel()
                + " | A1 " + A1SpatialEntryReadinessStatus()
                + " | " + ArShellStatusCompactLabel()
                + " | " + PairingHudBadge()
                + " | " + FieldAcceptanceHudBadge();
        }

        private string RadarAnchorSegment(string anchorId, string label)
        {
            string state = "idle";
            if (anchorId == selectedAnchorId) state = "lock";
            else if (anchorId == currentGazeAnchorId) state = currentGazeSelecting ? "select" : "focus";
            else if (missionState != null && missionState.CurrentStep != null && anchorId == missionState.CurrentStep.anchor_id) state = "next";
            return anchorId + ":" + label + "[" + state + "]";
        }

        private string CurrentAnchorLabel(string anchorId, string fallback)
        {
            AnchorData anchor = FindAnchor(anchorId);
            if (anchor != null && !string.IsNullOrWhiteSpace(anchor.label)) return anchor.label.Trim();
            if (!string.IsNullOrWhiteSpace(fallback)) return fallback.Trim();
            return string.IsNullOrEmpty(anchorId) ? "unknown" : anchorId;
        }

        private GameObject CreateHudPanel(string name, Transform parent, Vector2 anchor, Vector2 pivot, Vector2 position, Vector2 size, Color color)
        {
            GameObject panel = CreateUiObject(name, parent);
            RectTransform rect = panel.GetComponent<RectTransform>();
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = pivot;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Image image = panel.AddComponent<Image>();
            image.color = color;
            return panel;
        }

        private void CreateAccentBar(string name, Transform parent, Color color, float thickness, bool vertical)
        {
            GameObject item = CreateUiObject(name, parent);
            RectTransform rect = item.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = vertical ? new Vector2(0f, 1f) : new Vector2(1f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = vertical ? new Vector2(thickness, 0f) : new Vector2(0f, thickness);
            rect.offsetMin = vertical ? new Vector2(0f, 0f) : new Vector2(0f, -thickness);
            rect.offsetMax = vertical ? new Vector2(thickness, 0f) : new Vector2(0f, 0f);
            Image image = item.AddComponent<Image>();
            image.color = color;
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

            ApplyPresentationStrategyToMissionState();
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
            string fieldReadiness = BuildFieldMarkerReadinessLine();
            string acceptanceStatus = FieldAcceptanceHudBadge();
            string adapterReadiness = BuildAdapterReadinessCompactLine();
            sourceText.text = "INPUT " + CurrentInputSourceName() + " | " + mode + " | " + AdapterBoundaryLabel() + " | " + connection.Status
                + "\nSERVER " + (apiClient != null ? apiClient.BaseUrl : baseUrl) + " | " + CurrentDeviceProfile() + " | " + acceptanceStatus
                + "\nENTRY " + BuildA1SpatialEntryHudLine()
                + "\nADAPTER " + adapterReadiness;
            if (systemText != null)
            {
                systemText.text = "ACTIVE TARGET | " + SpatialLockQualityLabel() + " | " + A1SpatialEntryReadinessStatus() + " | " + ArShellStatusCompactLabel() + " | " + fieldReadiness + " | " + observation + " | " + adapterReadiness;
            }
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
            if (string.IsNullOrWhiteSpace(operatorPairingCode))
            {
                operatorPairingCode = ReadRuntimeOperatorPairingCode();
            }
        }

        private static string ReadRuntimeOperatorPairingCode()
        {
            string fromEnvironment = Environment.GetEnvironmentVariable(OperatorPairingCodeEnv);
            if (!string.IsNullOrWhiteSpace(fromEnvironment))
            {
                return fromEnvironment.Trim();
            }

            string fromArgs;
            if (TryReadRuntimeArg(Environment.GetCommandLineArgs(), OperatorPairingCodeArg, out fromArgs))
            {
                return fromArgs;
            }

            return ReadAndroidIntentOperatorPairingCode();
        }

        private static string ReadAndroidIntentOperatorPairingCode()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                using (AndroidJavaObject activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity"))
                {
                    if (activity == null) return string.Empty;

                    using (AndroidJavaObject intent = activity.Call<AndroidJavaObject>("getIntent"))
                    {
                        if (intent == null) return string.Empty;

                        string[] keys =
                        {
                            OperatorPairingCodeIntentExtra,
                            OperatorPairingCodeIntentExtraQualified,
                            OperatorPairingCodeArg
                        };
                        foreach (string key in keys)
                        {
                            string value = intent.Call<string>("getStringExtra", key);
                            if (!string.IsNullOrWhiteSpace(value))
                            {
                                return value.Trim();
                            }
                        }
                    }
                }
            }
            catch
            {
                return string.Empty;
            }
#endif
            return string.Empty;
        }

        private static bool TryReadRuntimeArg(string[] args, string name, out string value)
        {
            value = null;
            if (args == null || string.IsNullOrWhiteSpace(name)) return false;

            for (int index = 0; index < args.Length; index++)
            {
                string arg = args[index];
                if (string.IsNullOrWhiteSpace(arg)) continue;

                string prefix = name + "=";
                if (arg.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    value = arg.Substring(prefix.Length).Trim();
                    return value.Length > 0;
                }

                if (string.Equals(arg, name, StringComparison.OrdinalIgnoreCase)
                    && index + 1 < args.Length
                    && !string.IsNullOrWhiteSpace(args[index + 1])
                    && !args[index + 1].StartsWith("--", StringComparison.Ordinal))
                {
                    value = args[index + 1].Trim();
                    return true;
                }
            }

            return false;
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
            ApplyPresentationStrategyToMissionState();
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
                ApplyPresentationStrategyToMissionState();
                localStepIndex = missionState.current_step_index;
            }
        }

        private void ApplyPresentationStrategyToMissionState()
        {
            if (missionState != null && presentationStrategy != null)
            {
                missionState.ApplyPresentationStrategy(presentationStrategy);
                ApplyLocalA1SpatialEntryToMissionState();
            }
        }

        private IEnumerator LoadRuntimeServiceContracts()
        {
            EnsureApiClient();
            yield return LoadEvidenceChain();
            yield return LoadSessionPlan();
            yield return LoadFieldAcceptanceManifest();
            yield return LoadFieldOperatorPlanManifest();
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
            return evidence + " | " + session + " | " + device + "\n" + BuildA1SpatialEntryHudLine() + "\n" + BuildAdapterReadinessStatusLine() + "\n" + BuildWallCalibrationStatusLine() + "\n" + BuildFieldMarkerStatusLine() + "\n" + BuildFieldAcceptanceStatusLine() + "\n" + BuildFieldOperatorPlanStatusLine() + "\n" + trustedHardwareMissionAssistLine + "\n" + deviceRuntimeLine + " | " + devicePairingLine + " | " + AdapterBoundaryLabel();
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

        private WallCalibrationObservationPayload BuildRokidTrackedImageObservationPayload(
            WallCalibrationAnchor anchor,
            string anchorId,
            int imageIndex,
            Pose pose,
            Vector2 size,
            string trackingMode,
            string eventType)
        {
            float confidence = string.Equals(eventType, "updated", StringComparison.OrdinalIgnoreCase) ? 0.96f : 0.94f;
            return new WallCalibrationObservationPayload
            {
                session_id = CurrentCalibrationSessionId(),
                device_id = string.IsNullOrWhiteSpace(deviceId) ? CurrentDeviceId() : deviceId.Trim(),
                anchor_id = !string.IsNullOrWhiteSpace(anchorId) ? anchorId.Trim() : (anchor != null ? anchor.anchor_id : CurrentActiveAnchorId()),
                tracking_mode = trackingMode,
                observed_pose = BuildObservedPoseFromUnityPose(pose, confidence),
                confidence = confidence,
                notes = "Rokid UXR tracked image " + SafeLabel(eventType, "event")
                    + " | image_index " + imageIndex
                    + " | size_m " + size.x.ToString("0.000") + "x" + size.y.ToString("0.000")
                    + " | operator-paired live session required.",
                client_time = DateTime.UtcNow.ToString("o")
            };
        }

        private DevicePosePayload BuildObservedPoseFromUnityPose(Pose pose, float confidence)
        {
            Quaternion rotation = pose.rotation;
            if (rotation.x == 0f && rotation.y == 0f && rotation.z == 0f && rotation.w == 0f)
            {
                rotation = Quaternion.identity;
            }

            return new DevicePosePayload
            {
                confidence = confidence,
                position = new DeviceVector3
                {
                    x = pose.position.x,
                    y = pose.position.y,
                    z = pose.position.z
                },
                rotation = new DeviceQuaternion
                {
                    x = rotation.x,
                    y = rotation.y,
                    z = rotation.z,
                    w = rotation.w
                }
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

        private bool CanSubmitTrustedRokidHardwareObservation()
        {
            return string.IsNullOrEmpty(TrustedRokidHardwareObservationGateReason());
        }

        private string TrustedRokidHardwareObservationGateReason()
        {
            if (deviceSession == null || !deviceSession.ok || string.IsNullOrWhiteSpace(deviceSessionId))
            {
                return "device_session_missing";
            }
            if (!deviceSession.hardware_acceptance_eligible)
            {
                return "hardware_acceptance_not_eligible";
            }
            if (deviceSession.pairing == null || !deviceSession.pairing.paired)
            {
                return "operator_pairing_missing";
            }

            RokidSdkBindingReport report = CurrentSdkBindingReport();
            if (!report.InputBindingReady)
            {
                return "input_binding_not_ready";
            }
            if (!report.OverlayBindingReady)
            {
                return "overlay_binding_not_ready";
            }
            if (!report.LiveBindingReady)
            {
                return "live_binding_not_ready";
            }
            if (!ServerAckedLiveBindingReady())
            {
                return "server_live_binding_heartbeat_ack_missing";
            }

            return string.Empty;
        }

        private bool ServerAckedLiveBindingReady()
        {
            if (lastDeviceHeartbeat == null || !lastDeviceHeartbeat.ok || string.IsNullOrWhiteSpace(deviceSessionId))
            {
                return false;
            }
            if (!string.Equals(lastDeviceHeartbeat.session_id, deviceSessionId, StringComparison.Ordinal))
            {
                return false;
            }
            if (!lastDeviceHeartbeat.hardware_acceptance_eligible
                || lastDeviceHeartbeat.pairing == null
                || !lastDeviceHeartbeat.pairing.paired)
            {
                return false;
            }

            RokidSdkBindingStatusPayload sdk = lastDeviceHeartbeat.sdk_binding_status;
            return sdk != null
                && sdk.input_binding_ready
                && sdk.overlay_binding_ready
                && sdk.live_binding_ready;
        }

        private void QueuePendingTrustedTargetObservation(string anchorId, int imageIndex, Pose pose, Vector2 size, string eventType, string gateReason)
        {
            string cleanAnchorId = SafeLabel(anchorId, string.Empty);
            if (string.IsNullOrEmpty(cleanAnchorId))
            {
                return;
            }

            pendingTrustedTargetObservations[cleanAnchorId] = new PendingTrustedTargetObservation
            {
                anchorId = cleanAnchorId,
                imageIndex = imageIndex,
                pose = pose,
                size = size,
                eventType = SafeLabel(eventType, "event"),
                gateReason = SafeLabel(gateReason, "pending"),
                queuedAtSeconds = Time.realtimeSinceStartup
            };
            trustedHardwareMissionAssistLine = "trusted target queued | " + cleanAnchorId + " | waiting " + SafeLabel(gateReason, "pending");
        }

        private void TryFlushPendingTrustedTargetObservations(string source)
        {
            if (pendingTrustedTargetObservations.Count == 0 || wallCalibrationObservationInFlight)
            {
                return;
            }

            string trustedGateReason = TrustedRokidHardwareObservationGateReason();
            if (!string.IsNullOrEmpty(trustedGateReason))
            {
                trustedHardwareMissionAssistLine = "trusted target queue waiting | " + SafeLabel(trustedGateReason, "pending");
                return;
            }

            PendingTrustedTargetObservation pending = null;
            foreach (PendingTrustedTargetObservation item in pendingTrustedTargetObservations.Values)
            {
                if (pending == null || item.queuedAtSeconds < pending.queuedAtSeconds)
                {
                    pending = item;
                }
            }

            if (pending == null)
            {
                return;
            }

            pendingTrustedTargetObservations.Remove(pending.anchorId);
            trustedHardwareMissionAssistLine = "trusted target queue flush | " + pending.anchorId + " | " + SafeLabel(source, "heartbeat_ack");
            SelectAnchor(pending.anchorId);
            if (IsA1EntryAnchor(pending.anchorId))
            {
                PrimeA1SpatialEntryLock("rokid_tracked_image_queue");
            }
            StartCoroutine(SubmitRokidTrackedImageObservation(
                pending.anchorId,
                pending.imageIndex,
                pending.pose,
                pending.size,
                pending.eventType));
        }

        private bool IsTrustedAcceptedHardwareObservation(WallCalibrationObservation observation)
        {
            if (observation == null || observation.acceptance == null)
            {
                return false;
            }

            bool accepted = string.Equals(observation.status, "accepted", StringComparison.OrdinalIgnoreCase)
                || string.Equals(observation.status, "warning", StringComparison.OrdinalIgnoreCase);
            return accepted && observation.acceptance.hardware_observation_trusted;
        }

        private bool MissionHasStep(string stepId)
        {
            string cleanStepId = SafeLabel(stepId, string.Empty);
            if (string.IsNullOrEmpty(cleanStepId) || space == null || space.mission == null || space.mission.steps == null)
            {
                return false;
            }

            for (int index = 0; index < space.mission.steps.Length; index++)
            {
                MissionStepData step = space.mission.steps[index];
                if (step != null && string.Equals(step.step_id, cleanStepId, StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        private bool IsMissionStepComplete(string stepId)
        {
            return missionState != null && missionState.IsStepComplete(stepId);
        }

        private bool MissionStateIs(string state)
        {
            return missionState != null
                && string.Equals(missionState.mission_state, state, StringComparison.OrdinalIgnoreCase);
        }

        private bool ShouldPostTrustedHardwareObservation(string anchorId, string eventType)
        {
            string cleanAnchorId = SafeLabel(anchorId, string.Empty);
            if (string.IsNullOrEmpty(cleanAnchorId))
            {
                return false;
            }

            string key = cleanAnchorId + ":" + SafeLabel(eventType, "event");
            float now = Time.realtimeSinceStartup;
            float lastPostedAt;
            if (trustedHardwareObservationPostedAt.TryGetValue(key, out lastPostedAt)
                && now - lastPostedAt < TrustedHardwareObservationMinIntervalSeconds)
            {
                Debug.Log("IW_TARGET_THROTTLED anchor=" + cleanAnchorId
                    + " event=" + SafeLabel(eventType, "event")
                    + " min_interval_sec=" + TrustedHardwareObservationMinIntervalSeconds.ToString("0.0"));
                return false;
            }

            trustedHardwareObservationPostedAt[key] = now;
            return true;
        }

        private string AnchorIdForRokidTrackedImageIndex(int imageIndex)
        {
            if (imageIndex == 1) return "A1";
            if (imageIndex == 2) return "A2";
            if (imageIndex == 3) return "A3";
            return string.Empty;
        }

        private string TrustedTrackingModeForAnchor(string anchorId)
        {
            return IsA1EntryAnchor(anchorId) ? "qr" : "image_tracking";
        }

        private DeviceRegisterRequest BuildDeviceRegisterRequest()
        {
            return new DeviceRegisterRequest
            {
                profile = CurrentDeviceProfile(),
                device_id = CurrentDeviceId(),
                client_version = UnityClientVersion,
                pairing_code = CleanOperatorPairingCode(),
                capabilities = RequiredDeviceCapabilities(),
                network = BuildDeviceNetworkStatus(),
                sdk_binding_status = BuildSdkBindingStatusPayload("unity_register")
            };
        }

        private string CleanOperatorPairingCode()
        {
            if (string.IsNullOrWhiteSpace(operatorPairingCode)) return string.Empty;

            string raw = operatorPairingCode.Trim().ToUpperInvariant();
            string compact = string.Empty;
            for (int i = 0; i < raw.Length; i++)
            {
                char ch = raw[i];
                if ((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'))
                {
                    compact += ch;
                }
            }

            return compact.Length == 8 ? compact.Substring(0, 4) + "-" + compact.Substring(4, 4) : string.Empty;
        }

        private bool HasOperatorPairingCode()
        {
            return !string.IsNullOrEmpty(CleanOperatorPairingCode());
        }

        private string PairingHudBadge()
        {
            return string.IsNullOrWhiteSpace(devicePairingLine) ? "pairing required-for-hardware" : devicePairingLine;
        }

        private string BuildDevicePairingLine(string responseJson)
        {
            if (string.IsNullOrWhiteSpace(responseJson))
            {
                return HasOperatorPairingCode() ? "pairing submitted" : "pairing required-for-hardware";
            }

            if (responseJson.IndexOf("operator_paired", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return responseJson.IndexOf("\"hardware_acceptance_eligible\":true", StringComparison.OrdinalIgnoreCase) >= 0
                    ? "pairing operator_paired | hardware eligible"
                    : "pairing operator_paired";
            }

            if (responseJson.IndexOf("expired", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "pairing expired";
            }

            if (responseJson.IndexOf("unpaired", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return HasOperatorPairingCode() ? "pairing submitted: unpaired" : "pairing required-for-hardware";
            }

            return HasOperatorPairingCode() ? "pairing submitted" : "pairing required-for-hardware";
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
                input_frame = BuildDeviceInputFramePayload(),
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

        private DeviceInputFramePayload BuildDeviceInputFramePayload()
        {
            RokidPose fallbackPose = CurrentRokidPose();
            RokidInputFrame frame;
            if (rokidInputSource == null || !rokidInputSource.TryReadFrame(out frame))
            {
                frame = new RokidInputFrame(
                    0,
                    Time.time,
                    Mathf.Max(0f, Time.deltaTime),
                    fallbackPose,
                    RokidGazeState.FromPose(fallbackPose, false),
                    RokidInputButtons.None,
                    RokidInputButtons.None,
                    RokidInputCommand.None,
                    RokidVoiceText.Empty,
                    RokidAnchorTarget.None,
                    RokidConnectionInfo.Disconnected(apiClient != null ? apiClient.BaseUrl : baseUrl));
            }

            RokidGazeState gaze = frame.Gaze;
            Ray ray = gaze.Ray;
            string focusedAnchorId = gaze.HasAnchorHit
                ? gaze.AnchorId
                : !string.IsNullOrWhiteSpace(currentGazeAnchorId)
                    ? currentGazeAnchorId
                    : frame.AnchorTarget.AnchorId;
            string focusedAnchorLabel = gaze.HasAnchorHit
                ? gaze.AnchorLabel
                : !string.IsNullOrWhiteSpace(currentGazeAnchorLabel)
                    ? currentGazeAnchorLabel
                    : frame.AnchorTarget.Label;
            bool anchorHit = gaze.HasAnchorHit || !string.IsNullOrWhiteSpace(focusedAnchorId);
            Vector3 hitPoint = gaze.HasAnchorHit
                ? gaze.HitPoint
                : frame.AnchorTarget.HasWorldPosition
                    ? frame.AnchorTarget.WorldPosition
                    : Vector3.zero;

            return new DeviceInputFramePayload
            {
                schema = "innerworld-rokid-input-frame/v1",
                source = rokidInputSource != null ? rokidInputSource.SourceName : "unity-no-input-source",
                sequence = frame.Sequence,
                timestamp_seconds = frame.TimestampSeconds,
                delta_time_seconds = frame.DeltaTimeSeconds,
                command = InputCommandLabel(frame.Command),
                gaze_select_down = IsButtonDown(frame, RokidInputButtons.GazeSelect),
                gaze_select_held = IsButtonHeld(frame, RokidInputButtons.GazeSelect),
                confirm_down = IsButtonDown(frame, RokidInputButtons.Confirm),
                confirm_held = IsButtonHeld(frame, RokidInputButtons.Confirm),
                back_down = IsButtonDown(frame, RokidInputButtons.Back),
                back_held = IsButtonHeld(frame, RokidInputButtons.Back),
                anchor_hit = anchorHit,
                focused_anchor_id = SafeLabel(focusedAnchorId, string.Empty),
                focused_anchor_label = SafeLabel(focusedAnchorLabel, string.Empty),
                hit_distance_meters = gaze.HasAnchorHit ? gaze.HitDistanceMeters : 0f,
                hit_point = VectorPayload(hitPoint),
                ray_origin = VectorPayload(ray.origin),
                ray_direction = VectorPayload(ray.direction),
                pointable_ui_focus = anchorHit,
                voice_text_present = frame.HasVoiceText
            };
        }

        private static bool IsButtonDown(RokidInputFrame frame, RokidInputButtons button)
        {
            return (frame.ButtonsDown & button) == button;
        }

        private static bool IsButtonHeld(RokidInputFrame frame, RokidInputButtons button)
        {
            return (frame.ButtonsHeld & button) == button;
        }

        private static string InputCommandLabel(RokidInputCommand command)
        {
            if (command == RokidInputCommand.Confirm) return "confirm";
            if (command == RokidInputCommand.Back) return "back";
            return "none";
        }

        private static DeviceVector3 VectorPayload(Vector3 value)
        {
            return new DeviceVector3
            {
                x = value.x,
                y = value.y,
                z = value.z
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
            RokidSdkBindingReport report = BuildCurrentSdkBindingReport();
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
                adapter_checklist = BuildAdapterChecklistReportPayload(report),
                candidate_assemblies = report.CandidateAssemblies,
                candidate_types = report.CandidateTypes,
                message = BuildFieldAcceptanceHeartbeatMessage(report.Message)
            };
        }

        private RokidLiveAdapterChecklistReport BuildAdapterChecklistReportPayload(RokidSdkBindingReport report)
        {
            RokidSdkBindingReport binding = report ?? RokidSdkBindingProbe.Detect();
            bool compiledAndPackaged = binding.BoundaryCompiled && binding.PackageDetected;
            bool liveBinding = compiledAndPackaged && binding.LiveBindingReady;
            bool uxrInputReady = IsRokidUxrInputBindingReady();
            bool uxrOverlayReady = IsRokidUxrOverlayBindingReady();
            bool pointableUiReady = compiledAndPackaged && HasPackageResource("Prefabs/UI/PointableUI/PointableUI");
            bool pointableUiCurveReady = compiledAndPackaged && HasPackageResource("Prefabs/UI/PointableUI/PointableUI_Curve");
            bool imageTrackingReady = compiledAndPackaged && HasRuntimeType("Rokid.UXR.Module.ARTrackedImageManager");

            return new RokidLiveAdapterChecklistReport
            {
                boundary_compiled = binding.BoundaryCompiled,
                package_detected = binding.PackageDetected,
                rk_camera_rig_ready = liveBinding && Camera.main != null,
                camera_rig_ready = liveBinding && Camera.main != null,
                rk_input_3dof_ray_ready = uxrInputReady,
                input_ray_ready = uxrInputReady,
                pointable_ui_ready = pointableUiReady,
                pointable_ui_curve_ready = pointableUiCurveReady,
                a1_entry_lock_ready = IsA1EntryLockReady(),
                entry_lock_ready = IsA1EntryLockReady(),
                qr_entry_lock_ready = imageTrackingReady,
                image_tracking_ready = imageTrackingReady,
                image_target_library_ready = imageTrackingReady,
                a2_a3_image_tracking_ready = imageTrackingReady,
                slam_head_tracking_ready = liveBinding && binding.InputBindingReady,
                slam_status_ready = liveBinding && binding.InputBindingReady,
                head_tracking_heartbeat_ready = liveBinding && binding.InputBindingReady,
                uxr_overlay_renderer_ready = uxrOverlayReady,
                overlay_binding_ready = binding.OverlayBindingReady,
                trusted_hardware_proof_ready = false,
                hardware_proof_ready = false,
                performance_gate_ready = false,
                fps_target_ready = false,
                spatial_panels_readable = a1SpatialEntryConfirmed
            };
        }

        private RokidSdkBindingReport BuildCurrentSdkBindingReport()
        {
            RokidSdkBindingReport report = rokidAdapterStatus.SdkBinding ?? RokidSdkBindingProbe.Detect();
            bool inputReady = IsRokidUxrInputBindingReady();
            bool overlayReady = IsRokidUxrOverlayBindingReady();

            if (report.BoundaryCompiled && report.PackageDetected && (inputReady || overlayReady))
            {
                return report.WithLiveBinding(
                    inputReady,
                    overlayReady,
                    "ROKID_UXR live adapter instantiated; RKCameraRig/Camera pose, RKInput 3DoF controls, and worldspace overlay are bound. Field acceptance still requires operator pairing and trusted A1/A2/A3 observations.");
            }

            return report;
        }

        private bool IsRokidUxrInputBindingReady()
        {
#if ROKID_UXR
            RokidUxrInputSource input = rokidInputSource as RokidUxrInputSource;
            return input != null && input.IsSdkBindingReady;
#else
            return false;
#endif
        }

        private bool IsRokidUxrOverlayBindingReady()
        {
#if ROKID_UXR
            RokidUxrOverlayRenderer renderer = rokidOverlayRenderer as RokidUxrOverlayRenderer;
            return renderer != null && renderer.IsSdkBindingReady;
#else
            return false;
#endif
        }

        private bool HasPackageResource(string resourcePath)
        {
            if (string.IsNullOrWhiteSpace(resourcePath))
            {
                return false;
            }

            return Resources.Load<GameObject>(resourcePath.Trim()) != null;
        }

        private bool HasRuntimeType(string typeName)
        {
            if (string.IsNullOrWhiteSpace(typeName))
            {
                return false;
            }

            Type type = Type.GetType(typeName.Trim());
            if (type != null)
            {
                return true;
            }

            System.Reflection.Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (int index = 0; index < assemblies.Length; index++)
            {
                try
                {
                    type = assemblies[index].GetType(typeName.Trim(), false);
                    if (type != null)
                    {
                        return true;
                    }
                }
                catch
                {
                }
            }

            return false;
        }

        private string BuildWallCalibrationHeartbeatMessage(string sdkMessage)
        {
            string calibration = BuildWallCalibrationHeartbeatLine();
            if (string.IsNullOrWhiteSpace(sdkMessage)) return calibration;
            return calibration + " | " + sdkMessage.Trim();
        }

        private string BuildFieldAcceptanceHeartbeatMessage(string sdkMessage)
        {
            return BuildWallCalibrationHeartbeatMessage(sdkMessage)
                + " | " + BuildA1SpatialEntryHeartbeatLine()
                + " | " + BuildAdapterReadinessHeartbeatLine()
                + " | " + BuildFieldAcceptanceHeartbeatLine()
                + " | " + BuildFieldAcceptanceBlockingLine();
        }

        private string BuildAdapterReadinessHeartbeatLine()
        {
            return "adapter readiness: " + BuildAdapterReadinessCompactLine()
                + ", checklist " + AdapterChecklistSummaryLabel()
                + ", live_binding_ready " + BoolLabel(CurrentSdkBindingReport().LiveBindingReady);
        }

        private string BuildAdapterReadinessStatusLine()
        {
            if (deviceManifest == null)
            {
                return string.IsNullOrWhiteSpace(deviceManifestLine) ? "device manifest pending" : deviceManifestLine;
            }

            return "device manifest adapters " + AdapterSlotCount()
                + " | " + BuildAdapterReadinessCompactLine()
                + " | " + AdapterChecklistSummaryLabel();
        }

        private string BuildAdapterReadinessCompactLine()
        {
            DeviceAdapterReadiness readiness = deviceManifest != null ? deviceManifest.adapter_readiness : null;
            string status = readiness != null ? SafeLabel(readiness.status, "manifest checklist pending") : "manifest checklist pending";
            return status
                + " | RKCameraRig " + AdapterChecklistItemStatus("rk_camera_rig", "rokid_pose_provider")
                + " | RKInput 3DoF ray " + AdapterChecklistItemStatus("rk_input_3dof_ray", "rokid_arstudio_input")
                + " | PointableUI " + AdapterChecklistItemStatus("pointable_ui", "unity_overlay_renderer")
                + " | A1 entry lock " + A1EntryAdapterStatus()
                + " | A2/A3 ImageTracking " + AdapterChecklistItemStatus("a2_a3_image_tracking", "image_tracking")
                + " | SLAM heartbeat " + AdapterChecklistItemStatus("slam_heartbeat", "rokid_pose_provider");
        }

        private string AdapterChecklistSummaryLabel()
        {
            int total = 6;
            int ready = 0;
            if (IsAdapterChecklistItemReady("rk_camera_rig", "rokid_pose_provider")) ready++;
            if (IsAdapterChecklistItemReady("rk_input_3dof_ray", "rokid_arstudio_input")) ready++;
            if (IsAdapterChecklistItemReady("pointable_ui", "unity_overlay_renderer")) ready++;
            if (IsA1EntryLockReady()) ready++;
            if (IsAdapterChecklistItemReady("a2_a3_image_tracking", "image_tracking")) ready++;
            if (IsAdapterChecklistItemReady("slam_heartbeat", "rokid_pose_provider")) ready++;

            return ready + "/" + total + " ready signals; hardware acceptance remains gated";
        }

        private string AdapterChecklistItemStatus(string checklistId, string fallbackSlotId)
        {
            DeviceAdapterChecklistItem item = FindAdapterChecklistItem(checklistId);
            if (item != null)
            {
                return SafeLabel(item.status, "pending");
            }

            if (HasAdapterSlot(fallbackSlotId))
            {
                return CurrentSdkBindingReport().LiveBindingReady ? "reported" : "contracted";
            }

            return "pending";
        }

        private bool IsAdapterChecklistItemReady(string checklistId, string fallbackSlotId)
        {
            DeviceAdapterChecklistItem item = FindAdapterChecklistItem(checklistId);
            if (item != null)
            {
                string status = SafeLabel(item.status, "pending").ToLowerInvariant();
                return status == "pass" || status == "ready" || status == "verified" || status == "reported";
            }

            return HasAdapterSlot(fallbackSlotId) && CurrentSdkBindingReport().LiveBindingReady;
        }

        private bool IsA1EntryLockReady()
        {
            return a1SpatialEntryConfirmed
                && string.Equals(a1EntryLockState, RokidA1SpatialEntryStates.DeliberateConfirmed, StringComparison.OrdinalIgnoreCase);
        }

        private string A1EntryAdapterStatus()
        {
            if (IsA1EntryLockReady()) return "rehearsal_confirmed";
            if (a1SpatialEntryLocked) return "candidate_0.45m";
            return "pending_0.4m_0.5m";
        }

        private bool IsA1EntryAnchor(string anchorId)
        {
            return string.Equals(anchorId, A1EntryAnchorId, StringComparison.OrdinalIgnoreCase);
        }

        private DeviceAdapterChecklistItem FindAdapterChecklistItem(string checklistId)
        {
            if (deviceManifest == null || deviceManifest.adapter_readiness == null || deviceManifest.adapter_readiness.checklist == null || string.IsNullOrWhiteSpace(checklistId))
            {
                return null;
            }

            string cleanId = checklistId.Trim();
            foreach (DeviceAdapterChecklistItem item in deviceManifest.adapter_readiness.checklist)
            {
                if (item != null && string.Equals(item.id, cleanId, StringComparison.OrdinalIgnoreCase))
                {
                    return item;
                }
            }

            return null;
        }

        private int AdapterSlotCount()
        {
            return deviceManifest != null && deviceManifest.adapter_slots != null ? deviceManifest.adapter_slots.Length : 0;
        }

        private bool HasAdapterSlot(string slotId)
        {
            if (deviceManifest == null || deviceManifest.adapter_slots == null || string.IsNullOrWhiteSpace(slotId))
            {
                return false;
            }

            string cleanSlotId = slotId.Trim();
            foreach (DeviceAdapterSlot slot in deviceManifest.adapter_slots)
            {
                if (slot != null && string.Equals(slot.slot_id, cleanSlotId, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private RokidSdkBindingReport CurrentSdkBindingReport()
        {
            return BuildCurrentSdkBindingReport();
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
                + ", markers " + FieldMarkerIdsLabel()
                + ", image target assets " + FieldMarkerImageTargetAssetsLabel();
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
                + " | image target assets " + FieldMarkerImageTargetAssetsLabel()
                + " | active " + BuildFieldMarkerActiveLine();
        }

        private string BuildFieldMarkerReadinessLine()
        {
            return (FieldMarkerPrintReadyFlag() ? "print kit ready" : "print kit pending")
                + " | " + FieldMarkerSimulatorRehearsalLabel()
                + " | " + FieldMarkerHardwareReadinessLabel()
                + " | " + FieldMarkerImageTargetAssetReadinessLabel();
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
                + " | expected " + PosePositionLabel(marker.expected_pose)
                + " | " + BuildFieldMarkerImageTargetAssetLine(marker);
        }

        private string BuildFieldMarkerImageTargetAssetLine(FieldMarkerAnchor marker)
        {
            if (marker == null || !IsImageTargetMarker(marker))
            {
                return "image target asset not required";
            }

            FieldMarkerImageTargetAsset asset = marker.image_target_asset;
            if (asset == null)
            {
                return "image target asset missing";
            }

            return "image target asset " + SafeLabel(asset.asset_id, "asset unknown")
                + " | unity " + SafeLabel(asset.unity_target_library_status, "target library pending")
                + " | rokid " + SafeLabel(asset.rokid_import_status, "import pending")
                + " | " + ImageTargetPhysicalSizeLabel(asset)
                + " | dpi " + (asset.dpi > 0 ? asset.dpi.ToString() : "unknown")
                + " | print " + SafeLabel(asset.print_version, "unknown")
                + " | sha " + ShortSha(asset.sha256)
                + " | path " + SafeLabel(asset.asset_path, "path pending");
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

        private string FieldMarkerImageTargetAssetReadinessLabel()
        {
            int required = CountImageTargetMarkers();
            if (required == 0) return "image target assets not required";
            int ready = CountReadyImageTargetAssets();
            return ready == required ? "image target assets ready " + ready + "/" + required : "image target assets pending " + ready + "/" + required;
        }

        private string FieldMarkerImageTargetAssetsLabel()
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null)
            {
                return "pending";
            }

            List<string> assets = new List<string>();
            foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
            {
                if (marker == null || !IsImageTargetMarker(marker)) continue;
                FieldMarkerImageTargetAsset asset = marker.image_target_asset;
                string anchorId = SafeLabel(marker.anchor_id, "unknown");
                if (asset == null)
                {
                    assets.Add(anchorId + ":missing");
                }
                else
                {
                    assets.Add(anchorId
                        + ":" + SafeLabel(asset.unity_target_library_status, "unity pending")
                        + "/" + SafeLabel(asset.rokid_import_status, "rokid pending")
                        + "@" + SafeLabel(asset.print_version, "print unknown"));
                }
            }

            return assets.Count == 0 ? "none" : string.Join(",", assets.ToArray());
        }

        private int CountImageTargetMarkers()
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null) return 0;

            int count = 0;
            foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
            {
                if (marker != null && IsImageTargetMarker(marker)) count++;
            }

            return count;
        }

        private int CountReadyImageTargetAssets()
        {
            if (fieldMarkerManifest == null || fieldMarkerManifest.markers == null) return 0;

            int count = 0;
            foreach (FieldMarkerAnchor marker in fieldMarkerManifest.markers)
            {
                if (marker != null && IsImageTargetMarker(marker) && IsImageTargetAssetReady(marker.image_target_asset)) count++;
            }

            return count;
        }

        private bool IsImageTargetMarker(FieldMarkerAnchor marker)
        {
            return marker != null
                && marker.marker != null
                && string.Equals(marker.marker.marker_type, "image_target", StringComparison.OrdinalIgnoreCase);
        }

        private bool IsImageTargetAssetReady(FieldMarkerImageTargetAsset asset)
        {
            return asset != null
                && !string.IsNullOrWhiteSpace(asset.asset_id)
                && !string.IsNullOrWhiteSpace(asset.asset_path)
                && !string.IsNullOrWhiteSpace(asset.sha256)
                && asset.physical_width_mm > 0f
                && asset.physical_height_mm > 0f
                && asset.dpi > 0
                && !string.IsNullOrWhiteSpace(asset.print_version)
                && !string.IsNullOrWhiteSpace(asset.unity_target_library_status)
                && !string.IsNullOrWhiteSpace(asset.rokid_import_status);
        }

        private string ImageTargetPhysicalSizeLabel(FieldMarkerImageTargetAsset asset)
        {
            if (asset == null || asset.physical_width_mm <= 0f || asset.physical_height_mm <= 0f)
            {
                return "size unknown";
            }

            return asset.physical_width_mm.ToString("0.#") + "x" + asset.physical_height_mm.ToString("0.#") + "mm";
        }

        private string ShortSha(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "sha pending";
            string clean = value.Trim();
            return clean.Length <= 12 ? clean : clean.Substring(0, 12);
        }

        private string BuildFieldOperatorPlanHudLine()
        {
            return FieldOperatorPlanHudBadge()
                + " | hw-claim " + BoolLabel(FieldOperatorPlanHardwareReadyClaimAllowed())
                + " | " + BuildFieldOperatorPlanNextActionLine();
        }

        private string BuildFieldOperatorPlanTargetLine()
        {
            return "Operator " + BuildFieldOperatorPlanHudLine()
                + " | block " + ShortHudText(FieldOperatorPlanFirstBlocker(), 44);
        }

        private string BuildFieldOperatorPlanDebugLine()
        {
            return "Operator: " + FieldOperatorPlanPhaseProgress()
                + " " + FieldOperatorPlanPhaseLabel()
                + " | hw-claim " + BoolLabel(FieldOperatorPlanHardwareReadyClaimAllowed())
                + " | next_actions " + FieldOperatorPlanNextActionCount()
                + " | blockers " + FieldOperatorPlanBlockerCount()
                + " | scope " + FieldOperatorPlanScopeGuardLabel();
        }

        private string BuildFieldOperatorPlanStatusLine()
        {
            if (fieldOperatorPlan == null)
            {
                string state = string.IsNullOrWhiteSpace(fieldOperatorPlanLine) ? "operator plan pending" : fieldOperatorPlanLine.Trim();
                return "field operator plan " + state
                    + " | " + FieldOperatorPlanPhaseProgress()
                    + " " + FieldOperatorPlanPhaseLabel()
                    + " | hw_claim " + BoolLabel(FieldOperatorPlanHardwareReadyClaimAllowed());
            }

            return "field operator plan schema " + FieldOperatorPlanSchemaLabel()
                + " | " + FieldOperatorPlanPhaseProgress()
                + " " + FieldOperatorPlanPhaseLabel()
                + " | hw_claim " + BoolLabel(FieldOperatorPlanHardwareReadyClaimAllowed())
                + " | next " + ShortHudText(FieldOperatorPlanFirstNextAction(), 64)
                + " | block " + ShortHudText(FieldOperatorPlanFirstBlocker(), 64)
                + " | " + FieldOperatorPlanScopeGuardLabel();
        }

        private string BuildFieldOperatorPlanNextActionLine()
        {
            return "next " + ShortHudText(FieldOperatorPlanFirstNextAction(), 54);
        }

        private string FieldOperatorPlanHudBadge()
        {
            return FieldOperatorPlanPhaseProgress() + " " + FieldOperatorPlanPhaseLabel();
        }

        private string FieldOperatorPlanSchemaLabel()
        {
            return fieldOperatorPlan != null && !string.IsNullOrWhiteSpace(fieldOperatorPlan.schema)
                ? fieldOperatorPlan.schema.Trim()
                : "schema unknown";
        }

        private string FieldOperatorPlanPhaseProgress()
        {
            if (fieldOperatorPlan == null)
            {
                return "phase ?/?";
            }

            int total = fieldOperatorPlan.total_phases > 0
                ? fieldOperatorPlan.total_phases
                : Mathf.Max(fieldOperatorPlan.phases != null ? fieldOperatorPlan.phases.Length : 0, fieldOperatorPlan.phase_table != null ? fieldOperatorPlan.phase_table.Length : 0);
            int index = fieldOperatorPlan.phase_index > 0 ? fieldOperatorPlan.phase_index : 0;
            return "phase " + (index > 0 ? index.ToString() : "?") + "/" + (total > 0 ? total.ToString() : "?");
        }

        private string FieldOperatorPlanPhaseLabel()
        {
            if (fieldOperatorPlan == null)
            {
                return "unknown";
            }

            FieldOperatorPlanPhase phase = CurrentFieldOperatorPlanPhase();
            if (phase != null)
            {
                if (!string.IsNullOrWhiteSpace(phase.id)) return phase.id.Trim();
                if (!string.IsNullOrWhiteSpace(phase.label)) return phase.label.Trim();
            }

            if (!string.IsNullOrWhiteSpace(fieldOperatorPlan.current_phase)) return fieldOperatorPlan.current_phase.Trim();
            return "unknown";
        }

        private bool FieldOperatorPlanHardwareReadyClaimAllowed()
        {
            return fieldOperatorPlan != null
                && ((fieldOperatorPlan.readiness != null && fieldOperatorPlan.readiness.hardware_ready_claim_allowed)
                    || fieldOperatorPlan.hardware_ready_claim_allowed);
        }

        private int FieldOperatorPlanNextActionCount()
        {
            return fieldOperatorPlan != null && fieldOperatorPlan.next_actions != null
                ? fieldOperatorPlan.next_actions.Length
                : 0;
        }

        private int FieldOperatorPlanBlockerCount()
        {
            if (fieldOperatorPlan == null) return 0;
            int count = fieldOperatorPlan.blockers != null ? fieldOperatorPlan.blockers.Length : 0;
            FieldOperatorPlanPhase phase = CurrentFieldOperatorPlanPhase();
            if (phase != null && phase.blockers != null) count += phase.blockers.Length;
            return count;
        }

        private string FieldOperatorPlanFirstNextAction()
        {
            string action = FirstNonEmpty(fieldOperatorPlan != null ? fieldOperatorPlan.next_actions : null);
            if (!string.IsNullOrWhiteSpace(action)) return action;

            FieldOperatorPlanPhase phase = CurrentFieldOperatorPlanPhase();
            action = FirstNonEmpty(phase != null ? phase.operator_actions : null);
            return string.IsNullOrWhiteSpace(action) ? "pending" : action;
        }

        private string FieldOperatorPlanFirstBlocker()
        {
            string blocker = FirstNonEmpty(fieldOperatorPlan != null ? fieldOperatorPlan.blockers : null);
            if (!string.IsNullOrWhiteSpace(blocker)) return blocker;

            FieldOperatorPlanPhase phase = CurrentFieldOperatorPlanPhase();
            blocker = FirstNonEmpty(phase != null ? phase.blockers : null);
            if (!string.IsNullOrWhiteSpace(blocker)) return blocker;

            FieldOperatorPlanPhaseRow row = CurrentFieldOperatorPlanPhaseRow();
            blocker = FirstNonEmpty(row != null ? row.blockers : null);
            return string.IsNullOrWhiteSpace(blocker) ? "none" : blocker;
        }

        private FieldOperatorPlanPhase CurrentFieldOperatorPlanPhase()
        {
            if (fieldOperatorPlan == null || fieldOperatorPlan.phases == null || fieldOperatorPlan.phases.Length == 0)
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(fieldOperatorPlan.current_phase))
            {
                string current = fieldOperatorPlan.current_phase.Trim();
                foreach (FieldOperatorPlanPhase phase in fieldOperatorPlan.phases)
                {
                    if (phase != null && !string.IsNullOrWhiteSpace(phase.id) && string.Equals(phase.id.Trim(), current, StringComparison.Ordinal))
                    {
                        return phase;
                    }
                }
            }

            int index = fieldOperatorPlan.phase_index - 1;
            if (index >= 0 && index < fieldOperatorPlan.phases.Length)
            {
                return fieldOperatorPlan.phases[index];
            }

            return null;
        }

        private FieldOperatorPlanPhaseRow CurrentFieldOperatorPlanPhaseRow()
        {
            if (fieldOperatorPlan == null || fieldOperatorPlan.phase_table == null || fieldOperatorPlan.phase_table.Length == 0)
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(fieldOperatorPlan.current_phase))
            {
                string current = fieldOperatorPlan.current_phase.Trim();
                foreach (FieldOperatorPlanPhaseRow row in fieldOperatorPlan.phase_table)
                {
                    if (row != null && !string.IsNullOrWhiteSpace(row.id) && string.Equals(row.id.Trim(), current, StringComparison.Ordinal))
                    {
                        return row;
                    }
                }
            }

            int index = fieldOperatorPlan.phase_index - 1;
            if (index >= 0 && index < fieldOperatorPlan.phase_table.Length)
            {
                return fieldOperatorPlan.phase_table[index];
            }

            return null;
        }

        private string FieldOperatorPlanScopeGuardLabel()
        {
            FieldOperatorPlanScopeGuard guard = fieldOperatorPlan != null ? fieldOperatorPlan.scope_guard : null;
            if (guard == null)
            {
                return "P0 A1/A2/A3/User B";
            }

            bool p0Only = (guard.p0_only || guard.campus_wall_only) && guard.a1_a2_a3_user_b_only;
            bool noExpansion = !guard.guide_app_or_ppt && !guard.phone_page && !guard.open_ugc && !guard.backend_expansion && !guard.broad_route;
            return p0Only && noExpansion ? "P0 A1/A2/A3/User B" : "scope guard warn";
        }

        private string FirstNonEmpty(string[] values)
        {
            if (values == null || values.Length == 0) return string.Empty;
            foreach (string value in values)
            {
                if (!string.IsNullOrWhiteSpace(value)) return value.Trim();
            }

            return string.Empty;
        }

        private string ShortHudText(string value, int maxChars)
        {
            if (string.IsNullOrWhiteSpace(value)) return "pending";
            int limit = Mathf.Max(8, maxChars);
            StringBuilder builder = new StringBuilder();
            bool lastWasSpace = false;
            string clean = value.Trim();
            for (int index = 0; index < clean.Length; index++)
            {
                char ch = clean[index];
                if (char.IsWhiteSpace(ch))
                {
                    if (!lastWasSpace && builder.Length > 0)
                    {
                        builder.Append(' ');
                        lastWasSpace = true;
                    }
                }
                else
                {
                    builder.Append(ch);
                    lastWasSpace = false;
                }

                if (builder.Length >= limit) break;
            }

            string result = builder.ToString().Trim();
            return clean.Length > result.Length ? result.TrimEnd('.') + "..." : result;
        }

        private string BuildFieldAcceptanceHeartbeatLine()
        {
            if (fieldAcceptanceManifest == null)
            {
                return "field acceptance: " + (string.IsNullOrWhiteSpace(fieldAcceptanceLine) ? "pending" : fieldAcceptanceLine) + ", guard simulator/manual not hardware";
            }

            return "field acceptance: " + FieldAcceptanceSchemaLabel()
                + ", status " + FieldAcceptanceStatusLabel()
                + ", ready " + BoolLabel(fieldAcceptanceManifest.ready)
                + ", gates " + FieldAcceptanceReadyGateCount() + "/" + FieldAcceptanceTotalGateCount() + " ready pending " + FieldAcceptancePendingGateCount()
                + ", ready_for_hardware " + BoolLabel(FieldAcceptanceReadyForHardwareFlag())
                + ", hardware evidence " + FieldAcceptanceHardwareEvidenceCount()
                + ", blockers " + FieldAcceptanceBlockingCount()
                + ", guard " + FieldAcceptanceTrackingGuardLabel();
        }

        private string BuildFieldAcceptanceStatusLine()
        {
            if (fieldAcceptanceManifest == null)
            {
                return string.IsNullOrWhiteSpace(fieldAcceptanceLine) ? "field acceptance pending" : fieldAcceptanceLine;
            }

            return "field acceptance schema " + FieldAcceptanceSchemaLabel()
                + " | status " + FieldAcceptanceStatusLabel()
                + " | ready " + BoolLabel(fieldAcceptanceManifest.ready)
                + " | gates ready " + FieldAcceptanceReadyGateCount() + "/" + FieldAcceptanceTotalGateCount()
                + " pending " + FieldAcceptancePendingGateCount()
                + " blocked " + FieldAcceptanceBlockedGateCount()
                + " | ready_for_hardware " + BoolLabel(FieldAcceptanceReadyForHardwareFlag())
                + " | hardware evidence " + FieldAcceptanceHardwareEvidenceCount()
                + " | blockers " + FieldAcceptanceBlockingCount()
                + " | guard " + FieldAcceptanceTrackingGuardLabel()
                + " | " + BuildFieldAcceptanceBlockingLine();
        }

        private string BuildFieldAcceptanceDebugLine()
        {
            return "Acceptance: " + FieldAcceptanceStatusLabel()
                + " ready " + BoolLabel(fieldAcceptanceManifest != null && fieldAcceptanceManifest.ready)
                + " | gates " + FieldAcceptanceReadyGateCount() + "/" + FieldAcceptanceTotalGateCount()
                + " pending " + FieldAcceptancePendingGateCount()
                + " | hw " + BoolLabel(FieldAcceptanceReadyForHardwareFlag())
                + " evidence " + FieldAcceptanceHardwareEvidenceCount()
                + " | blockers " + FieldAcceptanceBlockingCount()
                + " | " + FieldAcceptanceTrackingGuardLabel()
                + " | " + BuildFieldAcceptanceBlockingLine();
        }

        private string BuildFieldAcceptanceBlockingLine()
        {
            return "blocking_items " + FieldAcceptanceBlockingCount()
                + " | next_actions " + FieldAcceptanceNextActionCount()
                + " | first_blocker " + FieldAcceptanceFirstBlockingTitle()
                + " | first_action " + FieldAcceptanceFirstNextAction();
        }

        private string FieldAcceptanceHudBadge()
        {
            if (fieldAcceptanceManifest == null) return "acceptance pending";
            if (string.Equals(FieldAcceptanceStatusLabel(), "hardware_acceptance_ready", StringComparison.OrdinalIgnoreCase))
            {
                return "acceptance hardware_acceptance_ready";
            }
            if (fieldAcceptanceManifest.ready) return "acceptance ready";
            return "acceptance " + FieldAcceptanceStatusLabel();
        }

        private string FieldAcceptanceSchemaLabel()
        {
            return fieldAcceptanceManifest != null && !string.IsNullOrWhiteSpace(fieldAcceptanceManifest.schema)
                ? fieldAcceptanceManifest.schema.Trim()
                : "schema unknown";
        }

        private string FieldAcceptanceStatusLabel()
        {
            return fieldAcceptanceManifest != null && !string.IsNullOrWhiteSpace(fieldAcceptanceManifest.status)
                ? fieldAcceptanceManifest.status.Trim()
                : (string.IsNullOrWhiteSpace(fieldAcceptanceLine) ? "pending" : fieldAcceptanceLine);
        }

        private bool FieldAcceptanceReadyForHardwareFlag()
        {
            return fieldAcceptanceManifest != null
                && fieldAcceptanceManifest.summary != null
                && fieldAcceptanceManifest.summary.ready_for_hardware;
        }

        private int FieldAcceptanceReadyGateCount()
        {
            FieldAcceptanceSummary summary = fieldAcceptanceManifest != null ? fieldAcceptanceManifest.summary : null;
            return summary != null ? summary.ready_gates : CountFieldAcceptanceGates("ready");
        }

        private int FieldAcceptancePendingGateCount()
        {
            FieldAcceptanceSummary summary = fieldAcceptanceManifest != null ? fieldAcceptanceManifest.summary : null;
            return summary != null ? summary.pending_gates : CountFieldAcceptanceGates("pending");
        }

        private int FieldAcceptanceBlockedGateCount()
        {
            FieldAcceptanceSummary summary = fieldAcceptanceManifest != null ? fieldAcceptanceManifest.summary : null;
            return summary != null ? summary.blocked_gates : CountFieldAcceptanceGates("blocked");
        }

        private int FieldAcceptanceTotalGateCount()
        {
            if (fieldAcceptanceManifest != null && fieldAcceptanceManifest.gates != null)
            {
                return fieldAcceptanceManifest.gates.Length;
            }

            FieldAcceptanceSummary summary = fieldAcceptanceManifest != null ? fieldAcceptanceManifest.summary : null;
            return summary != null
                ? summary.ready_gates + summary.warn_gates + summary.pending_gates + summary.blocked_gates
                : 0;
        }

        private int FieldAcceptanceHardwareEvidenceCount()
        {
            FieldAcceptanceSummary summary = fieldAcceptanceManifest != null ? fieldAcceptanceManifest.summary : null;
            return summary != null ? summary.hardware_evidence_count : 0;
        }

        private int FieldAcceptanceBlockingCount()
        {
            return fieldAcceptanceManifest != null && fieldAcceptanceManifest.blocking_items != null
                ? fieldAcceptanceManifest.blocking_items.Length
                : 0;
        }

        private int FieldAcceptanceNextActionCount()
        {
            return fieldAcceptanceManifest != null && fieldAcceptanceManifest.next_actions != null
                ? fieldAcceptanceManifest.next_actions.Length
                : 0;
        }

        private string FieldAcceptanceFirstBlockingTitle()
        {
            if (fieldAcceptanceManifest == null || fieldAcceptanceManifest.blocking_items == null || fieldAcceptanceManifest.blocking_items.Length == 0)
            {
                return "none";
            }

            FieldAcceptanceBlockingItem item = fieldAcceptanceManifest.blocking_items[0];
            if (item == null) return "none";
            if (!string.IsNullOrWhiteSpace(item.title)) return item.title.Trim();
            if (!string.IsNullOrWhiteSpace(item.gate_id)) return item.gate_id.Trim();
            return "unknown";
        }

        private string FieldAcceptanceFirstNextAction()
        {
            if (fieldAcceptanceManifest == null || fieldAcceptanceManifest.next_actions == null || fieldAcceptanceManifest.next_actions.Length == 0)
            {
                return "none";
            }

            foreach (string action in fieldAcceptanceManifest.next_actions)
            {
                if (!string.IsNullOrWhiteSpace(action)) return action.Trim();
            }

            return "none";
        }

        private string FieldAcceptanceTrackingGuardLabel()
        {
            FieldAcceptanceSummary summary = fieldAcceptanceManifest != null ? fieldAcceptanceManifest.summary : null;
            string modes = fieldAcceptanceManifest != null ? TrackingModesLabel(fieldAcceptanceManifest.hardware_modes_required) : "qr,image_tracking,slam";
            bool guardKnown = summary == null || summary.simulator_rehearsal_is_not_hardware_ready;
            string guard = guardKnown ? "simulator/manual not hardware" : "guard unknown";
            return guard + " | hardware modes " + modes;
        }

        private int CountFieldAcceptanceGates(string status)
        {
            if (fieldAcceptanceManifest == null || fieldAcceptanceManifest.gates == null || string.IsNullOrWhiteSpace(status))
            {
                return 0;
            }

            int count = 0;
            foreach (FieldAcceptanceGate gate in fieldAcceptanceManifest.gates)
            {
                if (gate != null && !string.IsNullOrWhiteSpace(gate.status) && string.Equals(gate.status.Trim(), status, StringComparison.OrdinalIgnoreCase))
                {
                    count++;
                }
            }

            return count;
        }

        private string BoolLabel(bool value)
        {
            return value ? "true" : "false";
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
            public readonly LineRenderer HaloLine;
            public readonly LineRenderer StemLine;
            public readonly Vector3 BaseScale;
            public readonly Color BaseColor;

            public AnchorVisualState(
                AnchorData anchor,
                Transform markerTransform,
                Renderer markerRenderer,
                TextMesh labelMesh,
                LineRenderer haloLine,
                LineRenderer stemLine,
                Vector3 baseScale,
                Color baseColor)
            {
                Anchor = anchor;
                MarkerTransform = markerTransform;
                MarkerRenderer = markerRenderer;
                LabelMesh = labelMesh;
                HaloLine = haloLine;
                StemLine = stemLine;
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
