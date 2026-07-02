using System.IO;
using InnerWorld.Rokid;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace InnerWorld.Rokid.Editor
{
    public static class InnerWorldSceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/InnerWorldDemo.unity";

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
            InnerWorldDemoController controller = Object.FindObjectOfType<InnerWorldDemoController>();
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
