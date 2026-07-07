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
        public Vector3 initialSceneOffset = new Vector3(0f, 1.35f, 3.2f);

        private GameObject virtualSceneRoot;
        private Text statusText;
        private bool isActivated = false;
        private float scanAnimationTimer = 0f;
        private LineRenderer scanEffectWave;

        private void Awake()
        {
            EnsureCameraAndLight();
            BuildUI();
            BuildVirtualScene();
        }

        private void Start()
        {
#if ROKID_UXR
            // Register Rokid SDK image tracking listeners
            ARTrackedImageManager.OnTrackedImageAdded += OnTrackedImageAdded;
            ARTrackedImageManager.OnTrackedImageUpdated += OnTrackedImageUpdated;
            Debug.Log("[ScanAnchorController] Registered Rokid ARTrackedImageManager callbacks.");
#else
            Debug.Log("[ScanAnchorController] Running in fallback editor mode. Press [Space] to simulate QR/Logo scanning.");
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
            // Rotate the canvas to face the camera so it is always easy to read in AR
            Camera cam = Camera.main;
            if (cam != null && statusText != null)
            {
                Canvas canvas = statusText.canvas;
                if (canvas != null)
                {
                    canvas.transform.rotation = Quaternion.LookRotation(canvas.transform.position - cam.transform.position);
                }
            }

            // Keyboard Space bar simulator
            if (Input.GetKeyDown(KeyCode.Space))
            {
                SimulateScanEvent();
            }

            // Update scanning visualizer animation
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
            // Index 1 represents the A1 QR code marker
            if (imageIndex == 1)
            {
                ActivateAndAlignScene(pose);
            }
        }

        private void ActivateAndAlignScene(Pose pose)
        {
            if (virtualSceneRoot == null) return;

            // Anchor the scene root directly onto the tracked physical marker's position & rotation
            virtualSceneRoot.transform.position = pose.position;
            virtualSceneRoot.transform.rotation = pose.rotation;

            if (!isActivated)
            {
                isActivated = true;
                virtualSceneRoot.SetActive(true);
                TriggerScanWaveEffect(pose.position);
            }

            if (statusText != null)
            {
                statusText.text = "【里世界 AR 空间图层】\n\n🟢 识别对齐成功！里世界已激活并贴合到物理图卡。\n当前状态：已锁定 6DoF 物理空间";
            }
        }

        private void SimulateScanEvent()
        {
            Debug.Log("[ScanAnchorController] Simulating scan event via Space key.");
            Camera cam = Camera.main;
            Vector3 targetPos = cam != null
                ? cam.transform.position + cam.transform.forward * 2.5f + new Vector3(0f, -0.2f, 0f)
                : initialSceneOffset;
            Quaternion targetRot = cam != null
                ? Quaternion.Euler(0f, cam.transform.eulerAngles.y, 0f)
                : Quaternion.identity;

            Pose simulatedPose = new Pose(targetPos, targetRot);
            ActivateAndAlignScene(simulatedPose);
        }

        private void TriggerScanWaveEffect(Vector3 center)
        {
            scanAnimationTimer = 0.5f; // Duration of wave expansion
            if (scanEffectWave != null)
            {
                scanEffectWave.gameObject.SetActive(true);
            }
        }

        private void UpdateScanWaveAnimation()
        {
            if (scanAnimationTimer > 0f)
            {
                scanAnimationTimer -= Time.deltaTime;
                float progress = 1f - (scanAnimationTimer / 0.5f);
                float radius = progress * 2.5f; // expands outward up to 2.5m

                if (scanEffectWave != null)
                {
                    // Draw a concentric circle for the "peeling" wave effect
                    scanEffectWave.positionCount = 48;
                    for (int i = 0; i < 48; i++)
                    {
                        float angle = i * Mathf.PI * 2f / 48;
                        Vector3 localOffset = new Vector3(Mathf.Cos(angle) * radius, Mathf.Sin(angle) * radius, -0.02f);
                        scanEffectWave.SetPosition(i, virtualSceneRoot.transform.position + virtualSceneRoot.transform.rotation * localOffset);
                    }

                    // Fade out
                    Color color = new Color(0.36f, 0.92f, 1f, 1f - progress);
                    scanEffectWave.startColor = color;
                    scanEffectWave.endColor = color;
                }

                if (scanAnimationTimer <= 0f && scanEffectWave != null)
                {
                    scanEffectWave.gameObject.SetActive(false);
                }
            }
        }

        private void BuildVirtualScene()
        {
            virtualSceneRoot = new GameObject("Virtual Scene Root");
            virtualSceneRoot.transform.position = Vector3.zero;
            virtualSceneRoot.transform.rotation = Quaternion.identity;

            // 1. Build Memory Wall
            GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "Campus Memory Wall";
            wall.transform.SetParent(virtualSceneRoot.transform, false);
            wall.transform.localPosition = Vector3.zero;
            wall.transform.localScale = new Vector3(4.1f, 2.25f, 0.08f);
            ApplyMaterial(wall.GetComponent<Renderer>(), new Color(0.08f, 0.105f, 0.13f));

            GameObject glow = GameObject.CreatePrimitive(PrimitiveType.Cube);
            glow.name = "Wall Inner Glow";
            glow.transform.SetParent(virtualSceneRoot.transform, false);
            glow.transform.localPosition = new Vector3(0f, 0f, -0.055f);
            glow.transform.localScale = new Vector3(3.65f, 1.82f, 0.025f);
            ApplyMaterial(glow.GetComponent<Renderer>(), new Color(0.12f, 0.22f, 0.24f));

            // 2. Build 3D Anchors A1, A2, A3
            CreateAnchor("A1", "入口 (Scan Point)", new Vector3(-0.7f, 0.92f, -0.34f), new Color(0.36f, 0.92f, 1f));
            CreateAnchor("A2", "里世界记忆展示墙", new Vector3(0f, 1.45f, -0.58f), new Color(1f, 0.82f, 0.26f));
            CreateAnchor("A3", "空间出口", new Vector3(0.7f, 0.92f, -0.30f), new Color(0.42f, 1f, 0.74f));

            // 3. Connection connection route
            CreateRouteLine();

            // 4. Peeling dynamic wave generator
            GameObject waveObj = new GameObject("Scan Wave Effect");
            waveObj.transform.SetParent(virtualSceneRoot.transform, false);
            scanEffectWave = waveObj.AddComponent<LineRenderer>();
            scanEffectWave.useWorldSpace = true;
            scanEffectWave.loop = true;
            scanEffectWave.startWidth = 0.015f;
            scanEffectWave.endWidth = 0.015f;
            ApplyLineMaterial(scanEffectWave, new Color(0.36f, 0.92f, 1f));
            waveObj.SetActive(false);

            // Default hidden
            virtualSceneRoot.SetActive(false);
        }

        private void CreateAnchor(string id, string label, Vector3 localPos, Color color)
        {
            GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Quad);
            marker.name = "Anchor " + id + " - " + label;
            marker.transform.SetParent(virtualSceneRoot.transform, false);
            marker.transform.localPosition = localPos;
            marker.transform.localScale = new Vector3(0.24f, 0.24f, 1f);
            ApplyMaterial(marker.GetComponent<Renderer>(), color);

            // Text Label
            GameObject labelObj = new GameObject("Label " + id);
            labelObj.transform.SetParent(virtualSceneRoot.transform, false);
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
            CreateAnchorHalo(localPos, color);
            CreateAnchorStem(localPos, color);
        }

        private void CreateAnchorHalo(Vector3 localPos, Color color)
        {
            GameObject halo = new GameObject("Halo");
            halo.transform.SetParent(virtualSceneRoot.transform, false);
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

        private void CreateAnchorStem(Vector3 localPos, Color color)
        {
            GameObject stem = new GameObject("Stem");
            stem.transform.SetParent(virtualSceneRoot.transform, false);
            stem.transform.localPosition = Vector3.zero;
            LineRenderer line = stem.AddComponent<LineRenderer>();
            line.useWorldSpace = false;
            line.positionCount = 2;
            line.startWidth = 0.005f;
            line.endWidth = 0.002f;
            line.startColor = new Color(color.r, color.g, color.b, 0.15f);
            line.endColor = color;
            ApplyLineMaterial(line, color);

            line.SetPosition(0, new Vector3(localPos.x, -1.125f, localPos.z)); // base wall height
            line.SetPosition(1, localPos);
        }

        private void CreateRouteLine()
        {
            GameObject route = new GameObject("Connection Route Ribbon");
            route.transform.SetParent(virtualSceneRoot.transform, false);
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
            canvasObj.transform.position = new Vector3(0f, 1.35f, 1.5f);
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
            statusText.fontSize = 24;
            statusText.alignment = TextAnchor.MiddleCenter;
            statusText.color = Color.white;
            statusText.text = "【里世界 AR 空间激活图层】\n\n🔍 正在等待扫描 A1 物理图卡...\n\n(在 PC 模拟器下可按下 [Space] 空格键模拟扫码)";
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
