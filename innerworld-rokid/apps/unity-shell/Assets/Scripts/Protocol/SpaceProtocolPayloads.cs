using System;

namespace InnerWorld.Rokid.Protocol
{
    [Serializable]
    public sealed class InteractionRequest
    {
        public string source;
        public string session_id;
        public string device_id;
        public string anchor_id;
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
        public string session_id;
        public string device_id;
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
        public string source;
        public string session_id;
        public string device_id;
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
        public string pairing_code;
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
        public DeviceInputFramePayload input_frame;
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
    public sealed class DeviceInputFramePayload
    {
        public string schema;
        public string source;
        public long sequence;
        public float timestamp_seconds;
        public float delta_time_seconds;
        public string command;
        public bool gaze_select_down;
        public bool gaze_select_held;
        public bool confirm_down;
        public bool confirm_held;
        public bool back_down;
        public bool back_held;
        public bool anchor_hit;
        public string focused_anchor_id;
        public string focused_anchor_label;
        public float hit_distance_meters;
        public DeviceVector3 hit_point;
        public DeviceVector3 ray_origin;
        public DeviceVector3 ray_direction;
        public bool pointable_ui_focus;
        public bool voice_text_present;
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
        public RokidLiveAdapterChecklistReport adapter_checklist;
        public string[] candidate_assemblies;
        public string[] candidate_types;
        public string message;
    }

    [Serializable]
    public sealed class RokidLiveAdapterChecklistReport
    {
        public bool boundary_compiled;
        public bool package_detected;
        public bool rk_camera_rig_ready;
        public bool camera_rig_ready;
        public bool rk_input_3dof_ray_ready;
        public bool input_ray_ready;
        public bool pointable_ui_ready;
        public bool pointable_ui_curve_ready;
        public bool a1_entry_lock_ready;
        public bool entry_lock_ready;
        public bool qr_entry_lock_ready;
        public bool image_tracking_ready;
        public bool image_target_library_ready;
        public bool a2_a3_image_tracking_ready;
        public bool slam_head_tracking_ready;
        public bool slam_status_ready;
        public bool head_tracking_heartbeat_ready;
        public bool uxr_overlay_renderer_ready;
        public bool overlay_binding_ready;
        public bool trusted_hardware_proof_ready;
        public bool hardware_proof_ready;
        public bool performance_gate_ready;
        public bool fps_target_ready;
        public bool spatial_panels_readable;
    }
}
