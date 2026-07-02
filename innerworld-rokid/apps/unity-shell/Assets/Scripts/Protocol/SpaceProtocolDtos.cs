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
        public SpaceApiEndpoint session_plan;
        public SpaceApiEndpoint device_bootstrap;
        public SpaceApiEndpoint ai_schema;
        public SpaceApiEndpoint ai_prompt;
        public SpaceApiEndpoint ai_hud;
        public SpaceApiEndpoint space;
        public SpaceApiEndpoint state;
        public SpaceApiEndpoint nearby_pins;
        public SpaceApiEndpoint interactions;
        public SpaceApiEndpoint service_actions;
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
