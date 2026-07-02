using System;

namespace InnerWorld.Rokid.Protocol
{
    [Serializable]
    public sealed class DeviceBootstrapResponse
    {
        public bool ok;
        public string protocol_version;
        public string generated_at;
        public string profile;
        public string service;
        public string base_url;
        public BootstrapSpace space;
        public SpaceAnchor[] anchors;
        public BootstrapMission mission;
        public BootstrapRuntime runtime;
        public SpaceEndpointMap endpoints;
        public BootstrapAiContract ai;
        public ClientHints client_hints;
        public UnityCompat unity_compat;
        public AcceptanceTargets acceptance;
    }

    [Serializable]
    public sealed class BootstrapSpace
    {
        public string space_id;
        public string name;
        public int version;
        public SpaceEntry entry;
        public SpaceGrid grid;
        public string[] layers;
        public DisplayRule display_rule;
    }

    [Serializable]
    public sealed class SpaceEntry
    {
        public string type;
        public string label;
        public string url;
    }

    [Serializable]
    public sealed class SpaceGrid
    {
        public int unit_cm;
        public string scope;
        public int width_units;
        public int height_units;
    }

    [Serializable]
    public sealed class DisplayRule
    {
        public int max_lines;
        public int max_chars_per_line;
        public bool low_distraction;
        public float default_opacity;
    }

    [Serializable]
    public sealed class SpaceAnchor
    {
        public string anchor_id;
        public string label;
        public string kind;
        public SpacePose pose;
        public GridPosition grid_pos;
        public string default_state;
    }

    [Serializable]
    public sealed class SpacePose
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class GridPosition
    {
        public int x;
        public int y;
    }

    [Serializable]
    public sealed class BootstrapMission
    {
        public string mission_id;
        public string title;
        public string state;
        public int current_step_index;
        public MissionStep[] steps;
    }

    [Serializable]
    public sealed class MissionStep
    {
        public string step_id;
        public string label;
        public string anchor_id;
        public string hint;
    }

    [Serializable]
    public sealed class BootstrapRuntime
    {
        public string active_user;
        public string mission_state;
        public string[] completed_steps;
        public int beacon_count;
    }

    [Serializable]
    public sealed class SpaceEndpointMap
    {
        public SpaceApiEndpoint health;
        public SpaceApiEndpoint ops_status;
        public SpaceApiEndpoint evidence_chain;
        public SpaceApiEndpoint ledger_events;
        public SpaceApiEndpoint ledger_summary;
        public SpaceApiEndpoint session_plan;
        public SpaceApiEndpoint device_bootstrap;
        public SpaceApiEndpoint device_manifest;
        public SpaceApiEndpoint device_register;
        public SpaceApiEndpoint device_heartbeat;
        public SpaceApiEndpoint device_sessions;
        public SpaceApiEndpoint wall_calibration;
        public SpaceApiEndpoint wall_calibration_observations;
        public SpaceApiEndpoint ai_schema;
        public SpaceApiEndpoint ai_prompt;
        public SpaceApiEndpoint ai_hud;
        public SpaceApiEndpoint space;
        public SpaceApiEndpoint state;
        public SpaceApiEndpoint nearby_pins;
        public SpaceApiEndpoint interactions;
        public SpaceApiEndpoint service_actions;
        public SpaceApiEndpoint service_actions_outbox;
        public SpaceApiEndpoint service_action_ack_template;
        public SpaceApiEndpoint write_back;
        public SpaceApiEndpoint reset;
    }

    [Serializable]
    public sealed class SpaceApiEndpoint
    {
        public string method;
        public string path;
        public string url;
    }

    [Serializable]
    public sealed class BootstrapAiContract
    {
        public string output_schema_title;
        public string output_schema_url;
        public string prompt_url;
        public int display_text_max_length;
    }

    [Serializable]
    public sealed class ClientHints
    {
        public int poll_interval_ms;
        public int health_interval_ms;
        public int request_timeout_ms;
        public string json_cache_policy;
        public bool cleartext_http_required_for_lan;
        public string write_back_anchor_id;
    }

    [Serializable]
    public sealed class UnityCompat
    {
        public UnityCompatConfig config;
    }

    [Serializable]
    public sealed class UnityCompatConfig
    {
        public string base_url;
        public string space_id;
    }

    [Serializable]
    public sealed class AcceptanceTargets
    {
        public string initial_state;
        public int initial_beacons;
        public string completed_state;
        public int completed_steps;
        public int completed_beacons;
    }

    [Serializable]
    public sealed class SpaceSnapshotResponse
    {
        public string space_id;
        public string name;
        public int version;
        public SpaceEntry entry;
        public SpaceGrid grid;
        public string[] layers;
        public SpaceAnchor[] anchors;
        public SpaceBeacon[] beacons;
        public SnapshotMission mission;
        public SnapshotRuntime runtime;
        public DisplayRule display_rule;
        public SpaceFallback fallback;
        public ServiceAction[] service_actions;
    }

    [Serializable]
    public sealed class SnapshotMission
    {
        public string mission_id;
        public string state;
        public string title;
        public MissionStep[] steps;
        public string expected_answer;
    }

    [Serializable]
    public sealed class SnapshotRuntime
    {
        public string active_user;
        public string mission_state;
        public int current_step_index;
        public string[] completed_steps;
    }

    [Serializable]
    public sealed class SpaceBeacon
    {
        public string beacon_id;
        public string anchor_id;
        public string layer;
        public string title;
        public string body;
        public string display_text;
        public string source;
        public string created_at;
    }

    [Serializable]
    public sealed class SpaceFallback
    {
        public string mode;
        public string data;
    }

    [Serializable]
    public sealed class ServiceAction
    {
        public string action_id;
        public string label;
        public string status;
    }

    [Serializable]
    public sealed class RuntimeStateResponse
    {
        public string booted_at;
        public string active_user;
        public string mission_state;
        public int current_step_index;
        public string[] completed_steps;
        public SpaceBeacon[] beacons;
        public RuntimeEvent[] events;
    }

    [Serializable]
    public sealed class RuntimeEvent
    {
        public string event_id;
        public string type;
        public string created_at;
    }

    [Serializable]
    public sealed class LedgerEventsResponse
    {
        public bool ok;
        public string generated_at;
        public string cursor;
        public LedgerEvent[] events;
    }

    [Serializable]
    public sealed class LedgerEvent
    {
        public string event_id;
        public string ledger;
        public string type;
        public string mission_id;
        public string step_id;
        public string action_id;
        public string anchor_id;
        public string user_id;
        public string status;
        public string summary;
        public string source;
        public string created_at;
        public ServiceActionReference service_action;
    }

    [Serializable]
    public sealed class LedgerSummaryResponse
    {
        public bool ok;
        public string generated_at;
        public string mission_id;
        public LedgerMissionSummary mission;
        public LedgerServiceActionSummary service_actions;
        public LedgerAuditSummary audit;
    }

    [Serializable]
    public sealed class LedgerMissionSummary
    {
        public string state;
        public int current_step_index;
        public int completed_step_count;
        public string[] completed_steps;
        public string last_event_at;
    }

    [Serializable]
    public sealed class LedgerServiceActionSummary
    {
        public int total;
        public int pending;
        public int completed;
        public int acknowledged;
        public int failed;
        public int cancelled;
        public int outbox_total;
        public string last_action_id;
        public string last_action_at;
    }

    [Serializable]
    public sealed class DeviceRuntimeSessionResponse
    {
        public bool ok;
        public string protocol_version;
        public string session_id;
        public string device_id;
        public string profile;
        public string server_time;
        public DeviceCapabilityStatus capabilities;
        public RokidSdkBindingStatusPayload sdk_binding_status;
        public DeviceMissionSnapshot mission_snapshot;
        public DeviceRuntimeEnvelope runtime;
        public DeviceEndpointSubset endpoints;
        public DeviceWarning[] warnings;
        public DevicePrivacyPolicy privacy;
    }

    [Serializable]
    public sealed class DeviceHeartbeatResponse
    {
        public bool ok;
        public string protocol_version;
        public string session_id;
        public string device_id;
        public string server_time;
        public DeviceMissionSnapshot mission_snapshot;
        public DevicePendingAction[] pending_actions;
        public DeviceHealthStatus health;
        public RokidSdkBindingStatusPayload sdk_binding_status;
        public DeviceRuntimeEnvelope runtime;
        public DeviceEndpointSubset endpoints;
        public int next_poll_ms;
    }

    [Serializable]
    public sealed class DeviceCapabilityStatus
    {
        public DeviceRequiredCapability[] required;
        public string[] declared;
        public string[] missing_required;
        public bool ok;
    }

    [Serializable]
    public sealed class DeviceRequiredCapability
    {
        public string id;
        public string label;
        public string[] required_for;
        public string reason;
        public bool present;
    }

    [Serializable]
    public sealed class DeviceMissionSnapshot
    {
        public string space_id;
        public string space_version;
        public string mission_id;
        public string title;
        public string state;
        public int current_step_index;
        public DeviceMissionStep current_step;
        public DeviceMissionStep next_step;
        public string[] completed_steps;
        public string active_user;
        public DeviceAnchorSummary active_anchor;
        public DeviceAnchorSummary[] anchors;
        public int beacon_count;
    }

    [Serializable]
    public sealed class DeviceMissionStep
    {
        public string step_id;
        public string label;
        public string anchor_id;
        public string hint;
    }

    [Serializable]
    public sealed class DeviceAnchorSummary
    {
        public string anchor_id;
        public string label;
        public string kind;
        public string default_state;
        public GridPosition grid_pos;
        public bool has_pose;
    }

    [Serializable]
    public sealed class DeviceRuntimeEnvelope
    {
        public string session_status;
        public string expires_at;
        public DeviceRuntimeSnapshot snapshot;
    }

    [Serializable]
    public sealed class DeviceRuntimeSnapshot
    {
        public bool ok;
        public bool restored;
        public string path;
        public string snapshot_path;
        public string generated_at;
        public bool disabled;
    }

    [Serializable]
    public sealed class DeviceEndpointSubset
    {
        public SpaceApiEndpoint health;
        public SpaceApiEndpoint heartbeat;
        public SpaceApiEndpoint state;
        public SpaceApiEndpoint space;
        public SpaceApiEndpoint wall_calibration;
        public SpaceApiEndpoint wall_calibration_observations;
        public SpaceApiEndpoint ai_hud;
        public SpaceApiEndpoint interactions;
        public SpaceApiEndpoint service_actions;
        public SpaceApiEndpoint write_back;
    }

    [Serializable]
    public sealed class DeviceWarning
    {
        public string code;
        public string severity;
        public string message;
    }

    [Serializable]
    public sealed class DevicePrivacyPolicy
    {
        public string stored;
        public string[] omitted;
    }

    [Serializable]
    public sealed class DevicePendingAction
    {
        public string action_id;
        public string priority;
        public string label;
        public string[] missing;
        public string binding_stage;
        public string step_id;
        public string anchor_id;
    }

    [Serializable]
    public sealed class DeviceHealthStatus
    {
        public string severity;
        public DeviceBatteryStatus battery;
        public DeviceNetworkStatus network;
        public string pose_status;
        public bool active_anchor_known;
        public string[] missing_required_capabilities;
        public RokidSdkBindingStatusPayload sdk_binding_status;
    }

    [Serializable]
    public sealed class LedgerAuditSummary
    {
        public int event_count;
        public string first_event_at;
        public string last_event_at;
        public string[] sources;
    }

    [Serializable]
    public sealed class WallCalibrationManifest
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public string space_id;
        public WallCalibrationSurface wall;
        public WallCalibrationAnchor[] anchors;
        public WallCalibrationProcedureStep[] procedure;
        public SpaceApiEndpoint observation_endpoint;
        public WallCalibrationRuntime runtime;
        public string privacy;
    }

    [Serializable]
    public sealed class WallCalibrationSurface
    {
        public string coordinate_system;
        public string origin_anchor_id;
        public string forward_axis;
        public string up_axis;
        public string right_axis;
        public string units;
        public WallCalibrationDimensions dimensions;
        public SpaceGrid grid;
        public string physical_scope;
    }

    [Serializable]
    public sealed class WallCalibrationDimensions
    {
        public float unit_cm;
        public float width_m;
        public float height_m;
        public string scope;
    }

    [Serializable]
    public sealed class WallCalibrationAnchor
    {
        public string anchor_id;
        public string label;
        public string kind;
        public GridPosition grid_pos;
        public WallCalibrationPose expected_pose;
        public WallCalibrationMarker marker;
        public WallCalibrationAcceptance acceptance;
        public WallCalibrationObservation latest_observation;
    }

    [Serializable]
    public sealed class WallCalibrationPose
    {
        public DeviceVector3 position;
        public DeviceQuaternion rotation;
    }

    [Serializable]
    public sealed class WallCalibrationMarker
    {
        public string marker_id;
        public string marker_type;
        public string detection_priority;
    }

    [Serializable]
    public sealed class WallCalibrationAcceptance
    {
        public float confidence_min;
        public float position_error_warn_m;
        public float position_error_reject_m;
    }

    [Serializable]
    public sealed class WallCalibrationProcedureStep
    {
        public string step_id;
        public string label;
        public string anchor_id;
        public string evidence;
    }

    [Serializable]
    public sealed class WallCalibrationRuntime
    {
        public string mission_state;
        public string active_user;
        public WallCalibrationSummary summary;
    }

    [Serializable]
    public sealed class WallCalibrationSummary
    {
        public bool ok;
        public string schema;
        public WallCalibrationCounts counts;
        public int total;
        public int accepted;
        public int warning;
        public int rejected;
        public int calibrated_anchor_count;
        public string[] calibrated_anchor_ids;
        public bool ready_for_hardware;
        public WallCalibrationObservation[] latest;
        public string privacy;
    }

    [Serializable]
    public sealed class WallCalibrationCounts
    {
        public int total;
        public int accepted;
        public int warning;
        public int rejected;
    }

    [Serializable]
    public sealed class WallCalibrationObservationResult
    {
        public bool ok;
        public WallCalibrationObservation observation;
        public WallCalibrationSummary summary;
    }

    [Serializable]
    public sealed class WallCalibrationObservation
    {
        public bool ok;
        public string schema;
        public string observation_id;
        public string status;
        public string[] issues;
        public string space_id;
        public string anchor_id;
        public string tracking_mode;
        public string session_id;
        public string device_id;
        public WallCalibrationPose observed_pose;
        public WallCalibrationPose expected_pose;
        public float confidence;
        public float position_error_m;
        public string notes;
        public string client_time;
        public string created_at;
        public WallCalibrationAcceptance acceptance;
        public string privacy;
    }

    [Serializable]
    public sealed class NearbyPinsResponse
    {
        public string space_id;
        public float radius_m;
        public NearbyPin[] pins;
    }

    [Serializable]
    public sealed class NearbyPin
    {
        public string anchor_id;
        public string label;
        public string kind;
        public SpacePose pose;
        public GridPosition grid_pos;
        public string default_state;
        public SpaceBeacon[] beacons;
    }
}
