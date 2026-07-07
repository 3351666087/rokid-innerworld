using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

#if ROKID_UXR
using Rokid.UXR.Module;
#endif

namespace InnerWorld.Rokid
{
    public sealed class InnerWorldScanAnchorController : MonoBehaviour
    {
        [Header("Scene Configuration")]
        public Vector3 initialCameraPos = new Vector3(0f, 1.45f, 0f);
        public Vector3 initialSceneOffset = new Vector3(0f, 1.15f, 2.5f);

        // Three independent scene roots for different spaces
        private GameObject sceneRootA1;
        private GameObject sceneRootA2;
        private GameObject sceneRootA3;

        private Text statusText;
        private float scanAnimationTimer = 0f;
        private GameObject activeWaveRoot;
        private LineRenderer scanEffectWave;

        // Nested animator class for "Scan Successful" floating UI notification
        public sealed class ToastAnimator : MonoBehaviour
        {
            public float duration = 2.0f;
            private float elapsed = 0f;
            private Vector3 startScale;
            private Vector3 targetScale;
            private Vector3 startPos;

            private void Start()
            {
                startScale = transform.localScale * 0.5f;
                targetScale = transform.localScale;
                transform.localScale = startScale;
                startPos = transform.position;
            }

            private void Update()
            {
                elapsed += Time.deltaTime;
                float progress = elapsed / duration;

                if (progress >= 1f)
                {
                    Destroy(gameObject);
                    return;
                }

                // Spring scale-up (0% to 20%)
                if (progress < 0.2f)
                {
                    float t = progress / 0.2f;
                    transform.localScale = Vector3.Lerp(startScale, targetScale, Mathf.Sin(t * Mathf.PI * 0.5f));
                }

                // Float upwards slowly
                transform.position = startPos + new Vector3(0f, progress * 0.15f, 0f);

                // Fade out in last 40% of duration
                if (progress > 0.6f)
                {
                    float alpha = (1f - progress) / 0.4f;
                    CanvasGroup group = GetComponent<CanvasGroup>();
                    if (group == null)
                    {
                        group = gameObject.AddComponent<CanvasGroup>();
                    }
                    group.alpha = alpha;
                }
            }
        }

        private void Awake()
        {
            EnsureCameraAndLight();
            BuildUI();
            BuildVirtualScenes();
        }

        private void Start()
        {
#if ROKID_UXR
            // Register Rokid SDK image tracking listeners
            ARTrackedImageManager.OnTrackedImageAdded += OnTrackedImageAdded;
            ARTrackedImageManager.OnTrackedImageUpdated += OnTrackedImageUpdated;
            Debug.Log("[ScanAnchorController] Registered Rokid ARTrackedImageManager callbacks.");
#else
            Debug.Log("[ScanAnchorController] Running in fallback editor mode. Keyboard Shortcuts:\n" +
                      " - [Space]: Simulate scanning A1 QR Code (Memory Wall)\n" +
                      " - [2]: Simulate scanning A2 Logo (Whale Cloud)\n" +
                      " - [3]: Simulate scanning A3 Logo (Task Board)");
#endif
        }

        private void OnDestroy()
        {
#if ROKID_UXR
            ARTrackedImageManager.OnTrackedImageAdded -= OnTrackedImageAdded;
            ARTrackedImageManager.OnTrackedImageUpdated -= OnTrackedImageUpdated;
#endif
        }

        private void Update()
        {
            // Auto-rotate Canvas to face camera
            Camera cam = Camera.main;
            if (cam != null && statusText != null)
            {
                Canvas canvas = statusText.canvas;
                if (canvas != null)
                {
                    canvas.transform.rotation = Quaternion.LookRotation(canvas.transform.position - cam.transform.position);
                }
            }

            // Keyboard Space / number keys simulators
            if (Input.GetKeyDown(KeyCode.Space))
            {
                SimulateScanEvent(1);
            }
            if (Input.GetKeyDown(KeyCode.Alpha2) || Input.GetKeyDown(KeyCode.Keypad2))
            {
                SimulateScanEvent(2);
            }
            if (Input.GetKeyDown(KeyCode.Alpha3) || Input.GetKeyDown(KeyCode.Keypad3))
            {
                SimulateScanEvent(3);
            }

            // Update scanning visualizer wave animation
            UpdateScanWaveAnimation();
        }

#if ROKID_UXR
        private void OnTrackedImageAdded(ARTrackedImage trackedImage)
        {
            HandleDetectedTarget(trackedImage.index, trackedImage.pose);
        }

        private void OnTrackedImageUpdated(ARTrackedImage trackedImage)
        {
            HandleDetectedTarget(trackedImage.index, trackedImage.pose);
        }
#endif

        private void HandleDetectedTarget(int imageIndex, Pose pose)
        {
            if (imageIndex == 1)
            {
                ActivateAndAlignScene(sceneRootA1, "A1 入口 (Campus Wall)", pose);
            }
            else if (imageIndex == 2)
            {
                ActivateAndAlignScene(sceneRootA2, "A2 UGC 情感层 (Whale Cloud)", pose);
            }
            else if (imageIndex == 3)
            {
                ActivateAndAlignScene(sceneRootA3, "A3 官方任务层 (Task Board)", pose);
            }
        }

        private void ActivateAndAlignScene(GameObject sceneRoot, string sceneName, Pose pose)
        {
            if (sceneRoot == null) return;

            // Anchor the scene root onto the physical target's 6DoF Pose
            sceneRoot.transform.position = pose.position;
            sceneRoot.transform.rotation = pose.rotation;

            bool isFirstActivation = !sceneRoot.activeSelf;
            if (isFirstActivation)
            {
                sceneRoot.SetActive(true);
                TriggerScanWaveEffect(sceneRoot, pose.position);
                ShowScanSuccessNotification(sceneName);
            }

            if (statusText != null)
            {
                statusText.text = "【里世界 AR 空间激活图层】\n\n" +
                                  "🟢 识别对齐成功：" + sceneName + "\n" +
                                  "当前状态：已锁定物理空间 6DoF 姿态\n" +
                                  "(对着其他标识卡片扫码可加载不同空间图层)";
            }
        }

        private void SimulateScanEvent(int index)
        {
            Debug.Log("[ScanAnchorController] Simulating scan event for index: " + index);
            Camera cam = Camera.main;
            
            // Adjust offsets slightly depending on target so they don't overlap in simulation
            Vector3 offset = initialSceneOffset;
            if (index == 2) offset = initialSceneOffset + new Vector3(-1.2f, 0.2f, 0.5f);
            if (index == 3) offset = initialSceneOffset + new Vector3(1.2f, -0.1f, -0.3f);

            Vector3 targetPos = cam != null
                ? cam.transform.position + cam.transform.forward * offset.z + cam.transform.right * offset.x + cam.transform.up * (offset.y - 1.45f)
                : offset;
            Quaternion targetRot = cam != null
                ? Quaternion.Euler(0f, cam.transform.eulerAngles.y, 0f)
                : Quaternion.identity;

            Pose simulatedPose = new Pose(targetPos, targetRot);
            HandleDetectedTarget(index, simulatedPose);
        }

        private void TriggerScanWaveEffect(GameObject root, Vector3 center)
        {
            activeWaveRoot = root;
            scanAnimationTimer = 0.5f;
            if (scanEffectWave != null)
            {
                scanEffectWave.gameObject.SetActive(true);
            }
        }

        private void UpdateScanWaveAnimation()
        {
            if (scanAnimationTimer > 0f && activeWaveRoot != null)
            {
                scanAnimationTimer -= Time.deltaTime;
                float progress = 1f - (scanAnimationTimer / 0.5f);
                float radius = progress * 2.5f;

                if (scanEffectWave != null)
                {
                    scanEffectWave.positionCount = 48;
                    for (int i = 0; i < 48; i++)
                    {
                        float angle = i * Mathf.PI * 2f / 48;
                        Vector3 localOffset = new Vector3(Mathf.Cos(angle) * radius, Mathf.Sin(angle) * radius, -0.02f);
                        scanEffectWave.SetPosition(i, activeWaveRoot.transform.position + activeWaveRoot.transform.rotation * localOffset);
                    }

                    Color color = new Color(0.36f, 0.92f, 1f, 1f - progress);
                    scanEffectWave.startColor = color;
                    scanEffectWave.endColor = color;
                }

                if (scanAnimationTimer <= 0f && scanEffectWave != null)
                {
                    scanEffectWave.gameObject.SetActive(false);
                    activeWaveRoot = null;
                }
            }
        }

        private void ShowScanSuccessNotification(string sceneName)
        {
            GameObject toastCanvasObj = new GameObject("Toast Canvas");
            Canvas canvas = toastCanvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;

            Camera cam = Camera.main;
            Vector3 camPos = cam != null ? cam.transform.position : Vector3.zero;
            Vector3 camForward = cam != null ? cam.transform.forward : Vector3.forward;

            // Spawn directly in front of camera at a very comfortable reading position (1.1m height, 1m distance)
            toastCanvasObj.transform.position = camPos + camForward * 1.0f + new Vector3(0f, -0.1f, 0f);
            toastCanvasObj.transform.rotation = Quaternion.LookRotation(toastCanvasObj.transform.position - camPos);
            toastCanvasObj.transform.localScale = new Vector3(0.0018f, 0.0018f, 1f);

            toastCanvasObj.AddComponent<CanvasScaler>();

            // Panel Background (deep green glow representing successful lock)
            GameObject panelObj = new GameObject("ToastPanel");
            panelObj.transform.SetParent(toastCanvasObj.transform, false);
            RectTransform panelRect = panelObj.AddComponent<RectTransform>();
            panelRect.sizeDelta = new Vector2(460f, 110f);
            Image bg = panelObj.AddComponent<Image>();
            bg.color = new Color(0.04f, 0.16f, 0.12f, 0.92f);

            // Border outline
            Outline outline = panelObj.AddComponent<Outline>();
            outline.effectColor = new Color(0.42f, 1f, 0.74f, 0.95f);
            outline.effectDistance = new Vector2(2f, 2f);

            // Text
            GameObject textObj = new GameObject("ToastText");
            textObj.transform.SetParent(panelObj.transform, false);
            RectTransform textRect = textObj.AddComponent<RectTransform>();
            textRect.sizeDelta = new Vector2(440f, 90f);
            Text txt = textObj.AddComponent<Text>();
            txt.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            txt.fontSize = 20;
            txt.alignment = TextAnchor.MiddleCenter;
            txt.color = new Color(0.85f, 1f, 0.9f);
            txt.text = "✨ 识别成功 / Scan Success! ✨\n" + sceneName + " 已加载对齐";

            // Attach animator for spring and fadeout
            ToastAnimator animator = toastCanvasObj.AddComponent<ToastAnimator>();
            animator.duration = 2.2f;
        }

        private void BuildVirtualScenes()
        {
            // ================= SCENE ROOT A1 (Memory Wall) =================
            sceneRootA1 = new GameObject("Scene Root A1 - Memory Wall");
            sceneRootA1.transform.position = Vector3.zero;
            sceneRootA1.transform.rotation = Quaternion.identity;

            GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "Campus Memory Wall";
            wall.transform.SetParent(sceneRootA1.transform, false);
            wall.transform.localPosition = Vector3.zero;
            wall.transform.localScale = new Vector3(4.1f, 2.25f, 0.08f);
            ApplyMaterial(wall.GetComponent<Renderer>(), new Color(0.08f, 0.105f, 0.13f));

            GameObject glow = GameObject.CreatePrimitive(PrimitiveType.Cube);
            glow.name = "Wall Inner Glow";
            glow.transform.SetParent(sceneRootA1.transform, false);
            glow.transform.localPosition = new Vector3(0f, 0f, -0.055f);
            glow.transform.localScale = new Vector3(3.65f, 1.82f, 0.025f);
            ApplyMaterial(glow.GetComponent<Renderer>(), new Color(0.12f, 0.22f, 0.24f));

            CreateAnchor(sceneRootA1, "A1", "入口 (Scan Point)", new Vector3(-0.7f, 0.92f, -0.34f), new Color(0.36f, 0.92f, 1f));
            CreateAnchor(sceneRootA1, "A2", "里世界记忆展示墙", new Vector3(0f, 1.45f, -0.58f), new Color(1f, 0.82f, 0.26f));
            CreateAnchor(sceneRootA1, "A3", "空间出口", new Vector3(0.7f, 0.92f, -0.30f), new Color(0.42f, 1f, 0.74f));
            CreateRouteLine(sceneRootA1);
            sceneRootA1.SetActive(false);

            // ================= SCENE ROOT A2 (Whale Cloud) =================
            sceneRootA2 = new GameObject("Scene Root A2 - Whale Cloud");
            sceneRootA2.transform.position = Vector3.zero;
            sceneRootA2.transform.rotation = Quaternion.identity;

            // Anchor point representation
            CreateAnchor(sceneRootA2, "A2", "UGC 情感层锚定点", Vector3.zero, new Color(1f, 0.82f, 0.26f));
            
            // Build the floating low-poly Whale Cloud (Multiple spheres)
            GameObject cloudRoot = new GameObject("Floating Whale Cloud");
            cloudRoot.transform.SetParent(sceneRootA2.transform, false);
            cloudRoot.transform.localPosition = new Vector3(0f, 0.55f, -0.1f);
            
            Color cloudColor = new Color(0.52f, 0.86f, 1f, 0.85f);
            CreateCloudLobe(cloudRoot.transform, "Whale Core", Vector3.zero, new Vector3(0.35f, 0.16f, 0.14f), cloudColor);
            CreateCloudLobe(cloudRoot.transform, "Whale Lobe Left", new Vector3(-0.24f, -0.03f, 0.02f), new Vector3(0.24f, 0.12f, 0.11f), cloudColor * 0.9f);
            CreateCloudLobe(cloudRoot.transform, "Whale Lobe Right", new Vector3(0.24f, -0.03f, 0.02f), new Vector3(0.27f, 0.13f, 0.11f), cloudColor * 0.95f);
            
            // Connecting line stem to the cloud
            GameObject stemObj = new GameObject("Cloud Connection Stem");
            stemObj.transform.SetParent(sceneRootA2.transform, false);
            LineRenderer cloudStem = stemObj.AddComponent<LineRenderer>();
            cloudStem.useWorldSpace = false;
            cloudStem.positionCount = 2;
            cloudStem.startWidth = 0.006f;
            cloudStem.endWidth = 0.003f;
            cloudStem.startColor = new Color(cloudColor.r, cloudColor.g, cloudColor.b, 0.2f);
            cloudStem.endColor = cloudColor;
            ApplyLineMaterial(cloudStem, cloudColor);
            cloudStem.SetPosition(0, Vector3.zero);
            cloudStem.SetPosition(1, new Vector3(0f, 0.47f, -0.1f));
            sceneRootA2.SetActive(false);

            // ================= SCENE ROOT A3 (Task Board) =================
            sceneRootA3 = new GameObject("Scene Root A3 - Task Board");
            sceneRootA3.transform.position = Vector3.zero;
            sceneRootA3.transform.rotation = Quaternion.identity;

            // Anchor point representation
            CreateAnchor(sceneRootA3, "A3", "官方任务层锚定点", Vector3.zero, new Color(0.42f, 1f, 0.74f));

            // Floating WorldSpace Task Board
            GameObject taskCanvasObj = new GameObject("Floating Task Board");
            taskCanvasObj.transform.SetParent(sceneRootA3.transform, false);
            taskCanvasObj.transform.localPosition = new Vector3(0f, 0.45f, -0.1f);
            taskCanvasObj.transform.localScale = new Vector3(0.0018f, 0.0018f, 1f);

            Canvas taskCanvas = taskCanvasObj.AddComponent<Canvas>();
            taskCanvas.renderMode = RenderMode.WorldSpace;
            taskCanvasObj.AddComponent<CanvasScaler>();

            GameObject taskPanel = new GameObject("TaskPanel");
            taskPanel.transform.SetParent(taskCanvasObj.transform, false);
            RectTransform taskPanelRect = taskPanel.AddComponent<RectTransform>();
            taskPanelRect.sizeDelta = new Vector2(350f, 180f);
            Image taskBg = taskPanel.AddComponent<Image>();
            taskBg.color = new Color(0.03f, 0.04f, 0.05f, 0.90f);
            Outline taskOutline = taskPanel.AddComponent<Outline>();
            taskOutline.effectColor = new Color(0.42f, 1f, 0.74f, 0.8f);
            taskOutline.effectDistance = new Vector2(2f, 2f);

            GameObject taskTextObj = new GameObject("TaskText");
            taskTextObj.transform.SetParent(taskPanel.transform, false);
            RectTransform taskTextRect = taskTextObj.AddComponent<RectTransform>();
            taskTextRect.sizeDelta = new Vector2(320f, 150f);
            Text taskTxt = taskTextObj.AddComponent<Text>();
            taskTxt.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            taskTxt.fontSize = 16;
            taskTxt.lineSpacing = 1.2f;
            taskTxt.alignment = TextAnchor.MiddleLeft;
            taskTxt.color = Color.white;
            taskTxt.text = "【里世界官方任务面板】\n" +
                          "⭐ 校园标志打卡: [已完成]\n" +
                          "⭐ UGC 写入校验: [未完成]\n" +
                          "⭐ 证据链上链核对: [进行中]";
            sceneRootA3.SetActive(false);

            // ================= WAVE EFFECT =================
            GameObject waveObj = new GameObject("Scan Wave Effect");
            scanEffectWave = waveObj.AddComponent<LineRenderer>();
            scanEffectWave.useWorldSpace = true;
            scanEffectWave.loop = true;
            scanEffectWave.startWidth = 0.015f;
            scanEffectWave.endWidth = 0.015f;
            ApplyLineMaterial(scanEffectWave, new Color(0.36f, 0.92f, 1f));
            waveObj.SetActive(false);
        }

        private void CreateCloudLobe(Transform parent, string name, Vector3 localPos, Vector3 scale, Color color)
        {
            GameObject lobe = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            lobe.name = name;
            lobe.transform.SetParent(parent, false);
            lobe.transform.localPosition = localPos;
            lobe.transform.localScale = scale;
            Collider collider = lobe.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            ApplyMaterial(lobe.GetComponent<Renderer>(), color);
        }

        private void CreateAnchor(GameObject parent, string id, string label, Vector3 localPos, Color color)
        {
            GameObject anchorGroup = new GameObject("Anchor Group " + id);
            anchorGroup.transform.SetParent(parent.transform, false);
            anchorGroup.transform.localPosition = Vector3.zero;

            GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Quad);
            marker.name = "Anchor " + id + " - " + label;
            marker.transform.SetParent(anchorGroup.transform, false);
            marker.transform.localPosition = localPos;
            marker.transform.localScale = new Vector3(0.24f, 0.24f, 1f);
            ApplyMaterial(marker.GetComponent<Renderer>(), color);

            // Text Label
            GameObject labelObj = new GameObject("Label " + id);
            labelObj.transform.SetParent(anchorGroup.transform, false);
            labelObj.transform.localPosition = localPos + new Vector3(0f, 0.22f, -0.01f);
            TextMesh mesh = labelObj.AddComponent<TextMesh>();
            mesh.text = id + " " + label;
            mesh.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            mesh.fontSize = 24;
            mesh.alignment = TextAlignment.Center;
            mesh.anchor = TextAnchor.LowerCenter;
            mesh.color = Color.white;
            labelObj.transform.localScale = new Vector3(0.04f, 0.04f, 0.04f);

            // Halos & Stems
            CreateAnchorHalo(anchorGroup, localPos, color);
            CreateAnchorStem(anchorGroup, localPos, color);
        }

        private void CreateAnchorHalo(GameObject parent, Vector3 localPos, Color color)
        {
            GameObject halo = new GameObject("Halo");
            halo.transform.SetParent(parent.transform, false);
            halo.transform.localPosition = localPos + new Vector3(0f, 0f, -0.02f);
            LineRenderer line = halo.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.loop = true;
            line.positionCount = 32;
            line.startWidth = 0.005f;
            line.endWidth = 0.005f;
            line.startColor = color;
            line.endColor = color;
            ApplyLineMaterial(line, color);

            float radius = 0.16f;
            for (int i = 0; i < 32; i++)
            {
                float angle = i * Mathf.PI * 2f / 32;
                line.SetPosition(i, new Vector3(Mathf.Cos(angle) * radius, Mathf.Sin(angle) * radius, 0f));
            }
        }

        private void CreateAnchorStem(GameObject parent, Vector3 localPos, Color color)
        {
            GameObject stem = new GameObject("Stem");
            stem.transform.SetParent(parent.transform, false);
            stem.transform.localPosition = Vector3.zero;
            LineRenderer line = stem.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.positionCount = 2;
            line.startWidth = 0.005f;
            line.endWidth = 0.002f;
            line.startColor = new Color(color.r, color.g, color.b, 0.15f);
            line.endColor = color;
            ApplyLineMaterial(line, color);

            line.SetPosition(0, new Vector3(localPos.x, -1.125f, localPos.z));
            line.SetPosition(1, localPos);
        }

        private void CreateRouteLine(GameObject parent)
        {
            GameObject route = new GameObject("Connection Route Ribbon");
            route.transform.SetParent(parent.transform, false);
            route.transform.localPosition = Vector3.zero;
            LineRenderer line = route.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.positionCount = 3;
            line.startWidth = 0.008f;
            line.endWidth = 0.008f;
            Color color = new Color(0.36f, 0.92f, 1f, 0.5f);
            line.startColor = color;
            line.endColor = color;
            ApplyLineMaterial(line, color);

            line.SetPosition(0, new Vector3(-0.7f, 0.92f, -0.34f));
            line.SetPosition(1, new Vector3(0f, 1.45f, -0.58f));
            line.SetPosition(2, new Vector3(0.7f, 0.92f, -0.30f));
        }

        private void BuildUI()
        {
            GameObject canvasObj = new GameObject("Demo Canvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            
            // Adjusted position slightly lower (1.15m height instead of 1.35m) for comfortable eye gaze as per guidelines
            canvasObj.transform.position = new Vector3(0f, 1.15f, 1.5f);
            canvasObj.transform.localScale = new Vector3(0.002f, 0.002f, 1f);

            canvasObj.AddComponent<CanvasScaler>();

            GameObject panelObj = new GameObject("Panel");
            panelObj.transform.SetParent(canvasObj.transform, false);
            RectTransform panelRect = panelObj.AddComponent<RectTransform>();
            panelRect.sizeDelta = new Vector2(750f, 260f);
            Image bg = panelObj.AddComponent<Image>();
            bg.color = new Color(0.02f, 0.03f, 0.04f, 0.90f);

            GameObject border = new GameObject("Border");
            border.transform.SetParent(panelObj.transform, false);
            RectTransform borderRect = border.AddComponent<RectTransform>();
            borderRect.sizeDelta = new Vector2(746f, 256f);
            Outline outline = border.AddComponent<Outline>();
            outline.effectColor = new Color(0.36f, 0.92f, 1f, 0.8f);
            outline.effectDistance = new Vector2(2f, 2f);

            GameObject textObj = new GameObject("StatusText");
            textObj.transform.SetParent(panelObj.transform, false);
            RectTransform textRect = textObj.AddComponent<RectTransform>();
            textRect.sizeDelta = new Vector2(700f, 220f);
            statusText = textObj.AddComponent<Text>();
            statusText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            statusText.fontSize = 22;
            statusText.alignment = TextAnchor.MiddleCenter;
            statusText.color = Color.white;
            statusText.text = "【里世界 AR 空间激活图层】\n\n🔍 正在等待扫描 A1/A2/A3 物理图卡解锁对应空间...\n\n(在 PC 模拟器下可按 [Space], [2], [3] 模拟扫码对应场景)";
        }

        private void EnsureCameraAndLight()
        {
#if ROKID_UXR
            // 1. Try to load and instantiate RKCameraRig from Resources
            GameObject rigPrefab = Resources.Load<GameObject>("Prefabs/BaseSetting/RKCameraRig");
            if (rigPrefab != null)
            {
                Camera oldCam = Camera.main;
                if (oldCam != null && oldCam.name != "RKCamera")
                {
                    Destroy(oldCam.gameObject);
                }

                if (GameObject.Find("RKCameraRig") == null)
                {
                    GameObject rig = Instantiate(rigPrefab);
                    rig.name = "RKCameraRig";
                    rig.transform.position = initialCameraPos;
                    rig.transform.rotation = Quaternion.identity;
                    Debug.Log("[ScanAnchorController] Successfully instantiated Rokid RKCameraRig.");
                }
            }
            else
            {
                Debug.LogWarning("[ScanAnchorController] RKCameraRig prefab not found in Resources. Using fallback main camera.");
                CreateFallbackCamera();
            }

            // 2. Try to load and instantiate RKInput from Resources
            GameObject inputPrefab = Resources.Load<GameObject>("Prefabs/RKInput/[RKInput]");
            if (inputPrefab != null && GameObject.Find("[RKInput]") == null)
            {
                GameObject rkInput = Instantiate(inputPrefab);
                rkInput.name = "[RKInput]";
                Debug.Log("[ScanAnchorController] Successfully instantiated Rokid [RKInput].");
            }
#else
            CreateFallbackCamera();
#endif

            Light[] lights = FindObjectsOfType<Light>();
            if (lights.Length == 0)
            {
                GameObject lightObj = new GameObject("Key Light");
                Light light = lightObj.AddComponent<Light>();
                light.type = LightType.Directional;
                lightObj.transform.rotation = Quaternion.Euler(45f, 45f, 0f);
            }
        }

        private void CreateFallbackCamera()
        {
            if (Camera.main == null)
            {
                GameObject camObj = new GameObject("Main Camera");
                Camera cam = camObj.AddComponent<Camera>();
                cam.tag = "MainCamera";
                camObj.transform.position = initialCameraPos;
                camObj.transform.rotation = Quaternion.identity;
                cam.backgroundColor = Color.black;
                cam.clearFlags = CameraClearFlags.SolidColor;
            }
        }

        private void ApplyMaterial(Renderer r, Color color)
        {
            if (r == null) return;
            Shader s = Shader.Find("Legacy Shaders/Diffuse") ?? Shader.Find("Standard");
            if (s != null)
            {
                r.material = new Material(s);
                r.material.color = color;
            }
        }

        private void ApplyLineMaterial(LineRenderer line, Color color)
        {
            Shader shader = Shader.Find("Legacy Shaders/Particles/Alpha Blended Premultiply") ?? Shader.Find("Sprites/Default");
            if (shader != null)
            {
                line.material = new Material(shader);
                line.material.color = color;
            }
        }
    }
}
