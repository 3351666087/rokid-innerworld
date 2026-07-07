using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

#if ROKID_UXR
using Rokid.UXR.Module;
#endif

namespace InnerWorld.Rokid
{
    public sealed class InnerWorldScanAnchorController : MonoBehaviour
    {
        [Serializable]
        public struct GpsSceneConfig
        {
            public string scene_id;
            public double gps_latitude;
            public double gps_longitude;
            public float active_radius_meters;
            public int marker_image_index;
            public string scene_unity_name;
            public string display_name;
        }

        [Serializable]
        public struct GpsScenesConfigList
        {
            public GpsSceneConfig[] scenes;
        }

        [Header("Scene Configuration")]
        public Vector3 initialCameraPos = new Vector3(0f, 1.45f, 0f);
        public Vector3 initialSceneOffset = new Vector3(0f, 1.15f, 2.5f);

        private List<GpsSceneConfig> configs = new List<GpsSceneConfig>();
        private Text statusText;
        private float scanAnimationTimer = 0f;
        private GameObject activeWaveRoot;
        private LineRenderer scanEffectWave;

        // GPS State and Simulation Presets
        private double currentLatitude = 31.27584;
        private double currentLongitude = 120.73812;
        private int currentSimGpsIndex = 0; // 0=A1, 1=A2, 2=A3, 3=Out of Range

        // Captured GPS coordinates developer tool
        private GameObject captureButtonObj;
        private Image captureButtonBg;
        private Text captureButtonText;
        private bool isGazingCaptureButton = false;
        private string lastCapturedGpsString = "未捕获";

        // Spatial Beacons Lifecycles
        private sealed class ActiveBeacon
        {
            public string sceneId;
            public int markerIndex;
            public string sceneUnityName;
            public string displayName;
            public GameObject beaconObject;
            public TextMesh labelMesh;
            public LineRenderer progressRing;
            public Pose spawnPose;
            public float loadingProgress = 0f;
            public bool isLoading = false;
            public bool isLoaded = false;
            public string statusMessage = "";
            public GameObject loadedSceneRoot = null;
        }

        private List<ActiveBeacon> activeBeacons = new List<ActiveBeacon>();
        private ActiveBeacon focusedBeacon = null;

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
            LoadGpsConfigurations();

            // Setup default simulated coordinates to the A1 preset
            currentLatitude = 31.27584;
            currentLongitude = 120.73812;

            StartCoroutine(StartLocationService());
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
                      " - [3]: Simulate scanning A3 Logo (Task Board)\n" +
                      " - [G]: Cycle simulated GPS locations\n" +
                      " - [C]: Capture and copy current GPS location");
#endif
            // Pre-create the LineRenderer for scan wave animations
            CreateScanWaveEffectObject();
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

            // Fetch live Android GPS coordinates if available
            if (Input.location.status == LocationServiceStatus.Running)
            {
                currentLatitude = Input.location.lastData.latitude;
                currentLongitude = Input.location.lastData.longitude;
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
            if (Input.GetKeyDown(KeyCode.G))
            {
                CycleSimulatedGps();
            }
            if (Input.GetKeyDown(KeyCode.C))
            {
                CaptureCurrentGps();
            }

            // Update raycast gaze check and beacon distance lifecycles
            UpdateGazeRaycast();
            UpdateBeaconLifecycles();

            // Update scanning visualizer wave animation
            UpdateScanWaveAnimation();

            // Update the HUD display details
            UpdateHudText();
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

        private bool IsUxrConfirmDown()
        {
            return Input.GetKeyDown(KeyCode.JoystickButton0) 
                || (RKNativeInput.Instance != null && (RKNativeInput.Instance.GetKeyDown(RKKeyEvent.KEY_OK)
                    || RKNativeInput.Instance.GetStation2EventTrigger(RKStation2KeyEvent.KEY_LIGHT_DOUBLE_TAP)));
        }
#endif

        private void LoadGpsConfigurations()
        {
            string path = Path.Combine(Application.streamingAssetsPath, "gps_scenes_config.json");
            if (File.Exists(path))
            {
                try
                {
                    string json = File.ReadAllText(path);
                    GpsScenesConfigList list = JsonUtility.FromJson<GpsScenesConfigList>(json);
                    if (list.scenes != null)
                    {
                        configs.AddRange(list.scenes);
                        Debug.Log("[ScanAnchorController] Successfully loaded " + configs.Count + " GPS scene configurations.");
                        return;
                    }
                }
                catch (Exception e)
                {
                    Debug.LogError("[ScanAnchorController] Error parsing GPS config JSON: " + e.Message);
                }
            }
            else
            {
                Debug.LogWarning("[ScanAnchorController] GPS config JSON not found at: " + path + ". Loading fallback configurations.");
            }

            // Fallback default coordinates
            configs.Add(new GpsSceneConfig { scene_id = "campus_memory_wall", gps_latitude = 31.27584, gps_longitude = 120.73812, active_radius_meters = 50f, marker_image_index = 1, scene_unity_name = "InnerWorldSceneA1", display_name = "A1 入口 (Campus Wall)" });
            configs.Add(new GpsSceneConfig { scene_id = "whale_cloud", gps_latitude = 31.27589, gps_longitude = 120.73820, active_radius_meters = 50f, marker_image_index = 2, scene_unity_name = "InnerWorldSceneA2", display_name = "A2 UGC 情感层 (Whale Cloud)" });
            configs.Add(new GpsSceneConfig { scene_id = "task_board", gps_latitude = 31.27575, gps_longitude = 120.73805, active_radius_meters = 50f, marker_image_index = 3, scene_unity_name = "InnerWorldSceneA3", display_name = "A3 官方任务层 (Task Board)" });
        }

        private IEnumerator StartLocationService()
        {
            if (!Input.location.isEnabledByUser)
            {
                Debug.Log("[ScanAnchorController] Location service not enabled by user. Using simulation mode.");
                yield break;
            }

            Input.location.Start(1f, 1f);
            int maxWait = 20;
            while (Input.location.status == LocationServiceStatus.Initializing && maxWait > 0)
            {
                yield return new WaitForSeconds(1);
                maxWait--;
            }

            if (maxWait < 1)
            {
                Debug.Log("[ScanAnchorController] Location service initialization timed out.");
                yield break;
            }

            if (Input.location.status == LocationServiceStatus.Failed)
            {
                Debug.Log("[ScanAnchorController] Location service initialization failed.");
                yield break;
            }

            Debug.Log("[ScanAnchorController] Location service active: " + Input.location.lastData.latitude + ", " + Input.location.lastData.longitude);
        }

        private void CycleSimulatedGps()
        {
            currentSimGpsIndex = (currentSimGpsIndex + 1) % 4;
            switch (currentSimGpsIndex)
            {
                case 0:
                    currentLatitude = 31.27584;
                    currentLongitude = 120.73812;
                    break;
                case 1:
                    currentLatitude = 31.27589;
                    currentLongitude = 120.73820;
                    break;
                case 2:
                    currentLatitude = 31.27575;
                    currentLongitude = 120.73805;
                    break;
                case 3:
                    currentLatitude = 31.00000;
                    currentLongitude = 121.00000;
                    break;
            }
            Debug.Log("[ScanAnchorController] Simulated GPS changed to Preset " + currentSimGpsIndex + ": (" + currentLatitude + ", " + currentLongitude + ")");
        }

        private void CaptureCurrentGps()
        {
            string jsonSnippet = string.Format("{{\"gps_latitude\": {0:F7}, \"gps_longitude\": {1:F7}}}", currentLatitude, currentLongitude);
            GUIUtility.systemCopyBuffer = jsonSnippet;
            lastCapturedGpsString = string.Format("{0:F6}, {1:F6} (已复制并自动对齐)", currentLatitude, currentLongitude);

            // Re-align all dynamic target configurations to the user's captured location
            for (int i = 0; i < configs.Count; i++)
            {
                var cfg = configs[i];
                cfg.gps_latitude = currentLatitude;
                cfg.gps_longitude = currentLongitude;
                configs[i] = cfg;
            }

            Debug.Log("[ScanAnchorController] Captured Spot GPS. Re-aligned all targets to: (" + currentLatitude + ", " + currentLongitude + "). JSON Copied to clipboard:\n" + jsonSnippet);
            ShowScanSuccessNotification("🎯 坐标已捕获并重新对齐所有空间图层！\n已复制剪贴板: " + jsonSnippet);
        }

        private float CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const float R = 6371000f; // Earth's radius in meters
            double dLat = (lat2 - lat1) * Mathf.Deg2Rad;
            double dLon = (lon2 - lon1) * Mathf.Deg2Rad;
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(lat1 * Mathf.Deg2Rad) * Math.Cos(lat2 * Mathf.Deg2Rad) *
                       System.Math.Sin(dLon / 2) * System.Math.Sin(dLon / 2);
            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return (float)(R * c);
        }

        private void HandleDetectedTarget(int imageIndex, Pose pose)
        {
            GpsSceneConfig matchConfig = default;
            bool found = false;
            foreach (var cfg in configs)
            {
                if (cfg.marker_image_index == imageIndex)
                {
                    matchConfig = cfg;
                    found = true;
                    break;
                }
            }

            if (!found)
            {
                Debug.LogWarning("[ScanAnchorController] Unknown marker image index detected: " + imageIndex);
                return;
            }

            // GPS gating validation
            float dist = CalculateDistance(currentLatitude, currentLongitude, matchConfig.gps_latitude, matchConfig.gps_longitude);
            if (dist > matchConfig.active_radius_meters)
            {
                ShowScanFailureNotification(matchConfig.display_name + "\n❌ 过滤失败：超出 GPS 范围！");
                Debug.LogWarning("[ScanAnchorController] GPS Check Gated scan for " + matchConfig.display_name + ". Distance: " + dist + "m > " + matchConfig.active_radius_meters + "m");
                return;
            }

            // Check if beacon is already active for this marker
            foreach (var beacon in activeBeacons)
            {
                if (beacon.markerIndex == imageIndex)
                {
                    beacon.spawnPose = pose;
                    if (beacon.beaconObject != null)
                    {
                        beacon.beaconObject.transform.position = pose.position;
                        beacon.beaconObject.transform.rotation = pose.rotation;
                    }
                    if (beacon.loadedSceneRoot != null)
                    {
                        beacon.loadedSceneRoot.transform.position = pose.position;
                        beacon.loadedSceneRoot.transform.rotation = pose.rotation;
                    }
                    return;
                }
            }

            // Spawn the Spatial Beacon
            SpawnSpatialBeacon(matchConfig, pose);
        }

        private void SpawnSpatialBeacon(GpsSceneConfig config, Pose pose)
        {
            GameObject beaconRoot = new GameObject("Spatial Beacon - " + config.display_name);
            beaconRoot.transform.position = pose.position;
            beaconRoot.transform.rotation = pose.rotation;

            // Visual diamond orb
            GameObject visual = GameObject.CreatePrimitive(PrimitiveType.Cube);
            visual.name = "Beacon Diamond";
            visual.transform.SetParent(beaconRoot.transform, false);
            visual.transform.localPosition = new Vector3(0f, 0.4f, 0f);
            visual.transform.localScale = new Vector3(0.18f, 0.18f, 0.18f);
            visual.transform.localRotation = Quaternion.Euler(45f, 45f, 45f);

            Color baseColor = GetColorForIndex(config.marker_image_index);
            ApplyMaterial(visual.GetComponent<Renderer>(), baseColor);

            BoxCollider box = visual.GetComponent<BoxCollider>();
            if (box != null) Destroy(box);

            // Gaze selection volume
            SphereCollider sphere = visual.AddComponent<SphereCollider>();
            sphere.radius = 1.3f;
            sphere.isTrigger = true;

            // Halo & Stem
            CreateAnchorHalo(beaconRoot, new Vector3(0f, 0.4f, 0f), baseColor * 0.8f);
            CreateAnchorStem(beaconRoot, new Vector3(0f, 0.4f, 0f), baseColor * 0.5f);

            // Circular progress indicator (drawn using LineRenderer)
            GameObject ringObj = new GameObject("ProgressRing");
            ringObj.transform.SetParent(beaconRoot.transform, false);
            LineRenderer ring = ringObj.AddComponent<LineRenderer>();
            ring.useWorldSpace = true;
            ring.startWidth = 0.012f;
            ring.endWidth = 0.012f;
            ApplyLineMaterial(ring, new Color(0.42f, 1f, 0.74f));
            ringObj.SetActive(false);

            // Label above the beacon
            GameObject labelObj = new GameObject("BeaconLabel");
            labelObj.transform.SetParent(beaconRoot.transform, false);
            labelObj.transform.localPosition = new Vector3(0f, 0.68f, 0f);
            TextMesh mesh = labelObj.AddComponent<TextMesh>();
            mesh.text = config.display_name + "\n(注视并按回车或点击加载)";
            mesh.font = GetBuiltinFont();
            mesh.fontSize = 20;
            mesh.alignment = TextAlignment.Center;
            mesh.anchor = TextAnchor.LowerCenter;
            mesh.color = Color.white;
            labelObj.transform.localScale = new Vector3(0.02f, 0.02f, 0.02f);

            ActiveBeacon beacon = new ActiveBeacon
            {
                sceneId = config.scene_id,
                markerIndex = config.marker_image_index,
                sceneUnityName = config.scene_unity_name,
                displayName = config.display_name,
                beaconObject = visual,
                labelMesh = mesh,
                progressRing = ring,
                spawnPose = pose
            };

            activeBeacons.Add(beacon);
            TriggerScanWaveEffect(beaconRoot, pose.position);
            ShowScanSuccessNotification(config.display_name + " (信标已部署)");
            Debug.Log("[ScanAnchorController] Spawned Spatial Beacon: " + config.display_name);
        }

        private void UpdateGazeRaycast()
        {
            Camera cam = Camera.main;
            if (cam == null) return;

            Ray ray = new Ray(cam.transform.position, cam.transform.forward);
            RaycastHit hit;
            ActiveBeacon hitBeacon = null;
            bool hitButton = false;

            if (Physics.Raycast(ray, out hit, 20f))
            {
                // Check if hit the capture button
                if (hit.collider.gameObject == captureButtonObj)
                {
                    hitButton = true;
                }
                else
                {
                    // Check if hit any beacon
                    foreach (var b in activeBeacons)
                    {
                        if (hit.collider.gameObject == b.beaconObject || hit.collider.transform.IsChildOf(b.beaconObject.transform))
                        {
                            hitBeacon = b;
                            break;
                        }
                    }
                }
            }

            // Gaze Button Logic
            if (hitButton)
            {
                if (!isGazingCaptureButton)
                {
                    isGazingCaptureButton = true;
                    if (captureButtonBg != null) captureButtonBg.color = new Color(0.24f, 0.48f, 0.72f, 1f);
                }

                if (Input.GetKeyDown(KeyCode.Return) || Input.GetMouseButtonDown(0)
#if ROKID_UXR
                    || IsUxrConfirmDown()
#endif
                )
                {
                    CaptureCurrentGps();
                }
            }
            else
            {
                if (isGazingCaptureButton)
                {
                    isGazingCaptureButton = false;
                    if (captureButtonBg != null) captureButtonBg.color = new Color(0.12f, 0.24f, 0.36f, 0.9f);
                }
            }

            // Gaze Beacon Logic
            if (hitBeacon != null)
            {
                if (focusedBeacon != hitBeacon)
                {
                    if (focusedBeacon != null) SetBeaconFocusedVisual(focusedBeacon, false);
                    focusedBeacon = hitBeacon;
                    SetBeaconFocusedVisual(focusedBeacon, true);
                }

                if (Input.GetKeyDown(KeyCode.Return) || Input.GetMouseButtonDown(0)
#if ROKID_UXR
                    || IsUxrConfirmDown()
#endif
                )
                {
                    if (!focusedBeacon.isLoading && !focusedBeacon.isLoaded)
                    {
                        StartCoroutine(LoadSubSceneCoroutine(focusedBeacon));
                    }
                }
            }
            else
            {
                if (focusedBeacon != null)
                {
                    SetBeaconFocusedVisual(focusedBeacon, false);
                    focusedBeacon = null;
                }
            }
        }

        private void SetBeaconFocusedVisual(ActiveBeacon beacon, bool focused)
        {
            if (beacon == null || beacon.beaconObject == null) return;
            Renderer r = beacon.beaconObject.GetComponent<Renderer>();
            if (r != null)
            {
                Color baseColor = GetColorForIndex(beacon.markerIndex);
                r.material.color = focused ? Color.white : baseColor;
            }
            if (beacon.labelMesh != null)
            {
                beacon.labelMesh.color = focused ? new Color(0.42f, 1f, 0.74f) : Color.white;
            }
        }

        private IEnumerator LoadSubSceneCoroutine(ActiveBeacon beacon)
        {
            beacon.isLoading = true;
            beacon.statusMessage = "Loading...";

            // Verify the scene is in Build Settings
            bool sceneInBuild = false;
            for (int i = 0; i < SceneManager.sceneCountInBuildSettings; i++)
            {
                string path = SceneUtility.GetScenePathByBuildIndex(i);
                string name = Path.GetFileNameWithoutExtension(path);
                if (name == beacon.sceneUnityName)
                {
                    sceneInBuild = true;
                    break;
                }
            }

            if (!sceneInBuild)
            {
                beacon.isLoading = false;
                beacon.statusMessage = "Error: Scene not in Build Settings!";
                Debug.LogError("[ScanAnchorController] Scene " + beacon.sceneUnityName + " is not in Build Settings!");
                yield break;
            }

            AsyncOperation op = SceneManager.LoadSceneAsync(beacon.sceneUnityName, LoadSceneMode.Additive);
            while (!op.isDone)
            {
                beacon.loadingProgress = op.progress;
                yield return null;
            }

            beacon.loadingProgress = 1f;
            beacon.isLoaded = true;
            beacon.isLoading = false;
            beacon.statusMessage = "Loaded";

            // Find loaded scene root and position/transition it
            Scene loadedScene = SceneManager.GetSceneByName(beacon.sceneUnityName);
            if (loadedScene.IsValid())
            {
                GameObject[] roots = loadedScene.GetRootGameObjects();
                if (roots.Length > 0)
                {
                    beacon.loadedSceneRoot = roots[0];
                    beacon.loadedSceneRoot.transform.position = beacon.spawnPose.position;
                    beacon.loadedSceneRoot.transform.rotation = beacon.spawnPose.rotation;

                    // Transition visuals
                    float duration = 1.0f;
                    float elapsed = 0f;
                    Vector3 originalSceneScale = beacon.loadedSceneRoot.transform.localScale;
                    Vector3 originalBeaconScale = beacon.beaconObject.transform.localScale;

                    beacon.loadedSceneRoot.transform.localScale = Vector3.zero;

                    while (elapsed < duration)
                    {
                        elapsed += Time.deltaTime;
                        float t = elapsed / duration;

                        beacon.beaconObject.transform.Rotate(Vector3.up, 1200f * Time.deltaTime, Space.Self);
                        beacon.beaconObject.transform.localScale = Vector3.Lerp(originalBeaconScale, Vector3.zero, t);

                        float springT = Mathf.Sin(t * Mathf.PI * 0.5f);
                        beacon.loadedSceneRoot.transform.localScale = Vector3.Lerp(Vector3.zero, originalSceneScale, springT);

                        yield return null;
                    }

                    beacon.beaconObject.SetActive(false);
                    if (beacon.progressRing != null) beacon.progressRing.gameObject.SetActive(false);
                }
            }
        }

        private IEnumerator UnloadSubSceneCoroutine(ActiveBeacon beacon)
        {
            if (beacon.isLoaded && beacon.loadedSceneRoot != null)
            {
                float duration = 0.5f;
                float elapsed = 0f;
                Vector3 originalScale = beacon.loadedSceneRoot.transform.localScale;

                while (elapsed < duration)
                {
                    elapsed += Time.deltaTime;
                    float t = elapsed / duration;
                    beacon.loadedSceneRoot.transform.localScale = Vector3.Lerp(originalScale, Vector3.zero, t);
                    yield return null;
                }

                yield return SceneManager.UnloadSceneAsync(beacon.sceneUnityName);
            }

            if (beacon.beaconObject != null)
            {
                Destroy(beacon.beaconObject.transform.parent.gameObject);
            }
        }

        private void UpdateProgressRing(ActiveBeacon beacon)
        {
            if (beacon.progressRing == null) return;
            if (!beacon.isLoading)
            {
                beacon.progressRing.gameObject.SetActive(false);
                return;
            }

            beacon.progressRing.gameObject.SetActive(true);
            int segments = 32;
            float radius = 0.3f;
            float angleStep = 360f / segments;

            int activePoints = Mathf.RoundToInt(beacon.loadingProgress * segments);
            beacon.progressRing.positionCount = activePoints + 1;

            for (int i = 0; i <= activePoints; i++)
            {
                float angle = i * angleStep * Mathf.Deg2Rad;
                Vector3 localOffset = new Vector3(Mathf.Sin(angle) * radius, Mathf.Cos(angle) * radius, 0f);
                // Rotate progress ring to face the user camera
                Camera cam = Camera.main;
                Quaternion lookRot = cam != null ? Quaternion.LookRotation(beacon.beaconObject.transform.position - cam.transform.position) : Quaternion.identity;
                beacon.progressRing.SetPosition(i, beacon.beaconObject.transform.position + lookRot * localOffset);
            }
        }

        private void UpdateBeaconLifecycles()
        {
            Camera cam = Camera.main;
            if (cam == null) return;

            Vector3 camPos = cam.transform.position;
            List<ActiveBeacon> toUnload = new List<ActiveBeacon>();

            for (int i = 0; i < activeBeacons.Count; i++)
            {
                var b = activeBeacons[i];
                if (b.beaconObject == null) continue;

                // Spin the beacon
                float spinSpeed = b.isLoading ? 400f : 45f;
                b.beaconObject.transform.Rotate(Vector3.up, spinSpeed * Time.deltaTime, Space.Self);

                float distance = Vector3.Distance(camPos, b.beaconObject.transform.position);

                UpdateProgressRing(b);

                // Auto unload when user walks far away
                if (distance >= 20f && !b.isLoading)
                {
                    toUnload.Add(b);
                }
            }

            foreach (var b in toUnload)
            {
                activeBeacons.Remove(b);
                if (focusedBeacon == b) focusedBeacon = null;
                StartCoroutine(UnloadSubSceneCoroutine(b));
                ShowScanFailureNotification(b.displayName + "\n⚠️ 距离过远 (>=20m) 空间自动卸载");
                Debug.Log("[ScanAnchorController] Distance gated auto-unload for beacon: " + b.displayName);
            }
        }

        private void UpdateHudText()
        {
            if (statusText == null) return;

            string gpsStatus = "";
            if (Input.location.status == LocationServiceStatus.Running)
            {
                gpsStatus = "🟢 GPS 定位中 (物理真机)";
            }
            else if (Input.location.status == LocationServiceStatus.Initializing)
            {
                gpsStatus = "🟡 GPS 正在初始化...";
            }
            else
            {
                gpsStatus = "💻 GPS 模拟模式 (键盘 [G] 键切换位置)";
            }

            string simLabel = "";
            switch (currentSimGpsIndex)
            {
                case 0: simLabel = "A1 区域 (Campus Memory Wall)"; break;
                case 1: simLabel = "A2 区域 (Whale Cloud)"; break;
                case 2: simLabel = "A3 区域 (Task Board)"; break;
                case 3: simLabel = "❌ 越界区域 (Out-of-Range)"; break;
            }

            string coordStr = string.Format("当前经纬度: {0:F5}, {1:F5}\n({2})\n{3}\n📌 上次捕获: {4}\n", 
                currentLatitude, currentLongitude, simLabel, gpsStatus, lastCapturedGpsString);

            string distancesStr = "📍 各区域距离及状态:\n";
            foreach (var cfg in configs)
            {
                float dist = CalculateDistance(currentLatitude, currentLongitude, cfg.gps_latitude, cfg.gps_longitude);
                bool inRange = dist <= cfg.active_radius_meters;
                distancesStr += string.Format(" - {0}: 距离 {1:F1} 米 | {2}\n", 
                    cfg.display_name, dist, inRange ? "🟢 允许扫描" : "🔴 扫描过滤");
            }

            string activeBeaconsStr = "\n📡 已生成的空间信标 (Spatial Beacons):\n";
            if (activeBeacons.Count == 0)
            {
                activeBeaconsStr += "   暂无信标 (请扫码或按 Space, 2, 3 生成)\n";
            }
            else
            {
                Camera cam = Camera.main;
                for (int i = 0; i < activeBeacons.Count; i++)
                {
                    var b = activeBeacons[i];
                    float distToCam = cam != null ? Vector3.Distance(cam.transform.position, b.beaconObject.transform.position) : 0f;
                    string focusLabel = (b == focusedBeacon) ? " 👁️ [聚焦中]" : "";
                    
                    string stateLabel = "";
                    if (b.isLoading) stateLabel = string.Format("正在加载 {0:P0}", b.loadingProgress);
                    else if (b.isLoaded) stateLabel = "已加载空间";
                    else stateLabel = "等待加载 (点击或按 Enter)";

                    if (!string.IsNullOrEmpty(b.statusMessage) && b.statusMessage.Contains("Error"))
                    {
                        stateLabel = "❌ 错误: 场景未在 Build Settings 中！";
                    }

                    activeBeaconsStr += string.Format(" - {0}: 距离眼镜 {1:F1}m | {2}{3}\n", 
                        b.displayName, distToCam, stateLabel, focusLabel);
                }
            }

            string gazePrompt = "";
            if (focusedBeacon != null)
            {
                if (focusedBeacon.isLoaded)
                {
                    gazePrompt = "\n✨ [聚焦于 " + focusedBeacon.displayName + " - 空间已展开] ✨\n";
                }
                else if (focusedBeacon.isLoading)
                {
                    gazePrompt = "\n⏳ [空间正在加载中...] ⏳\n";
                }
                else
                {
                    gazePrompt = "\n🔥 [聚焦信标] 点击屏幕或按回车 [Enter] 展开该空间！\n";
                }
            }

            statusText.text = "【大空间里世界场景管理系统】\n\n" + 
                              coordStr + "\n" + 
                              distancesStr + 
                              activeBeaconsStr + 
                              gazePrompt;
        }

        private void SimulateScanEvent(int index)
        {
            Debug.Log("[ScanAnchorController] Simulating scan event for index: " + index);
            Camera cam = Camera.main;
            
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

            toastCanvasObj.transform.position = camPos + camForward * 1.0f + new Vector3(0f, -0.1f, 0f);
            toastCanvasObj.transform.rotation = Quaternion.LookRotation(toastCanvasObj.transform.position - camPos);
            toastCanvasObj.transform.localScale = new Vector3(0.0018f, 0.0018f, 1f);

            toastCanvasObj.AddComponent<CanvasScaler>();

            GameObject panelObj = new GameObject("ToastPanel");
            panelObj.transform.SetParent(toastCanvasObj.transform, false);
            RectTransform panelRect = panelObj.AddComponent<RectTransform>();
            panelRect.sizeDelta = new Vector2(460f, 110f);
            Image bg = panelObj.AddComponent<Image>();
            bg.color = new Color(0.04f, 0.16f, 0.12f, 0.92f);

            Outline outline = panelObj.AddComponent<Outline>();
            outline.effectColor = new Color(0.42f, 1f, 0.74f, 0.95f);
            outline.effectDistance = new Vector2(2f, 2f);

            GameObject textObj = new GameObject("ToastText");
            textObj.transform.SetParent(panelObj.transform, false);
            RectTransform textRect = textObj.AddComponent<RectTransform>();
            textRect.sizeDelta = new Vector2(440f, 90f);
            Text txt = textObj.AddComponent<Text>();
            txt.font = GetBuiltinFont();
            txt.fontSize = 20;
            txt.alignment = TextAnchor.MiddleCenter;
            txt.color = new Color(0.85f, 1f, 0.9f);
            txt.text = "✨ 识别成功 / Scan Success! ✨\n" + sceneName;

            ToastAnimator animator = toastCanvasObj.AddComponent<ToastAnimator>();
            animator.duration = 2.2f;
        }

        private void ShowScanFailureNotification(string message)
        {
            GameObject toastCanvasObj = new GameObject("Toast Canvas Warning");
            Canvas canvas = toastCanvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;

            Camera cam = Camera.main;
            Vector3 camPos = cam != null ? cam.transform.position : Vector3.zero;
            Vector3 camForward = cam != null ? cam.transform.forward : Vector3.forward;

            toastCanvasObj.transform.position = camPos + camForward * 1.0f + new Vector3(0f, -0.1f, 0f);
            toastCanvasObj.transform.rotation = Quaternion.LookRotation(toastCanvasObj.transform.position - camPos);
            toastCanvasObj.transform.localScale = new Vector3(0.0018f, 0.0018f, 1f);

            toastCanvasObj.AddComponent<CanvasScaler>();

            GameObject panelObj = new GameObject("ToastPanel");
            panelObj.transform.SetParent(toastCanvasObj.transform, false);
            RectTransform panelRect = panelObj.AddComponent<RectTransform>();
            panelRect.sizeDelta = new Vector2(460f, 110f);
            Image bg = panelObj.AddComponent<Image>();
            bg.color = new Color(0.18f, 0.04f, 0.04f, 0.92f);

            Outline outline = panelObj.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 0.36f, 0.36f, 0.95f);
            outline.effectDistance = new Vector2(2f, 2f);

            GameObject textObj = new GameObject("ToastText");
            textObj.transform.SetParent(panelObj.transform, false);
            RectTransform textRect = textObj.AddComponent<RectTransform>();
            textRect.sizeDelta = new Vector2(440f, 90f);
            Text txt = textObj.AddComponent<Text>();
            txt.font = GetBuiltinFont();
            txt.fontSize = 20;
            txt.alignment = TextAnchor.MiddleCenter;
            txt.color = new Color(1f, 0.9f, 0.9f);
            txt.text = "⚠️ " + message;

            ToastAnimator animator = toastCanvasObj.AddComponent<ToastAnimator>();
            animator.duration = 2.2f;
        }

        private void CreateScanWaveEffectObject()
        {
            GameObject waveObj = new GameObject("Scan Wave Effect");
            scanEffectWave = waveObj.AddComponent<LineRenderer>();
            scanEffectWave.useWorldSpace = true;
            scanEffectWave.loop = true;
            scanEffectWave.startWidth = 0.015f;
            scanEffectWave.endWidth = 0.015f;
            ApplyLineMaterial(scanEffectWave, new Color(0.36f, 0.92f, 1f));
            waveObj.SetActive(false);
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

        private void BuildUI()
        {
            GameObject canvasObj = new GameObject("Demo Canvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            
            canvasObj.transform.position = new Vector3(0f, 1.15f, 1.5f);
            canvasObj.transform.localScale = new Vector3(0.002f, 0.002f, 1f);

            canvasObj.AddComponent<CanvasScaler>();

            GameObject panelObj = new GameObject("Panel");
            panelObj.transform.SetParent(canvasObj.transform, false);
            RectTransform panelRect = panelObj.AddComponent<RectTransform>();
            panelRect.sizeDelta = new Vector2(750f, 380f);
            Image bg = panelObj.AddComponent<Image>();
            bg.color = new Color(0.02f, 0.03f, 0.04f, 0.90f);

            GameObject border = new GameObject("Border");
            border.transform.SetParent(panelObj.transform, false);
            RectTransform borderRect = border.AddComponent<RectTransform>();
            borderRect.sizeDelta = new Vector2(746f, 376f);
            Outline outline = border.AddComponent<Outline>();
            outline.effectColor = new Color(0.36f, 0.92f, 1f, 0.8f);
            outline.effectDistance = new Vector2(2f, 2f);

            GameObject textObj = new GameObject("StatusText");
            textObj.transform.SetParent(panelObj.transform, false);
            RectTransform textRect = textObj.AddComponent<RectTransform>();
            textRect.anchoredPosition = new Vector2(0f, 30f);
            textRect.sizeDelta = new Vector2(700f, 290f);
            statusText = textObj.AddComponent<Text>();
            statusText.font = GetBuiltinFont();
            statusText.fontSize = 18;
            statusText.alignment = TextAnchor.UpperCenter;
            statusText.color = Color.white;
            statusText.text = "【大空间里世界场景管理系统】\n\n🔍 正在等待定位及扫描卡片...";

            // Capture GPS button
            captureButtonObj = new GameObject("CaptureGpsButton");
            captureButtonObj.transform.SetParent(panelObj.transform, false);
            RectTransform btnRect = captureButtonObj.AddComponent<RectTransform>();
            btnRect.anchoredPosition = new Vector2(0f, -145f);
            btnRect.sizeDelta = new Vector2(300f, 50f);
            
            captureButtonBg = captureButtonObj.AddComponent<Image>();
            captureButtonBg.color = new Color(0.12f, 0.24f, 0.36f, 0.9f);
            Outline btnOutline = captureButtonObj.AddComponent<Outline>();
            btnOutline.effectColor = new Color(0.36f, 0.92f, 1f, 0.8f);
            btnOutline.effectDistance = new Vector2(1f, 1f);

            GameObject btnTextObj = new GameObject("ButtonText");
            btnTextObj.transform.SetParent(captureButtonObj.transform, false);
            RectTransform btnTextRect = btnTextObj.AddComponent<RectTransform>();
            btnTextRect.sizeDelta = new Vector2(280f, 40f);
            captureButtonText = btnTextObj.AddComponent<Text>();
            captureButtonText.font = GetBuiltinFont();
            captureButtonText.fontSize = 16;
            captureButtonText.alignment = TextAnchor.MiddleCenter;
            captureButtonText.color = Color.white;
            captureButtonText.text = "🎯 捕获当前位置并对齐空间";

            BoxCollider collider = captureButtonObj.AddComponent<BoxCollider>();
            collider.size = new Vector3(300f, 50f, 2f);
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

        private Color GetColorForIndex(int index)
        {
            if (index == 1) return new Color(0.36f, 0.92f, 1f); // Cyan
            if (index == 2) return new Color(1f, 0.82f, 0.26f); // Gold
            if (index == 3) return new Color(0.42f, 1f, 0.74f); // Green
            return Color.white;
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

        private static Font GetBuiltinFont()
        {
            Font font = null;
            try
            {
                font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            }
            catch {}
            if (font == null)
            {
                try
                {
                    font = Resources.GetBuiltinResource<Font>("Arial.ttf");
                }
                catch {}
            }
            return font ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }
    }
}
