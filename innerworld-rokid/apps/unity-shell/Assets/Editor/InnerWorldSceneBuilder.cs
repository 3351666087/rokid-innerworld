using System;
using System.IO;
using InnerWorld.Rokid;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using System.Collections.Generic;
using UnityEngine.XR.Management;
using UnityEngine.XR.OpenXR;
using UnityEditor.XR.Management;
using UnityEditor.XR.OpenXR.Features;

namespace InnerWorld.Rokid.Editor
{
    public static class InnerWorldSceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/InnerWorldDemo.unity";
        private const string OpenXrLoaderAssetPath = "Assets/XR/Loaders/OpenXRLoader.asset";
        private const string XrSimulationTempPath = "Assets/XR/Temp";
        private const string SpaceWarpFeatureId = "com.unity.openxr.feature.spacewarp";
        private const string RokidControllerFeatureId = "com.unity.openxr.feature.input.rokidcontrollerprofile";

        public static void BuildScene()
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            GameObject controller = new GameObject("InnerWorld Demo Controller");
            controller.AddComponent<InnerWorldDemoController>();

            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(ScenePath, true)
            };

            Debug.Log("InnerWorld scene generated at " + ScenePath);
        }

        public static void ValidateScene()
        {
            Scene scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            InnerWorldDemoController controller = UnityEngine.Object.FindObjectOfType<InnerWorldDemoController>();
            if (controller == null)
            {
                throw new MissingComponentException("InnerWorldDemoController missing from " + scene.path);
            }

            Debug.Log("InnerWorld scene validation passed: " + scene.path);
        }

        public static void BuildWindowsFallback()
        {
            if (!File.Exists(ScenePath))
            {
                BuildScene();
            }

            string outputDir = Path.GetFullPath(Path.Combine("..", "..", "output", "unity-windows"));
            Directory.CreateDirectory(outputDir);
            string outputPath = Path.Combine(outputDir, "InnerWorldRokid.exe");

            List<string> buildScenes = new List<string>();
            foreach (var s in EditorBuildSettings.scenes)
            {
                if (s.enabled) buildScenes.Add(s.path);
            }
            if (buildScenes.Count == 0 && File.Exists(ScenePath))
            {
                buildScenes.Add(ScenePath);
            }

            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = buildScenes.ToArray(),
                locationPathName = outputPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new System.Exception("Windows fallback build failed: " + report.summary.result);
            }

            CopyStreamingAssetsConfig(outputDir);
            Debug.Log("Windows fallback build generated at " + outputPath);
        }

        public static void BuildAndroidFallback()
        {
            if (!File.Exists(ScenePath))
            {
                BuildScene();
            }

            string outputDir = Path.GetFullPath(Path.Combine("..", "..", "output", "unity-android"));
            Directory.CreateDirectory(outputDir);
            string outputPath = Path.Combine(outputDir, "InnerWorldRokid.apk");

            PlayerSettings.companyName = "InnerWorld";
            PlayerSettings.productName = "InnerWorld Rokid";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.innerworld.rokid.prototype");
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel25;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.Android.forceInternetPermission = true;
            PlayerSettings.insecureHttpOption = InsecureHttpOption.AlwaysAllowed;
            EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
            ApplyRokidAndroidEnvironmentFix();
            EnsureRokidAndroidSceneBindings();

            List<string> buildScenes = new List<string>();
            foreach (var s in EditorBuildSettings.scenes)
            {
                if (s.enabled) buildScenes.Add(s.path);
            }
            if (buildScenes.Count == 0 && File.Exists(ScenePath))
            {
                buildScenes.Add(ScenePath);
            }

            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = buildScenes.ToArray(),
                locationPathName = outputPath,
                target = BuildTarget.Android,
                options = BuildOptions.None
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new System.Exception("Android fallback build failed: " + report.summary.result);
            }

            Debug.Log("Android fallback build generated at " + outputPath);
        }

        private static void ApplyRokidAndroidEnvironmentFix()
        {
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel28;
            PlayerSettings.Android.optimizedFramePacing = false;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            EnsureScriptingDefineSymbols(NamedBuildTarget.Android, new[] { "ROKID_UXR", "USE_ROKID_OPENXR" });
            EnsureAndroidOpenXrProjectSettings();
            CleanXrSimulationTempAssets();
            AssetDatabase.SaveAssets();
        }

        private static void EnsureAndroidOpenXrProjectSettings()
        {
            XRGeneralSettingsPerBuildTarget targetSettings = GetOrCreateXRGeneralSettingsPerBuildTarget();
            if (!targetSettings.HasManagerSettingsForBuildTarget(BuildTargetGroup.Android))
            {
                targetSettings.CreateDefaultManagerSettingsForBuildTarget(BuildTargetGroup.Android);
            }

            XRGeneralSettings androidSettings = targetSettings.SettingsForBuildTarget(BuildTargetGroup.Android);
            if (androidSettings != null)
            {
                androidSettings.InitManagerOnStart = true;
            }

            XRManagerSettings manager = targetSettings.ManagerSettingsForBuildTarget(BuildTargetGroup.Android);
            if (manager != null)
            {
                manager.automaticLoading = true;
                manager.automaticRunning = true;
                EnsureOpenXrLoader(manager);
                EditorUtility.SetDirty(manager);
            }

            FeatureHelpers.RefreshFeatures(BuildTargetGroup.Android);
            SetOpenXrFeatureEnabled(SpaceWarpFeatureId, false);
            SetOpenXrFeatureEnabled(RokidControllerFeatureId, true);

            if (androidSettings != null)
            {
                EditorUtility.SetDirty(androidSettings);
            }
            EditorUtility.SetDirty(targetSettings);
        }

        private static XRGeneralSettingsPerBuildTarget GetOrCreateXRGeneralSettingsPerBuildTarget()
        {
            XRGeneralSettingsPerBuildTarget targetSettings;
            if (EditorBuildSettings.TryGetConfigObject(XRGeneralSettings.k_SettingsKey, out targetSettings) && targetSettings != null)
            {
                return targetSettings;
            }

            string[] assets = AssetDatabase.FindAssets("t:XRGeneralSettingsPerBuildTarget");
            if (assets.Length > 0)
            {
                string existingPath = AssetDatabase.GUIDToAssetPath(assets[0]);
                targetSettings = AssetDatabase.LoadAssetAtPath<XRGeneralSettingsPerBuildTarget>(existingPath);
            }

            if (targetSettings == null)
            {
                Directory.CreateDirectory("Assets/XR");
                targetSettings = ScriptableObject.CreateInstance<XRGeneralSettingsPerBuildTarget>();
                AssetDatabase.CreateAsset(targetSettings, "Assets/XR/XRGeneralSettingsPerBuildTarget.asset");
                AssetDatabase.SaveAssets();
            }

            EditorBuildSettings.AddConfigObject(XRGeneralSettings.k_SettingsKey, targetSettings, true);
            return targetSettings;
        }

        private static void EnsureOpenXrLoader(XRManagerSettings manager)
        {
            foreach (XRLoader loader in manager.activeLoaders)
            {
                if (loader is OpenXRLoader)
                {
                    return;
                }
            }

            OpenXRLoader openXrLoader = AssetDatabase.LoadAssetAtPath<OpenXRLoader>(OpenXrLoaderAssetPath);
            if (openXrLoader == null)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(OpenXrLoaderAssetPath));
                openXrLoader = ScriptableObject.CreateInstance<OpenXRLoader>();
                openXrLoader.name = "OpenXRLoader";
                AssetDatabase.CreateAsset(openXrLoader, OpenXrLoaderAssetPath);
                AssetDatabase.SaveAssets();
            }

            if (!manager.TryAddLoader(openXrLoader))
            {
                Debug.LogWarning("OpenXRLoader was not added to XRManagerSettings; it may already be registered or blocked by XR Management validation.");
            }
        }

        private static void SetOpenXrFeatureEnabled(string featureId, bool enabled)
        {
            UnityEngine.XR.OpenXR.Features.OpenXRFeature feature = FeatureHelpers.GetFeatureWithIdForBuildTarget(BuildTargetGroup.Android, featureId);
            if (feature == null)
            {
                Debug.LogWarning("OpenXR feature not found for Android: " + featureId);
                return;
            }

            feature.enabled = enabled;
            EditorUtility.SetDirty(feature);
        }

        private static void CleanXrSimulationTempAssets()
        {
            if (AssetDatabase.IsValidFolder(XrSimulationTempPath))
            {
                AssetDatabase.DeleteAsset(XrSimulationTempPath);
            }
        }

        private static void EnsureRokidAndroidSceneBindings()
        {
            if (!File.Exists(ScenePath))
            {
                BuildScene();
            }

            Scene scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            bool changed = false;

            if (UnityPackageDeclared("com.rokid.xr.unity"))
            {
                changed |= InstantiatePackagePrefabIfMissing(
                    "Packages/com.rokid.xr.unity/Runtime/Resources/Prefabs/BaseSetting/RKCameraRig.prefab",
                    "RKCameraRig",
                    true);
                changed |= InstantiatePackagePrefabIfMissing(
                    "Packages/com.rokid.xr.unity/Runtime/Resources/Prefabs/RKInput/[RKInput].prefab",
                    "[RKInput]",
                    true);
                changed |= EnsureRuntimeComponent("InnerWorld Rokid Image Tracking", "Rokid.UXR.Module.ARTrackedImageManager");
                changed |= EnsureRuntimeComponent("InnerWorld Rokid Image Tracking Observer", "InnerWorld.Rokid.InnerWorldRokidImageTrackingObserver");
            }

            if (changed)
            {
                EditorSceneManager.MarkSceneDirty(scene);
                EditorSceneManager.SaveScene(scene, ScenePath);
                Debug.Log("Rokid UXR scene bindings updated in " + ScenePath);
            }
        }

        private static bool InstantiatePackagePrefabIfMissing(string packagePrefabPath, string objectName, bool keepActive)
        {
            if (GameObject.Find(objectName) != null)
            {
                return false;
            }

            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(packagePrefabPath);
            if (prefab == null)
            {
                Debug.LogWarning("Rokid package prefab not found yet: " + packagePrefabPath);
                return false;
            }

            GameObject instance = PrefabUtility.InstantiatePrefab(prefab) as GameObject;
            if (instance == null)
            {
                return false;
            }

            instance.name = objectName;
            instance.SetActive(keepActive);
            return true;
        }

        private static bool EnsureRuntimeComponent(string objectName, string typeName)
        {
            Type componentType = ResolveType(typeName);
            if (componentType == null)
            {
                Debug.LogWarning("Rokid runtime component type not found yet: " + typeName);
                return false;
            }

            if (UnityEngine.Object.FindObjectOfType(componentType) != null)
            {
                return false;
            }

            GameObject host = new GameObject(objectName);
            host.AddComponent(componentType);
            return true;
        }

        private static Type ResolveType(string typeName)
        {
            Type type = Type.GetType(typeName);
            if (type != null)
            {
                return type;
            }

            System.Reflection.Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (int index = 0; index < assemblies.Length; index++)
            {
                try
                {
                    type = assemblies[index].GetType(typeName, false);
                    if (type != null)
                    {
                        return type;
                    }
                }
                catch
                {
                }
            }

            return null;
        }

        private static bool UnityPackageDeclared(string packageName)
        {
            string manifestPath = Path.GetFullPath(Path.Combine("Packages", "manifest.json"));
            if (!File.Exists(manifestPath))
            {
                return false;
            }

            return File.ReadAllText(manifestPath).Contains("\"" + packageName + "\"");
        }

        private static void EnsureScriptingDefineSymbols(NamedBuildTarget target, string[] symbols)
        {
            string defines = PlayerSettings.GetScriptingDefineSymbols(target);
            for (int index = 0; index < symbols.Length; index++)
            {
                string symbol = symbols[index];
                if (string.IsNullOrWhiteSpace(symbol) || DefineSymbolsContain(defines, symbol))
                {
                    continue;
                }

                defines = string.IsNullOrWhiteSpace(defines) ? symbol.Trim() : defines + ";" + symbol.Trim();
            }

            PlayerSettings.SetScriptingDefineSymbols(target, defines);
        }

        private static bool DefineSymbolsContain(string defines, string symbol)
        {
            if (string.IsNullOrWhiteSpace(defines) || string.IsNullOrWhiteSpace(symbol))
            {
                return false;
            }

            string[] parts = defines.Split(';');
            for (int index = 0; index < parts.Length; index++)
            {
                if (string.Equals(parts[index].Trim(), symbol.Trim(), StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }

        private static void CopyStreamingAssetsConfig(string outputDir)
        {
            string source = Path.GetFullPath(Path.Combine("Assets", "StreamingAssets", "innerworld-config.json"));
            if (!File.Exists(source)) return;

            string destinationDir = Path.Combine(outputDir, "InnerWorldRokid_Data", "StreamingAssets");
            Directory.CreateDirectory(destinationDir);
            File.Copy(source, Path.Combine(destinationDir, "innerworld-config.json"), true);
        }

        [MenuItem("InnerWorld/Generate Sub Scenes")]
        public static void GenerateSubScenes()
        {
            Directory.CreateDirectory("Assets/Scenes");

            // Scene A1
            CreateSubScene("Assets/Scenes/InnerWorldSceneA1.unity", (root) => {
                GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
                wall.name = "Campus Memory Wall";
                wall.transform.SetParent(root.transform, false);
                wall.transform.localPosition = Vector3.zero;
                wall.transform.localScale = new Vector3(4.1f, 2.25f, 0.08f);
                ApplyMaterial(wall.GetComponent<Renderer>(), new Color(0.08f, 0.105f, 0.13f));

                GameObject glow = GameObject.CreatePrimitive(PrimitiveType.Cube);
                glow.name = "Wall Inner Glow";
                glow.transform.SetParent(root.transform, false);
                glow.transform.localPosition = new Vector3(0f, 0f, -0.055f);
                glow.transform.localScale = new Vector3(3.65f, 1.82f, 0.025f);
                ApplyMaterial(glow.GetComponent<Renderer>(), new Color(0.12f, 0.22f, 0.24f));

                CreateAnchor(root, "A1", "入口 (Scan Point)", new Vector3(-0.7f, 0.92f, -0.34f), new Color(0.36f, 0.92f, 1f));
                CreateAnchor(root, "A2", "里世界记忆展示墙", new Vector3(0f, 1.45f, -0.58f), new Color(1f, 0.82f, 0.26f));
                CreateAnchor(root, "A3", "空间出口", new Vector3(0.7f, 0.92f, -0.30f), new Color(0.42f, 1f, 0.74f));
                CreateRouteLine(root);
            });

            // Scene A2
            CreateSubScene("Assets/Scenes/InnerWorldSceneA2.unity", (root) => {
                CreateAnchor(root, "A2", "UGC 情感层锚定点", Vector3.zero, new Color(1f, 0.82f, 0.26f));
                
                GameObject cloudRoot = new GameObject("Floating Whale Cloud");
                cloudRoot.transform.SetParent(root.transform, false);
                cloudRoot.transform.localPosition = new Vector3(0f, 0.55f, -0.1f);
                
                Color cloudColor = new Color(0.52f, 0.86f, 1f, 0.85f);
                CreateCloudLobe(cloudRoot.transform, "Whale Core", Vector3.zero, new Vector3(0.35f, 0.16f, 0.14f), cloudColor);
                CreateCloudLobe(cloudRoot.transform, "Whale Lobe Left", new Vector3(-0.24f, -0.03f, 0.02f), new Vector3(0.24f, 0.12f, 0.11f), cloudColor * 0.9f);
                CreateCloudLobe(cloudRoot.transform, "Whale Lobe Right", new Vector3(0.24f, -0.03f, 0.02f), new Vector3(0.27f, 0.13f, 0.11f), cloudColor * 0.95f);
                
                GameObject stemObj = new GameObject("Cloud Connection Stem");
                stemObj.transform.SetParent(root.transform, false);
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
            });

            // Scene A3
            CreateSubScene("Assets/Scenes/InnerWorldSceneA3.unity", (root) => {
                CreateAnchor(root, "A3", "官方任务层锚定点", Vector3.zero, new Color(0.42f, 1f, 0.74f));

                GameObject taskCanvasObj = new GameObject("Floating Task Board");
                taskCanvasObj.transform.SetParent(root.transform, false);
                taskCanvasObj.transform.localPosition = new Vector3(0f, 0.45f, -0.1f);
                taskCanvasObj.transform.localScale = new Vector3(0.0018f, 0.0018f, 1f);

                Canvas taskCanvas = taskCanvasObj.AddComponent<Canvas>();
                taskCanvas.renderMode = RenderMode.WorldSpace;
                taskCanvasObj.AddComponent<UnityEngine.UI.CanvasScaler>();

                GameObject taskPanel = new GameObject("TaskPanel");
                taskPanel.transform.SetParent(taskCanvasObj.transform, false);
                RectTransform taskPanelRect = taskPanel.AddComponent<RectTransform>();
                taskPanelRect.sizeDelta = new Vector2(350f, 180f);
                UnityEngine.UI.Image taskBg = taskPanel.AddComponent<UnityEngine.UI.Image>();
                taskBg.color = new Color(0.03f, 0.04f, 0.05f, 0.90f);
                UnityEngine.UI.Outline taskOutline = taskPanel.AddComponent<UnityEngine.UI.Outline>();
                taskOutline.effectColor = new Color(0.42f, 1f, 0.74f, 0.8f);
                taskOutline.effectDistance = new Vector2(2f, 2f);

                GameObject taskTextObj = new GameObject("TaskText");
                taskTextObj.transform.SetParent(taskPanel.transform, false);
                RectTransform taskTextRect = taskTextObj.AddComponent<RectTransform>();
                taskTextRect.sizeDelta = new Vector2(320f, 150f);
                UnityEngine.UI.Text taskTxt = taskTextObj.AddComponent<UnityEngine.UI.Text>();
                taskTxt.font = GetBuiltinFont();
                taskTxt.fontSize = 16;
                taskTxt.lineSpacing = 1.2f;
                taskTxt.alignment = TextAnchor.MiddleLeft;
                taskTxt.color = Color.white;
                taskTxt.text = "【里世界官方任务面板】\n" +
                              "⭐ 校园标志打卡: [已完成]\n" +
                              "⭐ UGC 写入校验: [未完成]\n" +
                              "⭐ 证据链上链核对: [进行中]";
            });

            // Register in Build Settings
            RegisterScenesInBuildSettings();
        }

        private static void CreateSubScene(string path, Action<GameObject> builder)
        {
            Scene activeScene = EditorSceneManager.GetActiveScene();
            string activeScenePath = activeScene.path;

            Scene newScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            string rootName = Path.GetFileNameWithoutExtension(path) + "Root";
            GameObject rootObj = new GameObject(rootName);
            
            builder(rootObj);

            EditorSceneManager.SaveScene(newScene, path);

            if (!string.IsNullOrEmpty(activeScenePath))
            {
                EditorSceneManager.OpenScene(activeScenePath, OpenSceneMode.Single);
            }
            Debug.Log("Generated sub-scene: " + path);
        }

        private static void ApplyMaterial(Renderer r, Color color)
        {
            if (r == null) return;
            Shader s = Shader.Find("Legacy Shaders/Diffuse") ?? Shader.Find("Standard");
            if (s != null)
            {
                Material mat = new Material(s);
                mat.color = color;
                r.sharedMaterial = mat;
            }
        }

        private static void ApplyLineMaterial(LineRenderer line, Color color)
        {
            Shader shader = Shader.Find("Legacy Shaders/Particles/Alpha Blended Premultiply") ?? Shader.Find("Sprites/Default");
            if (shader != null)
            {
                Material mat = new Material(shader);
                mat.color = color;
                line.sharedMaterial = mat;
            }
        }

        private static void CreateAnchor(GameObject parent, string id, string label, Vector3 localPos, Color color)
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

            GameObject labelObj = new GameObject("Label " + id);
            labelObj.transform.SetParent(anchorGroup.transform, false);
            labelObj.transform.localPosition = localPos + new Vector3(0f, 0.22f, -0.01f);
            TextMesh mesh = labelObj.AddComponent<TextMesh>();
            mesh.text = id + " " + label;
            mesh.font = GetBuiltinFont();
            mesh.fontSize = 24;
            mesh.alignment = TextAlignment.Center;
            mesh.anchor = TextAnchor.LowerCenter;
            mesh.color = Color.white;
            labelObj.transform.localScale = new Vector3(0.04f, 0.04f, 0.04f);

            CreateAnchorHalo(anchorGroup, localPos, color);
            CreateAnchorStem(anchorGroup, localPos, color);
        }

        private static void CreateAnchorHalo(GameObject parent, Vector3 localPos, Color color)
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

        private static void CreateAnchorStem(GameObject parent, Vector3 localPos, Color color)
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

        private static void CreateRouteLine(GameObject parent)
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

        private static void CreateCloudLobe(Transform parent, string name, Vector3 localPos, Vector3 scale, Color color)
        {
            GameObject lobe = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            lobe.name = name;
            lobe.transform.SetParent(parent, false);
            lobe.transform.localPosition = localPos;
            lobe.transform.localScale = scale;
            Collider collider = lobe.GetComponent<Collider>();
            if (collider != null) UnityEngine.Object.DestroyImmediate(collider);
            ApplyMaterial(lobe.GetComponent<Renderer>(), color);
        }

        private static void RegisterScenesInBuildSettings()
        {
            string mainDemoScene = "Assets/Scenes/InnerWorldScanAnchorDemo.unity";
            string a1 = "Assets/Scenes/InnerWorldSceneA1.unity";
            string a2 = "Assets/Scenes/InnerWorldSceneA2.unity";
            string a3 = "Assets/Scenes/InnerWorldSceneA3.unity";
            string demo = "Assets/Scenes/InnerWorldDemo.unity";

            var scenesList = new List<EditorBuildSettingsScene>();
            if (File.Exists(mainDemoScene)) scenesList.Add(new EditorBuildSettingsScene(mainDemoScene, true));
            if (File.Exists(demo)) scenesList.Add(new EditorBuildSettingsScene(demo, true));
            if (File.Exists(a1)) scenesList.Add(new EditorBuildSettingsScene(a1, true));
            if (File.Exists(a2)) scenesList.Add(new EditorBuildSettingsScene(a2, true));
            if (File.Exists(a3)) scenesList.Add(new EditorBuildSettingsScene(a3, true));

            EditorBuildSettings.scenes = scenesList.ToArray();
            Debug.Log("Updated EditorBuildSettings.scenes with dynamic scenes.");
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
