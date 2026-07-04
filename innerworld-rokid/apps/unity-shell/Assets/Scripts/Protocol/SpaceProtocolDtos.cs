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
        public SpaceApiEndpoint device_adapter_checklist;
        public SpaceApiEndpoint device_pairing;
        public SpaceApiEndpoint device_register;
        public SpaceApiEndpoint device_heartbeat;
        public SpaceApiEndpoint device_sessions;
        public SpaceApiEndpoint wall_calibration;
        public SpaceApiEndpoint wall_calibration_observations;
        public SpaceApiEndpoint field_markers;
        public SpaceApiEndpoint field_acceptance;
        public SpaceApiEndpoint field_target_readiness;
        public SpaceApiEndpoint field_operator_plan;
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
        public DevicePairingState pairing;
        public bool hardware_acceptance_eligible;
        public DeviceMissionSnapshot mission_snapshot;
        public DeviceRuntimeEnvelope runtime;
        public DeviceEndpointSubset endpoints;
        public DeviceWarning[] warnings;
        public DevicePrivacyPolicy privacy;
    }

    [Serializable]
    public sealed class DevicePairingState
    {
        public string schema;
        public string status;
        public bool paired;
        public bool required_for_hardware_acceptance;
        public string issued_at;
        public string paired_at;
        public string expires_at;
        public string method;
        public bool code_persisted;
        public string privacy;
    }

    [Serializable]
    public sealed class DeviceManifestResponse
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public string protocol_version;
        public string base_url;
        public string[] profiles;
        public DeviceRequiredCapability[] required_capabilities;
        public string[] optional_capabilities;
        public DeviceManifestNetworkRequirements network_requirements;
        public DeviceManifestUnityRuntimeHints unity_runtime_hints;
        public DeviceManifestRokidRuntimeHints rokid_runtime_hints;
        public DeviceAdapterSlot[] adapter_slots;
        public DeviceAdapterReadiness adapter_readiness;
        public DeviceA1SpatialEntryExperience a1_spatial_entry_experience;
        public RokidSdkBindingManifestStatus sdk_binding_status;
        public SpaceEndpointMap endpoints;
        public DeviceMissionSnapshot mission_snapshot;
        public DevicePollingDefaults polling_defaults;
    }

    [Serializable]
    public sealed class DeviceManifestNetworkRequirements
    {
        public string[] protocols;
        public string cors;
        public string cache_policy;
        public string default_host;
        public string lan_mode;
        public string cleartext_http;
        public string private_data_policy;
    }

    [Serializable]
    public sealed class DeviceManifestUnityRuntimeHints
    {
        public string scene_contract;
        public string bootstrap_first;
        public string register_before_polling;
        public string heartbeat_during_session;
        public string hud_schema_endpoint;
        public int display_text_max_length;
        public string[] suggested_components;
    }

    [Serializable]
    public sealed class DeviceManifestRokidRuntimeHints
    {
        public DeviceManifestRokidDeviceHint ra202;
        public DeviceManifestRokidDeviceHint ras201;
    }

    [Serializable]
    public sealed class DeviceManifestRokidDeviceHint
    {
        public string mount_role;
        public string[] expected_loop;
    }

    [Serializable]
    public sealed class DeviceAdapterSlot
    {
        public string slot_id;
        public string role;
        public string expected_owner;
        public string[] accepts;
        public string endpoint;
    }

    [Serializable]
    public sealed class DeviceAdapterReadiness
    {
        public string schema;
        public string status;
        public bool hardware_ready;
        public string summary;
        public DeviceAdapterChecklistItem[] checklist;
    }

    [Serializable]
    public sealed class DeviceAdapterChecklistItem
    {
        public string id;
        public string label;
        public string status;
        public string source;
        public string[] required_for;
        public string[] signals;
        public string summary;
    }

    [Serializable]
    public sealed class DeviceA1SpatialEntryExperience
    {
        public string schema;
        public string experience_id;
        public string anchor_id;
        public string lock_state;
        public string lock_label;
        public string entry_confirmation_status;
        public float confirmation_min_meters;
        public float confirmation_max_meters;
        public float confirmation_distance_meters;
        public string spatial_layer_transition_state;
        public string spatial_layer_transition_label;
        public string readiness;
        public bool fallback_claims_hardware_ready;
        public bool hardware_ready;
    }

    [Serializable]
    public sealed class RokidSdkBindingManifestStatus
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
        public RokidSdkClientReportContract client_report_contract;
    }

    [Serializable]
    public sealed class RokidSdkClientReportContract
    {
        public string field;
        public string[] accepted_on;
        public string[] stages;
        public string live_binding_rule;
        public string privacy;
    }

    [Serializable]
    public sealed class DevicePollingDefaults
    {
        public int heartbeat_ms;
        public int state_ms;
        public int action_ms;
        public int request_timeout_ms;
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
        public DevicePairingState pairing;
        public bool hardware_acceptance_eligible;
        public DeviceA1SpatialEntryExperience a1_spatial_entry_experience;
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
        public SpaceApiEndpoint field_markers;
        public SpaceApiEndpoint field_acceptance;
        public SpaceApiEndpoint field_target_readiness;
        public SpaceApiEndpoint field_operator_plan;
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
        public bool hardware_observation_trusted;
        public WallCalibrationHardwareSession hardware_session;
    }

    [Serializable]
    public sealed class WallCalibrationHardwareSession
    {
        public string schema;
        public bool trusted;
        public string trust_status;
        public string[] issues;
        public string session_id;
        public string device_id;
        public string anchor_id;
        public string tracking_mode;
        public string session_status_at_observation;
        public string session_last_seen_at;
        public int heartbeat_count_at_observation;
        public string active_anchor_at_observation;
        public string pairing_status_at_observation;
        public bool hardware_acceptance_eligible;
        public string sdk_binding_stage;
        public bool sdk_live_binding_ready;
        public bool sdk_input_binding_ready;
        public bool sdk_overlay_binding_ready;
        public bool sdk_package_detected;
        public bool sdk_boundary_compiled;
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
        public bool rehearsal_ready;
        public int hardware_calibrated_anchor_count;
        public string[] hardware_calibrated_anchor_ids;
        public string[] hardware_tracking_modes;
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
    public sealed class FieldMarkerManifest
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public string space_id;
        public FieldMarkerSourceOfTruth source_of_truth;
        public FieldMarkerPrintContract print_contract;
        public string public_url;
        public FieldMarkerCalibrationManifestSummary calibration_manifest;
        public FieldMarkerAnchor[] markers;
        public FieldMarkerAcceptance acceptance;
        public string privacy;
    }

    [Serializable]
    public sealed class FieldMarkerSourceOfTruth
    {
        public string space_seed;
        public string runtime_manifest;
        public string observation_endpoint;
    }

    [Serializable]
    public sealed class FieldMarkerPrintContract
    {
        public string paper;
        public int card_count;
        public string placement_scope;
        public bool cut_line_required;
        public string public_url_env;
        public string operator_rule;
    }

    [Serializable]
    public sealed class FieldMarkerCalibrationManifestSummary
    {
        public string schema;
        public string endpoint;
        public SpaceApiEndpoint observation_endpoint;
        public bool ready_for_hardware;
        public bool rehearsal_ready;
        public int hardware_calibrated_anchor_count;
        public string[] hardware_calibrated_anchor_ids;
        public string[] hardware_tracking_modes;
        public string[] calibrated_anchor_ids;
    }

    [Serializable]
    public sealed class FieldMarkerAnchor
    {
        public string anchor_id;
        public string label;
        public string kind;
        public GridPosition grid_pos;
        public WallCalibrationMarker marker;
        public string[] tracking_modes;
        public WallCalibrationPose expected_pose;
        public WallCalibrationAcceptance acceptance;
        public WallCalibrationObservation latest_observation;
        public FieldMarkerPrint print;
        public FieldMarkerRole field_role;
        public FieldMarkerImageTargetAsset image_target_asset;
    }

    [Serializable]
    public sealed class FieldMarkerPrint
    {
        public string title;
        public string payload_url;
        public string placement_note;
        public bool cut_line_required;
    }

    [Serializable]
    public sealed class FieldMarkerRole
    {
        public string physical_role;
        public string operator_action;
        public string evidence_source;
    }

    [Serializable]
    public sealed class FieldMarkerImageTargetAsset
    {
        public string asset_id;
        public string asset_path;
        public string sha256;
        public float physical_width_mm;
        public float physical_height_mm;
        public int dpi;
        public string print_version;
        public string unity_target_library_status;
        public string rokid_import_status;
    }

    [Serializable]
    public sealed class FieldMarkerAcceptance
    {
        public string[] required_anchor_ids;
        public string[] required_marker_ids;
        public string[] required_runtime_fields;
        public string[] pdf_tokens;
        public bool runtime_fields_bound_to_wall_calibration;
    }

    [Serializable]
    public sealed class FieldAcceptanceManifest
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public SpaceApiEndpoint endpoint;
        public string base_url;
        public string space_id;
        public string status;
        public bool ready;
        public FieldAcceptanceSummary summary;
        public FieldAcceptanceSourceOfTruth source_of_truth;
        public FieldAcceptanceGate[] gates;
        public FieldAcceptanceBlockingItem[] blocking_items;
        public string[] next_actions;
        public string[] hardware_modes_required;
        public string[] required_marker_ids;
        public string privacy;
        public FieldAcceptanceDebug debug;
    }

    [Serializable]
    public sealed class FieldAcceptanceSummary
    {
        public int ready_gates;
        public int warn_gates;
        public int pending_gates;
        public int blocked_gates;
        public bool ready_for_hardware;
        public int hardware_evidence_count;
        public bool all_simulator_ready_for_hardware;
        public bool simulator_rehearsal_is_not_hardware_ready;
    }

    [Serializable]
    public sealed class FieldAcceptanceSourceOfTruth
    {
        public SpaceApiEndpoint field_markers;
        public SpaceApiEndpoint wall_calibration;
        public SpaceApiEndpoint calibration_observations;
        public SpaceApiEndpoint mission_state;
        public SpaceApiEndpoint ledger_summary;
        public SpaceApiEndpoint ops_status;
        public SpaceApiEndpoint evidence_chain;
    }

    [Serializable]
    public sealed class FieldAcceptanceGate
    {
        public string id;
        public string label;
        public string title;
        public string status;
        public string summary;
        public string source;
        public string[] required;
        public string[] required_tracking_modes;
        public FieldAcceptanceGateEvidence evidence;
    }

    [Serializable]
    public sealed class FieldAcceptanceGateEvidence
    {
        public string schema;
        public string[] marker_ids;
        public int expected_pose_count;
        public string[] required_marker_ids;
        public bool runtime_fields_bound_to_wall_calibration;
        public bool rehearsal_ready;
        public int calibrated_anchor_count;
        public string[] calibrated_anchor_ids;
        public bool ready_for_hardware;
        public int hardware_calibrated_anchor_count;
        public string[] hardware_calibrated_anchor_ids;
        public string[] hardware_tracking_modes;
        public string mission_state;
        public string active_user;
        public string required_active_user;
        public string[] completed_steps;
        public string[] missing_steps;
        public int beacon_count;
        public int write_back_beacons;
        public bool user_b_readback_ready;
        public string engine;
        public int event_count;
        public bool release_index_ok;
        public bool deploy_dry_run_ok;
        public string release_generated_at;
        public string deploy_generated_at;
        public string fit;
        public string[] models;
        public string borrow_deadline;
    }

    [Serializable]
    public sealed class FieldAcceptanceBlockingItem
    {
        public string gate_id;
        public string title;
        public string summary;
    }

    [Serializable]
    public sealed class FieldAcceptanceDebug
    {
        public string[] gate_ids;
        public string[] required_anchor_ids;
        public string[] required_sources;
    }

    [Serializable]
    public sealed class FieldOperatorPlanManifest
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public SpaceApiEndpoint endpoint;
        public string space_id;
        public string current_phase;
        public int phase_index;
        public int total_phases;
        public string[] next_actions;
        public string[] blockers;
        public FieldOperatorPlanPhase[] phases;
        public FieldOperatorPlanPhaseRow[] phase_table;
        public FieldOperatorPlanReadiness readiness;
        public FieldOperatorPlanSanitizedSummary sanitized_summary;
        public FieldOperatorPlanSourceOfTruth source_of_truth;
        public FieldOperatorPlanPrivacy privacy;
        public FieldOperatorPlanScopeGuard scope_guard;
        public bool hardware_ready_claim_allowed;
    }

    [Serializable]
    public sealed class FieldOperatorPlanPhase
    {
        public string id;
        public string label;
        public string anchor_id;
        public string status;
        public string[] required_evidence;
        public string[] blockers;
        public string[] operator_actions;
        public bool mutates_state;
    }

    [Serializable]
    public sealed class FieldOperatorPlanPhaseRow
    {
        public int index;
        public string id;
        public string label;
        public string anchor_id;
        public string status;
        public bool mutates_state;
        public string[] required_evidence;
        public string[] blockers;
        public string[] operator_actions;
    }

    [Serializable]
    public sealed class FieldOperatorPlanReadiness
    {
        public bool precheck_ok;
        public bool physical_acceptance_ready;
        public bool live_session_ready;
        public bool trusted_a1_a2_a3_ready;
        public bool mission_loop_ready;
        public bool user_b_readback_ready;
        public bool release_ready;
        public bool hardware_ready_claim_allowed;
    }

    [Serializable]
    public sealed class FieldOperatorPlanSanitizedSummary
    {
        public int hardware_anchor_count;
        public int trusted_anchor_count;
        public string[] missing_trusted_anchor_ids;
        public int paired_session_count;
        public int live_sdk_session_count;
        public string mission_state;
        public int completed_step_count;
        public int write_back_beacon_count;
        public string field_acceptance_status;
    }

    [Serializable]
    public sealed class FieldOperatorPlanSourceOfTruth
    {
        public string field_acceptance;
        public string field_target_readiness;
        public string device_adapter_checklist;
        public string device_sessions;
        public string wall_calibration;
        public string mission_state;
        public string ops_status;
    }

    [Serializable]
    public sealed class FieldOperatorPlanPrivacy
    {
        public bool read_only_endpoint;
        public bool mission_state_mutated;
        public bool evidence_files_written;
        public bool simulator_or_manual_observations_created;
        public bool adb_or_logcat_run;
        public bool raw_serials_included;
        public bool usb_ids_included;
        public bool raw_session_ids_included;
        public bool session_ids_included;
        public bool raw_device_ids_included;
        public bool device_ids_included;
        public bool private_ips_included;
        public bool raw_pairing_codes_included;
        public bool pairing_codes_included;
        public bool raw_pose_or_ray_included;
        public bool raw_logcat_included;
        public bool raw_logcat_or_dumpsys_included;
        public bool field_operator_plan_report_written;
    }

    [Serializable]
    public sealed class FieldOperatorPlanScopeGuard
    {
        public bool p0_only;
        public bool campus_wall_only;
        public bool a1_a2_a3_user_b_only;
        public bool guide_app_or_ppt;
        public bool phone_page;
        public bool open_ugc;
        public bool backend_expansion;
        public bool broad_route;
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
