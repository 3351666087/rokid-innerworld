using System;

namespace InnerWorld.Rokid.Protocol
{
    [Serializable]
    public sealed class InteractionRequest
    {
        public string source;
        public string user_id;
        public string step_id;
        public string mission_state;
    }

    [Serializable]
    public sealed class InteractionResponse
    {
        public bool ok;
        public RuntimeStateResponse state;
    }

    [Serializable]
    public sealed class AiHudRequest
    {
        public string anchor_id;
        public string user_action;
        public string mission_state;
        public string write_back_text;
    }

    [Serializable]
    public sealed class AiHudResponse
    {
        public string mission_state;
        public string display_text;
        public string hint_level;
        public ServiceActionReference service_action;
        public WriteBackReview write_back_review;
    }

    [Serializable]
    public sealed class ServiceActionReference
    {
        public string action_id;
        public string label;
    }

    [Serializable]
    public sealed class WriteBackReview
    {
        public string status;
        public string tag;
        public string summary;
        public string visibility;
    }

    [Serializable]
    public sealed class ServiceActionRequest
    {
        public string source;
        public string user_id;
        public string action_id;
        public string label;
        public string anchor_id;
        public string step_id;
    }

    [Serializable]
    public sealed class ServiceActionResponse
    {
        public bool ok;
        public ServiceActionRequest action;
        public ServiceActionRecord record;
        public ServiceActionOutboxRef outbox;
        public RuntimeStateResponse state;
    }

    [Serializable]
    public sealed class ServiceActionRecord
    {
        public string schema;
        public string action_record_id;
        public string action_id;
        public string status;
        public string space_id;
        public string mission_id;
        public string user_id;
        public string anchor_id;
        public string step_id;
        public string label;
        public int attempts;
        public string created_at;
        public string updated_at;
        public string acknowledged_at;
    }

    [Serializable]
    public sealed class ServiceActionOutboxRef
    {
        public string status;
        public string action_record_id;
    }

    [Serializable]
    public sealed class WriteBackRequest
    {
        public string user_id;
        public string anchor_id;
        public string title;
        public string text;
    }

    [Serializable]
    public sealed class WriteBackResponse
    {
        public bool ok;
        public SpaceBeacon beacon;
        public RuntimeStateResponse state;
    }

    [Serializable]
    public sealed class WallCalibrationObservationPayload
    {
        public string session_id;
        public string device_id;
        public string anchor_id;
        public string tracking_mode;
        public DevicePosePayload observed_pose;
        public float confidence;
        public string notes;
        public string client_time;
    }

    [Serializable]
    public sealed class DeviceRegisterRequest
    {
        public string profile;
        public string device_id;
        public string client_version;
        public string[] capabilities;
        public DeviceNetworkStatus network;
        public RokidSdkBindingStatusPayload sdk_binding_status;
    }

    [Serializable]
    public sealed class DeviceHeartbeatRequest
    {
        public string session_id;
        public string device_id;
        public DeviceBatteryStatus battery;
        public DeviceNetworkStatus network;
        public DevicePosePayload pose;
        public string active_anchor;
        public string current_user;
        public RokidSdkBindingStatusPayload sdk_binding_status;
    }

    [Serializable]
    public sealed class DeviceNetworkStatus
    {
        public bool online;
        public string transport;
        public int rtt_ms;
        public bool lan_reachable;
        public bool http_cleartext_allowed;
    }

    [Serializable]
    public sealed class DeviceBatteryStatus
    {
        public int level_percent;
        public bool charging;
        public float temperature_c;
    }

    [Serializable]
    public sealed class DevicePosePayload
    {
        public float confidence;
        public DeviceVector3 position;
        public DeviceQuaternion rotation;
    }

    [Serializable]
    public sealed class DeviceVector3
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class DeviceQuaternion
    {
        public float x;
        public float y;
        public float z;
        public float w;
    }

    [Serializable]
    public sealed class RokidSdkBindingStatusPayload
    {
        public string schema;
        public string source;
        public string define_symbol;
        public string stage;
        public bool boundary_compiled;
        public bool package_detected;
        public bool input_binding_ready;
        public bool overlay_binding_ready;
        public bool live_binding_ready;
        public string[] candidate_assemblies;
        public string[] candidate_types;
        public string message;
    }
}
