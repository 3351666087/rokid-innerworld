using System;
using UnityEngine;

namespace InnerWorld.Rokid.Concrete
{
    public interface ISceneHandoffReceiver
    {
        void EnterConcreteScene(SceneHandoffData data);
    }

    [Serializable]
    public struct SceneHandoffData
    {
        public string handoff_version;
        public string scene_id;
        public string anchor_id;
        public Vector3 anchor_position;
        public Quaternion anchor_rotation;
        public Vector3 wall_normal;
        public string origin_mode;
        public string event_id;
        public double gps_latitude;
        public double gps_longitude;
        public long entered_at_utc;
        public float confidence;
        public bool fallback;

        public static SceneHandoffData Fallback(string sceneId)
        {
            return new SceneHandoffData
            {
                handoff_version = "innerworld-shiyao-handoff/v1",
                scene_id = string.IsNullOrWhiteSpace(sceneId) ? "A1" : sceneId,
                anchor_id = "fallback_wall_anchor",
                anchor_position = new Vector3(0f, 1.35f, 2.4f),
                anchor_rotation = Quaternion.identity,
                wall_normal = Vector3.forward,
                origin_mode = "fallback",
                event_id = "innerworld_campus_wall",
                entered_at_utc = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                confidence = 0f,
                fallback = true
            };
        }
    }
}
