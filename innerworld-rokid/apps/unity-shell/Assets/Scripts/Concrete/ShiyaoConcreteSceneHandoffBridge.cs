using System;
using UnityEngine;

namespace InnerWorld.Rokid.Concrete
{
    /// <summary>
    /// Non-invasive bridge for teammate shiyao's scan/logo scene.
    /// Attach this to the scan scene or call HandleDetectedScan after a QR/logo/image target is accepted.
    /// It converts shiyao scene ids / marker indexes into the concrete A1/A2/A3 wall scene handoff contract.
    /// This class does not load or edit shiyao additive scenes; it only notifies an ISceneHandoffReceiver when one exists.
    /// </summary>
    public sealed class ShiyaoConcreteSceneHandoffBridge : MonoBehaviour
    {
        public const string HandoffVersion = "innerworld-shiyao-handoff/v1";

        [Serializable]
        public struct ShiyaoScanSceneConfig
        {
            public string scene_id;
            public double gps_latitude;
            public double gps_longitude;
            public float active_radius_meters;
            public int marker_image_index;
            public string scene_unity_name;
            public string display_name;
        }

        [Header("Fallback")]
        public string fallbackAnchorId = "A1";
        public bool allowFallbackWhenReceiverMissing = true;

        [Header("Diagnostics")]
        [TextArea(2, 4)]
        public string lastHandoffStatus = "pending";

        public bool HandleMarkerScan(int markerImageIndex, Pose markerPose, double gpsLatitude, double gpsLongitude, float confidence = 1f)
        {
            string sceneId = SceneIdForMarker(markerImageIndex);
            return HandleDetectedScan(sceneId, markerImageIndex, markerPose, gpsLatitude, gpsLongitude, confidence, false);
        }

        public bool HandleConfigScan(ShiyaoScanSceneConfig config, Pose markerPose, float confidence = 1f)
        {
            return HandleDetectedScan(config.scene_id, config.marker_image_index, markerPose, config.gps_latitude, config.gps_longitude, confidence, false);
        }

        public bool HandleDetectedScan(string shiyaoSceneId, int markerImageIndex, Pose markerPose, double gpsLatitude, double gpsLongitude, float confidence = 1f, bool fallback = false)
        {
            string anchorId = AnchorForShiyaoScene(shiyaoSceneId, markerImageIndex);
            if (!IsP0Anchor(anchorId))
            {
                anchorId = string.IsNullOrWhiteSpace(fallbackAnchorId) ? "A1" : fallbackAnchorId.Trim();
                fallback = true;
            }

            ISceneHandoffReceiver receiver = FindReceiver();
            if (receiver == null)
            {
                lastHandoffStatus = "receiver missing | scene " + Safe(shiyaoSceneId, "unknown") + " | marker " + markerImageIndex + " | fallback " + fallback + " | no local hardware claim";
                return false;
            }

            SceneHandoffData data = new SceneHandoffData
            {
                handoff_version = HandoffVersion,
                scene_id = anchorId,
                anchor_id = anchorId,
                anchor_position = markerPose.position,
                anchor_rotation = markerPose.rotation,
                wall_normal = markerPose.rotation * Vector3.forward,
                origin_mode = fallback ? "fallback_shiyao_scan_bridge" : "trusted_shiyao_scan_bridge",
                event_id = "shiyao-scan-" + Safe(shiyaoSceneId, "scene") + "-m" + markerImageIndex + "-" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                gps_latitude = gpsLatitude,
                gps_longitude = gpsLongitude,
                entered_at_utc = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                confidence = Mathf.Clamp01(confidence),
                fallback = fallback
            };

            receiver.EnterConcreteScene(data);
            lastHandoffStatus = "sent " + anchorId + " | source " + Safe(shiyaoSceneId, "unknown") + " | marker " + markerImageIndex + " | fallback " + fallback + " | no local hardware claim";
            return true;
        }

        public static string AnchorForShiyaoScene(string shiyaoSceneId, int markerImageIndex)
        {
            string scene = (shiyaoSceneId ?? string.Empty).Trim().ToLowerInvariant();
            if (scene == "campus_memory_wall" || scene == "innerworld_scene_a1_entry" || scene.Contains("a1") || markerImageIndex == 1)
            {
                return "A1";
            }
            if (scene == "whale_cloud" || scene == "innerworld_scene_a2_memory" || scene.Contains("a2") || markerImageIndex == 2)
            {
                return "A2";
            }
            if (scene == "task_board" || scene == "innerworld_scene_a3_writeback" || scene.Contains("a3") || markerImageIndex == 3)
            {
                return "A3";
            }
            return string.Empty;
        }

        private static string SceneIdForMarker(int markerImageIndex)
        {
            if (markerImageIndex == 1) return "campus_memory_wall";
            if (markerImageIndex == 2) return "whale_cloud";
            if (markerImageIndex == 3) return "task_board";
            return "unknown_marker_" + markerImageIndex;
        }

        private static bool IsP0Anchor(string anchorId)
        {
            return anchorId == "A1" || anchorId == "A2" || anchorId == "A3";
        }

        private static string Safe(string value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private static ISceneHandoffReceiver FindReceiver()
        {
#if UNITY_2023_1_OR_NEWER
            MonoBehaviour[] behaviours = UnityEngine.Object.FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None);
#else
            MonoBehaviour[] behaviours = UnityEngine.Object.FindObjectsOfType<MonoBehaviour>();
#endif
            foreach (MonoBehaviour behaviour in behaviours)
            {
                if (behaviour is ISceneHandoffReceiver receiver)
                {
                    return receiver;
                }
            }
            return null;
        }
    }
}
