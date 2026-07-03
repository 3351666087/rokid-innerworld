using System;
using System.IO;
using InnerWorld.Rokid;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
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

            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
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

            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
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
    }
}
