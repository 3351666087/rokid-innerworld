using System;
using System.Collections.Generic;

namespace InnerWorld.Rokid.Runtime
{
    public static class InnerWorldEvidenceSchemas
    {
        public const string EvidenceChain = "innerworld-evidence-chain/v1";
        public const string SessionPlan = "innerworld-session-plan/v1";
    }

    [Serializable]
    public sealed class InnerWorldEvidenceChainResponse
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public string base_url;
        public InnerWorldEvidenceSpaceSummary space;
        public InnerWorldEvidenceMissionSummary mission;
        public InnerWorldEvidenceAnchorSummary[] anchors;
        public InnerWorldEvidenceBeaconCounts beacons;
        public InnerWorldEvidenceWriteBackSummary writeback;
        public InnerWorldEvidenceAiSummary ai;
        public InnerWorldEvidenceHardwareSummary hardware;
        public InnerWorldEvidenceReleaseSummary release;
        public InnerWorldEvidenceOperationsSummary operations;
        public InnerWorldEvidenceItem[] evidence_items;

        public bool IsSchemaCompatible
        {
            get { return string.Equals(schema, InnerWorldEvidenceSchemas.EvidenceChain, StringComparison.Ordinal); }
        }

        public bool IsReady
        {
            get
            {
                if (!ok || evidence_items == null || evidence_items.Length == 0)
                {
                    return false;
                }

                for (int index = 0; index < evidence_items.Length; index++)
                {
                    if (evidence_items[index] != null
                        && !string.Equals(evidence_items[index].status, "ready", StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }
                }

                return true;
            }
        }
    }

    [Serializable]
    public sealed class InnerWorldEvidenceSpaceSummary
    {
        public string space_id;
        public string name;
        public int version;
        public int anchor_count;
        public InnerWorldEvidenceGrid grid;
        public string[] layers;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceGrid
    {
        public int unit_cm;
        public string scope;
        public int width_units;
        public int height_units;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceMissionSummary
    {
        public string mission_id;
        public string title;
        public string state;
        public int current_step_index;
        public int step_count;
        public int completed_step_count;
        public string[] step_ids;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceAnchorSummary
    {
        public string anchor_id;
        public string label;
        public string kind;
        public string default_state;
        public InnerWorldEvidenceGridPosition grid_pos;
        public bool has_pose;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceGridPosition
    {
        public int x;
        public int y;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceBeaconCounts
    {
        public int total;
        public Dictionary<string, int> by_anchor;
        public Dictionary<string, int> by_layer;
        public string write_back_anchor_id;
        public int write_back_count;

        public InnerWorldEvidenceBeaconCounts()
        {
            by_anchor = new Dictionary<string, int>();
            by_layer = new Dictionary<string, int>();
        }
    }

    [Serializable]
    public sealed class InnerWorldEvidenceWriteBackSummary
    {
        public bool ready;
        public string anchor_id;
        public string step_id;
        public InnerWorldEvidenceEndpoint endpoint;
        public string[] review_visibility;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceAiSummary
    {
        public string schema_title;
        public InnerWorldEvidenceEndpoint schema_endpoint;
        public InnerWorldEvidenceEndpoint prompt_endpoint;
        public InnerWorldEvidenceEndpoint hud_endpoint;
        public int display_text_max_length;
        public string[] write_back_review_required;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceHardwareSummary
    {
        public string status;
        public string kit;
        public string fit;
        public string borrow_deadline;
        public InnerWorldEvidenceHardwareDevice[] devices;
        public string privacy;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceHardwareDevice
    {
        public string product_name;
        public string model;
        public int quantity;
        public string role;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceReleaseSummary
    {
        public string status;
        public InnerWorldEvidenceReleasePackages packages;
        public InnerWorldEvidenceReleaseIndex release_index;
        public InnerWorldEvidenceDeployDryRun deploy_dry_run;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceReleasePackages
    {
        public InnerWorldEvidencePackageStatus main_package;
        public InnerWorldEvidencePackageStatus server_package;
    }

    [Serializable]
    public sealed class InnerWorldEvidencePackageStatus
    {
        public bool exists;
        public string file;
        public string sha256;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceReleaseIndex
    {
        public bool ok;
        public string generated_at;
        public int warning_count;
        public int error_count;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceDeployDryRun
    {
        public bool ok;
        public string generated_at;
        public string zip_file;
        public string zip_sha256;
        public int warning_count;
        public int error_count;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceOperationsSummary
    {
        public bool ops_status_ok;
        public string local_url;
        public string device_bootstrap_url;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceItem
    {
        public string id;
        public string title;
        public string status;
        public string summary;
        public string source;

        public bool IsReady
        {
            get { return string.Equals(status, "ready", StringComparison.OrdinalIgnoreCase); }
        }
    }

    [Serializable]
    public sealed class InnerWorldEvidenceEndpoint
    {
        public string method;
        public string path;
        public string url;
    }

    [Serializable]
    public sealed class InnerWorldEvidenceEndpointMap
    {
        public InnerWorldEvidenceEndpoint health;
        public InnerWorldEvidenceEndpoint ops_status;
        public InnerWorldEvidenceEndpoint evidence_chain;
        public InnerWorldEvidenceEndpoint ledger_events;
        public InnerWorldEvidenceEndpoint ledger_summary;
        public InnerWorldEvidenceEndpoint session_plan;
        public InnerWorldEvidenceEndpoint device_bootstrap;
        public InnerWorldEvidenceEndpoint ai_schema;
        public InnerWorldEvidenceEndpoint ai_prompt;
        public InnerWorldEvidenceEndpoint ai_hud;
        public InnerWorldEvidenceEndpoint space;
        public InnerWorldEvidenceEndpoint state;
        public InnerWorldEvidenceEndpoint nearby_pins;
        public InnerWorldEvidenceEndpoint interactions;
        public InnerWorldEvidenceEndpoint service_actions;
        public InnerWorldEvidenceEndpoint write_back;
        public InnerWorldEvidenceEndpoint reset;
    }

    [Serializable]
    public sealed class InnerWorldSessionPlanResponse
    {
        public bool ok;
        public string schema;
        public string generated_at;
        public string space_id;
        public string title;
        public InnerWorldSessionStage[] stages;
        public string[] mission_step_ids;
        public InnerWorldEvidenceEndpointMap endpoints;
        public InnerWorldSessionAcceptanceTargets acceptance;

        public bool IsSchemaCompatible
        {
            get { return string.Equals(schema, InnerWorldEvidenceSchemas.SessionPlan, StringComparison.Ordinal); }
        }
    }

    [Serializable]
    public sealed class InnerWorldSessionStage
    {
        public string stage_id;
        public string label;
        public string goal;
        public string anchor_id;
        public string mission_step_id;
        public int estimated_seconds;
        public string success_signal;
        public string fallback_action;
    }

    [Serializable]
    public sealed class InnerWorldSessionAcceptanceTargets
    {
        public string initial_state;
        public int initial_beacons;
        public string completed_state;
        public int completed_steps;
        public int completed_beacons;
    }
}
