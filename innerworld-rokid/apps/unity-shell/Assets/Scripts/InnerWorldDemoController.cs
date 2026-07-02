using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using InnerWorld.Rokid.Protocol;
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
        private EditorRokidInputSource editorRokidInputSource;
        private IRokidInputSource rokidInputSource;
        private string currentGazeAnchorId = string.Empty;
        private string currentGazeAnchorLabel = string.Empty;
        private bool currentGazeSelecting;
        private string selectedAnchorId = string.Empty;
        private GameObject gazeReticle;
        private LineRenderer gazeReticleLine;
        private Material gazeReticleMaterial;

        private const float GazeHitRadiusMeters = 0.16f;
        private const int GazeReticleSegments = 48;

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

            if (Input.GetKeyDown(KeyCode.R)) StartCoroutine(BootstrapAndLoadSpace());
            if (!IsRokidInputActive() && Input.GetKeyDown(KeyCode.Space)) CompleteNextStep();
            if (Input.GetKeyDown(KeyCode.S)) StartCoroutine(PostServiceAction());
            if (Input.GetKeyDown(KeyCode.W)) StartCoroutine(PostWriteBack());
            if (Input.GetKeyDown(KeyCode.B)) StartCoroutine(SwitchUserB());
        }

        private IEnumerator BootstrapAndLoadSpace()
        {
            EnsureApiClient();
            yield return LoadBootstrap();
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
                request.timeout = 5;
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    bootstrap = JsonUtility.FromJson<DeviceBootstrapResponse>(request.downloadHandler.text);
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

            RokidInputFrame frame;
            if (rokidInputSource.TryReadFrame(out frame))
            {
                ConsumeRokidInput(frame);
            }
        }

        private void UpdateRokidGazeTarget()
        {
            if (editorRokidInputSource == null || !editorRokidInputSource.IsPoseValid)
            {
                ClearGazeVisualTarget();
                return;
            }

            RokidGazeState gaze;
            if (!editorRokidInputSource.TryGetGaze(out gaze))
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
                editorRokidInputSource.State.SetGazeAnchorHit(target.anchorId, label, hit.point, hit.distance);
                SetGazeVisualTarget(target.anchorId, label, hit.point, gaze.IsSelecting);
                return;
            }

            editorRokidInputSource.State.ClearAnchorTarget();
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
                request.timeout = 5;
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    space = JsonUtility.FromJson<SpaceResponse>(request.downloadHandler.text);
                    usingFallback = false;
                    SetRokidConnection(RokidConnectionStatus.Connected, "Space loaded");
                }
                else
                {
                    Debug.LogWarning("Space API unavailable, using fallback data: " + request.error);
                    space = JsonUtility.FromJson<SpaceResponse>(FallbackJson);
                    usingFallback = true;
                    SetRokidConnection(RokidConnectionStatus.OfflineFallback, "Using fallback JSON");
                }
            }

            localStepIndex = space != null && space.runtime != null ? space.runtime.current_step_index : 0;
            RenderAnchors();
            RefreshHud();
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
                label = "Join 14:30 demo"
            };
            yield return PostJson(apiClient.ServiceActionsUrl, JsonUtility.ToJson(request), "Service action posted");
            yield return LoadSpace();
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
                request.timeout = 5;
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
            string runtime = space.runtime != null ? space.runtime.mission_state : "local";
            SetStatus(space.name, space.space_id + " | " + source + " | " + runtime);
            SetDetail(GetMissionLine() + "\nAnchors: " + SafeAnchors().Length + " / Beacons: " + SafeBeacons().Length);
            RefreshInputStatusLine();
            RefreshTargetHud();
            if (keyHintText != null) keyHintText.text = "Keys: R Reload | Space/Enter Confirm | Esc Back | Mouse Gaze | S/W/B";
        }

        private string GetMissionLine()
        {
            if (space == null || space.mission == null || space.mission.steps == null || space.mission.steps.Length == 0)
            {
                return "Mission: unavailable";
            }

            int index = Mathf.Clamp(localStepIndex, 0, space.mission.steps.Length - 1);
            MissionStepData step = space.mission.steps[index];
            if (stepText != null)
            {
                stepText.text = "Step " + (index + 1) + "/" + space.mission.steps.Length + ": " + step.label;
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
            panelRect.sizeDelta = new Vector2(500f, 356f);
            Image panelImage = panel.AddComponent<Image>();
            panelImage.color = new Color(0.03f, 0.045f, 0.055f, 0.88f);

            sourceText = CreateText("Source", panel.transform, 13, FontStyle.Bold);
            SetRect(sourceText.rectTransform, 18f, -14f, 460f, 42f);

            statusText = CreateText("Status", panel.transform, 18, FontStyle.Bold);
            SetRect(statusText.rectTransform, 18f, -62f, 430f, 48f);

            stepText = CreateText("Step", panel.transform, 15, FontStyle.Bold);
            SetRect(stepText.rectTransform, 18f, -116f, 430f, 32f);

            detailText = CreateText("Detail", panel.transform, 14, FontStyle.Normal);
            SetRect(detailText.rectTransform, 18f, -150f, 430f, 52f);

            targetText = CreateText("Target", panel.transform, 13, FontStyle.Bold);
            targetText.color = new Color(0.98f, 0.9f, 0.42f);
            SetRect(targetText.rectTransform, 18f, -206f, 460f, 38f);

            keyHintText = CreateText("Key Hints", panel.transform, 13, FontStyle.Bold);
            keyHintText.color = new Color(0.76f, 0.93f, 1f);
            SetRect(keyHintText.rectTransform, 18f, -252f, 460f, 32f);

            float x = 18f;
            CreateButton("Reload", panel.transform, x, -304f, 74f, () => StartCoroutine(BootstrapAndLoadSpace()));
            x += 82f;
            CreateButton("Next", panel.transform, x, -304f, 64f, CompleteNextStep);
            x += 72f;
            CreateButton("Service", panel.transform, x, -304f, 80f, () => StartCoroutine(PostServiceAction()));
            x += 88f;
            CreateButton("Write", panel.transform, x, -304f, 66f, () => StartCoroutine(PostWriteBack()));
            x += 74f;
            CreateButton("User B", panel.transform, x, -304f, 70f, () => StartCoroutine(SwitchUserB()));

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

            targetText.text = gazeLine + "\n" + selectedLine;
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
            apiClient = new SpaceApiClient(baseUrl, spaceId, deviceProfile);
            baseUrl = apiClient.BaseUrl;
            spaceId = apiClient.SpaceId;
            deviceProfile = apiClient.DeviceProfile;

            if (editorRokidInputSource != null)
            {
                editorRokidInputSource.SetBaseUrl(apiClient.BaseUrl);
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
            editorRokidInputSource = new EditorRokidInputSource();
            rokidInputSource = editorRokidInputSource;
            editorRokidInputSource.SetBaseUrl(apiClient != null ? apiClient.BaseUrl : baseUrl);
            editorRokidInputSource.SetConnection(RokidConnectionStatus.Disconnected, "Simulator ready");
            RefreshInputStatusLine();
        }

        private bool IsRokidInputActive()
        {
            return rokidInputSource != null && rokidInputSource.IsAvailable;
        }

        private void SetRokidConnection(RokidConnectionStatus status, string message)
        {
            if (editorRokidInputSource != null)
            {
                editorRokidInputSource.SetConnection(status, message);
            }

            RefreshInputStatusLine();
        }

        private void RefreshInputStatusLine()
        {
            if (sourceText == null) return;

            RokidConnectionInfo connection = CurrentConnectionInfo();
            sourceText.text = "INPUT " + CurrentInputSourceName() + " | " + connection.Status + " | " + CurrentDeviceProfile()
                + "\n" + (apiClient != null ? apiClient.BaseUrl : baseUrl);
        }

        private RokidConnectionInfo CurrentConnectionInfo()
        {
            return rokidInputSource != null ? rokidInputSource.Connection : RokidConnectionInfo.Disconnected(baseUrl);
        }

        private string CurrentInputSourceName()
        {
            return rokidInputSource != null ? rokidInputSource.SourceName : "keyboard";
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

            return "A";
        }

        private bool IsPointerOverUi()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
        }

        private void ApplyRuntimeConfig()
        {
            RuntimeConfig config = LoadRuntimeConfig();
            if (config != null)
            {
                if (!string.IsNullOrWhiteSpace(config.base_url)) baseUrl = config.base_url.Trim();
                if (!string.IsNullOrWhiteSpace(config.space_id)) spaceId = config.space_id.Trim();
                if (!string.IsNullOrWhiteSpace(config.device_profile)) deviceProfile = config.device_profile.Trim();
            }

            string envBaseUrl = Environment.GetEnvironmentVariable("INNERWORLD_API_BASE_URL");
            if (!string.IsNullOrWhiteSpace(envBaseUrl)) baseUrl = envBaseUrl.Trim();

            string envSpaceId = Environment.GetEnvironmentVariable("INNERWORLD_SPACE_ID");
            if (!string.IsNullOrWhiteSpace(envSpaceId)) spaceId = envSpaceId.Trim();

            string envDeviceProfile = Environment.GetEnvironmentVariable("INNERWORLD_DEVICE_PROFILE");
            if (!string.IsNullOrWhiteSpace(envDeviceProfile)) deviceProfile = envDeviceProfile.Trim();

            foreach (string arg in Environment.GetCommandLineArgs())
            {
                if (arg.StartsWith("--innerworld-api=", StringComparison.OrdinalIgnoreCase))
                {
                    baseUrl = arg.Substring("--innerworld-api=".Length).Trim();
                }
                else if (arg.StartsWith("--innerworld-space=", StringComparison.OrdinalIgnoreCase))
                {
                    spaceId = arg.Substring("--innerworld-space=".Length).Trim();
                }
                else if (arg.StartsWith("--innerworld-profile=", StringComparison.OrdinalIgnoreCase))
                {
                    deviceProfile = arg.Substring("--innerworld-profile=".Length).Trim();
                }
            }

            if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "http://localhost:5177";
            if (string.IsNullOrWhiteSpace(spaceId)) spaceId = "innerworld_campus_wall";
            if (string.IsNullOrWhiteSpace(deviceProfile)) deviceProfile = "rokid-ar";
            baseUrl = baseUrl.TrimEnd('/');
        }

        private RuntimeConfig LoadRuntimeConfig()
        {
            string persistentConfig = System.IO.Path.Combine(Application.persistentDataPath, configFileName);
            RuntimeConfig config = TryReadConfig(persistentConfig);
            if (config != null) return config;

            string streamingConfig = System.IO.Path.Combine(Application.streamingAssetsPath, configFileName);
            if (!streamingConfig.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                config = TryReadConfig(streamingConfig);
                if (config != null) return config;
            }

            return TryReadResourceConfig();
        }

        private RuntimeConfig TryReadConfig(string path)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(path) || !System.IO.File.Exists(path)) return null;
                string json = System.IO.File.ReadAllText(path, Encoding.UTF8);
                return JsonUtility.FromJson<RuntimeConfig>(json);
            }
            catch (Exception error)
            {
                Debug.LogWarning("Failed to read InnerWorld runtime config: " + path + " / " + error.Message);
                return null;
            }
        }

        private RuntimeConfig TryReadResourceConfig()
        {
            try
            {
                string resourceName = System.IO.Path.GetFileNameWithoutExtension(configFileName);
                TextAsset asset = Resources.Load<TextAsset>(resourceName);
                if (asset == null || string.IsNullOrWhiteSpace(asset.text)) return null;
                return JsonUtility.FromJson<RuntimeConfig>(asset.text);
            }
            catch (Exception error)
            {
                Debug.LogWarning("Failed to read InnerWorld runtime config resource: " + error.Message);
                return null;
            }
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

    [Serializable]
    public sealed class RuntimeConfig
    {
        public string base_url;
        public string space_id;
        public string device_profile;
    }
}
