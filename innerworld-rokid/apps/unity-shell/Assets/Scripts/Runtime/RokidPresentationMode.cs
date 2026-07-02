using System;

namespace InnerWorld.Rokid.Runtime
{
    public enum RokidPresentationMode
    {
        Auto,
        RokidGlasses,
        OnSiteDisplay,
        DesktopFallback
    }

    public enum RokidInputAdapterKind
    {
        None,
        RokidSdk,
        EditorSimulator,
        TouchOrMouse
    }

    public enum RokidDisplayAdapterKind
    {
        None,
        RokidSdkOverlay,
        WorldSpaceHud,
        DesktopHud
    }

    public static class RokidSpatialEntryStates
    {
        public const string Disabled = "disabled";
        public const string SimulatedWall = "simulated_wall";
        public const string MarkerAssisted = "marker_assisted";
        public const string A1EntryConfirmed = "a1_entry_confirmed";
        public const string HardwareAnchored = "hardware_anchored";
    }

    public static class RokidA1SpatialEntryStates
    {
        public const string WaitingForA1 = "a1_entry_waiting";
        public const string LockCandidate = "a1_lock_candidate";
        public const string DeliberateConfirmed = "a1_deliberate_confirmation";
        public const string SpatialLayerStandby = "spatial_layer_standby";
        public const string SpatialLayerOpening = "spatial_layer_opening";
        public const string SpatialLayerOpen = "spatial_layer_open";
    }

    public static class RokidImageTargetLockStates
    {
        public const string Unavailable = "unavailable";
        public const string Searching = "searching";
        public const string Simulated = "simulated";
        public const string Candidate = "candidate";
        public const string Locked = "locked";
    }

    public static class RokidDiscoveryLayerStates
    {
        public const string Off = "off";
        public const string Passive = "passive";
        public const string Radar = "radar";
        public const string Guided = "guided";
    }

    public static class RokidWritebackReadinessStates
    {
        public const string Disabled = "disabled";
        public const string DraftOnly = "draft_only";
        public const string OperatorReview = "operator_review";
        public const string Ready = "ready";
    }

    public static class RokidDeviceSafetyModes
    {
        public const string SimulatorSafe = "operator_safe_simulator";
        public const string OperatorSafeDevice = "operator_safe_device";
        public const string HardwareGuarded = "hardware_guarded";
    }

    public static class RokidPresentationModes
    {
        public const string Auto = "auto";
        public const string RokidGlasses = "rokid_glasses";
        public const string OnSiteDisplay = "on_site_display";
        public const string DesktopFallback = "desktop_fallback";

        public static RokidPresentationMode Parse(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return RokidPresentationMode.Auto;
            }

            string clean = value.Trim();
            if (EqualsAny(clean, "rokid", "rokid-ar", "rokid_glasses", "glasses", "hardware"))
            {
                return RokidPresentationMode.RokidGlasses;
            }

            if (EqualsAny(clean, "site", "on_site", "on_site_display", "field", "field_display"))
            {
                return RokidPresentationMode.OnSiteDisplay;
            }

            if (EqualsAny(clean, "desktop", "desktop_fallback", "editor", "windows", "fallback"))
            {
                return RokidPresentationMode.DesktopFallback;
            }

            return RokidPresentationMode.Auto;
        }

        public static string ToConfigValue(RokidPresentationMode mode)
        {
            switch (mode)
            {
                case RokidPresentationMode.RokidGlasses:
                    return RokidGlasses;
                case RokidPresentationMode.OnSiteDisplay:
                    return OnSiteDisplay;
                case RokidPresentationMode.DesktopFallback:
                    return DesktopFallback;
                default:
                    return Auto;
            }
        }

        public static bool IsFallback(RokidPresentationMode mode)
        {
            return mode == RokidPresentationMode.DesktopFallback || mode == RokidPresentationMode.OnSiteDisplay;
        }

        private static bool EqualsAny(string value, params string[] options)
        {
            for (int index = 0; index < options.Length; index++)
            {
                if (string.Equals(value, options[index], StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }

    [Serializable]
    public sealed class RokidPresentationEnvironment
    {
        public bool is_android;
        public bool is_editor;
        public bool has_rokid_sdk;
        public bool has_openxr;
        public bool has_lan_server;
        public bool force_desktop_controls;

        public static RokidPresentationEnvironment Create(
            bool isAndroid,
            bool isEditor,
            bool hasRokidSdk,
            bool hasOpenXr,
            bool hasLanServer,
            bool forceDesktopControls)
        {
            return new RokidPresentationEnvironment
            {
                is_android = isAndroid,
                is_editor = isEditor,
                has_rokid_sdk = hasRokidSdk,
                has_openxr = hasOpenXr,
                has_lan_server = hasLanServer,
                force_desktop_controls = forceDesktopControls
            };
        }
    }

    [Serializable]
    public sealed class RokidPresentationStrategy
    {
        public RokidPresentationMode mode;
        public RokidInputAdapterKind input_adapter;
        public RokidDisplayAdapterKind display_adapter;
        public bool use_spatial_anchors;
        public bool use_gaze_pointer;
        public bool use_voice_input;
        public bool low_distraction_hud;
        public bool allow_desktop_shortcuts;
        public string sdk_adapter_name;
        public string fallback_reason;
        public string experience_tier;
        public string shell_status_label;
        public string a1_spatial_entry_experience;
        public string a1_entry_lock_state;
        public string a1_entry_lock_label;
        public string entry_confirmation_status;
        public float entry_confirmation_min_meters;
        public float entry_confirmation_max_meters;
        public string spatial_layer_transition_state;
        public string spatial_layer_transition_label;
        public bool fallback_claims_hardware_ready;
        public string spatial_entry_state;
        public string spatial_entry_label;
        public string image_target_lock_state;
        public string image_target_lock_label;
        public float image_target_lock_quality;
        public string discovery_layer_state;
        public string discovery_layer_label;
        public string writeback_readiness_state;
        public string writeback_readiness_label;
        public string device_safety_mode;
        public string device_safety_label;
        public bool operator_safe_device_mode;
        public bool enable_spatial_entry;
        public bool enable_image_target_lock;
        public bool enable_discovery_radar;
        public bool writeback_operator_review;
        public RokidPresentationMetric[] premium_metrics;

        public bool RequiresRokidSdk
        {
            get { return input_adapter == RokidInputAdapterKind.RokidSdk || display_adapter == RokidDisplayAdapterKind.RokidSdkOverlay; }
        }

        public bool IsFallback
        {
            get { return RokidPresentationModes.IsFallback(mode); }
        }

        public string PremiumStatusLine
        {
            get
            {
                if (!string.IsNullOrWhiteSpace(shell_status_label))
                {
                    return shell_status_label;
                }

                return "AR shell | " + Clean(spatial_entry_label) + " | " + Clean(a1_entry_lock_label) + " | " + Clean(image_target_lock_label);
            }
        }

        public static RokidPresentationStrategy Resolve(string configuredMode, RokidPresentationEnvironment environment)
        {
            return Resolve(RokidPresentationModes.Parse(configuredMode), environment);
        }

        public static RokidPresentationStrategy Resolve(RokidPresentationMode configuredMode, RokidPresentationEnvironment environment)
        {
            RokidPresentationEnvironment env = environment ?? new RokidPresentationEnvironment();
            RokidPresentationMode mode = configuredMode;

            if (mode == RokidPresentationMode.Auto)
            {
                if (env.has_rokid_sdk && env.is_android && !env.force_desktop_controls)
                {
                    mode = RokidPresentationMode.RokidGlasses;
                }
                else if (env.is_android && !env.is_editor)
                {
                    mode = RokidPresentationMode.OnSiteDisplay;
                }
                else
                {
                    mode = RokidPresentationMode.DesktopFallback;
                }
            }

            if (mode == RokidPresentationMode.RokidGlasses)
            {
                if (env.has_rokid_sdk && !env.force_desktop_controls)
                {
                    return BuildRokidGlassesStrategy();
                }

                RokidPresentationStrategy fallback = BuildDesktopFallbackStrategy();
                fallback.fallback_reason = "Rokid SDK adapter is not available yet.";
                return fallback;
            }

            if (mode == RokidPresentationMode.OnSiteDisplay)
            {
                return BuildOnSiteDisplayStrategy(env);
            }

            return BuildDesktopFallbackStrategy();
        }

        private static RokidPresentationStrategy BuildRokidGlassesStrategy()
        {
            return new RokidPresentationStrategy
            {
                mode = RokidPresentationMode.RokidGlasses,
                input_adapter = RokidInputAdapterKind.RokidSdk,
                display_adapter = RokidDisplayAdapterKind.RokidSdkOverlay,
                use_spatial_anchors = true,
                use_gaze_pointer = true,
                use_voice_input = true,
                low_distraction_hud = true,
                allow_desktop_shortcuts = false,
                sdk_adapter_name = "Rokid AR Studio adapter",
                fallback_reason = string.Empty,
                experience_tier = "Rokid spatial hardware",
                shell_status_label = "Rokid spatial shell | image-target lock | operator-safe hardware",
                a1_spatial_entry_experience = "a1_spatial_entry_experience",
                a1_entry_lock_state = RokidA1SpatialEntryStates.SpatialLayerOpen,
                a1_entry_lock_label = "A1 lock: hardware-anchored entry after operator confirmation",
                entry_confirmation_status = "entry_confirmation_hardware_accepted",
                entry_confirmation_min_meters = 0.4f,
                entry_confirmation_max_meters = 0.5f,
                spatial_layer_transition_state = RokidA1SpatialEntryStates.SpatialLayerOpen,
                spatial_layer_transition_label = "开启空间层: hardware spatial layer active",
                fallback_claims_hardware_ready = false,
                spatial_entry_state = RokidSpatialEntryStates.HardwareAnchored,
                spatial_entry_label = "Spatial entry: calibrated Rokid glasses",
                image_target_lock_state = RokidImageTargetLockStates.Locked,
                image_target_lock_label = "Image targets: hardware lock ready",
                image_target_lock_quality = 0.92f,
                discovery_layer_state = RokidDiscoveryLayerStates.Radar,
                discovery_layer_label = "Discovery layer: live radar with anchored hotspots",
                writeback_readiness_state = RokidWritebackReadinessStates.OperatorReview,
                writeback_readiness_label = "Writeback: operator-reviewed service handoff",
                device_safety_mode = RokidDeviceSafetyModes.OperatorSafeDevice,
                device_safety_label = "Device mode: operator-safe Rokid hardware",
                operator_safe_device_mode = true,
                enable_spatial_entry = true,
                enable_image_target_lock = true,
                enable_discovery_radar = true,
                writeback_operator_review = true,
                premium_metrics = BuildPremiumMetrics(
                    1f,
                    0.92f,
                    1f,
                    0.88f,
                    1f,
                    RokidSpatialEntryStates.HardwareAnchored,
                    RokidImageTargetLockStates.Locked,
                    RokidWritebackReadinessStates.OperatorReview,
                    RokidDeviceSafetyModes.OperatorSafeDevice)
            };
        }

        private static RokidPresentationStrategy BuildOnSiteDisplayStrategy(RokidPresentationEnvironment environment)
        {
            bool hasOpenXr = environment != null && environment.has_openxr;
            return new RokidPresentationStrategy
            {
                mode = RokidPresentationMode.OnSiteDisplay,
                input_adapter = RokidInputAdapterKind.TouchOrMouse,
                display_adapter = RokidDisplayAdapterKind.WorldSpaceHud,
                use_spatial_anchors = hasOpenXr,
                use_gaze_pointer = true,
                use_voice_input = false,
                low_distraction_hud = true,
                allow_desktop_shortcuts = true,
                sdk_adapter_name = string.Empty,
                fallback_reason = "On-site display is running the exhibition AR shell with hardware-only actions guarded.",
                experience_tier = "Exhibition wall AR",
                shell_status_label = "Exhibition wall shell | marker-assisted entry | operator-safe display",
                a1_spatial_entry_experience = "a1_spatial_entry_experience",
                a1_entry_lock_state = RokidA1SpatialEntryStates.LockCandidate,
                a1_entry_lock_label = "A1 lock: marker-assisted candidate, confirm at 0.4m-0.5m",
                entry_confirmation_status = "entry_confirmation_pending",
                entry_confirmation_min_meters = 0.4f,
                entry_confirmation_max_meters = 0.5f,
                spatial_layer_transition_state = RokidA1SpatialEntryStates.SpatialLayerStandby,
                spatial_layer_transition_label = "开启空间层 waits for deliberate A1 confirmation; fallback is not hardware ready",
                fallback_claims_hardware_ready = false,
                spatial_entry_state = hasOpenXr ? RokidSpatialEntryStates.MarkerAssisted : RokidSpatialEntryStates.SimulatedWall,
                spatial_entry_label = hasOpenXr ? "Spatial entry: OpenXR marker-assisted wall" : "Spatial entry: calibrated wall rehearsal",
                image_target_lock_state = hasOpenXr ? RokidImageTargetLockStates.Candidate : RokidImageTargetLockStates.Simulated,
                image_target_lock_label = hasOpenXr ? "Image targets: candidate lock with wall markers" : "Image targets: simulated lock against print kit",
                image_target_lock_quality = hasOpenXr ? 0.76f : 0.62f,
                discovery_layer_state = RokidDiscoveryLayerStates.Radar,
                discovery_layer_label = "Discovery layer: radar sweep over exhibit anchors",
                writeback_readiness_state = RokidWritebackReadinessStates.OperatorReview,
                writeback_readiness_label = "Writeback: operator review required before commit",
                device_safety_mode = RokidDeviceSafetyModes.HardwareGuarded,
                device_safety_label = "Device mode: operator-safe display with hardware guard",
                operator_safe_device_mode = true,
                enable_spatial_entry = true,
                enable_image_target_lock = true,
                enable_discovery_radar = true,
                writeback_operator_review = true,
                premium_metrics = BuildPremiumMetrics(
                    hasOpenXr ? 0.82f : 0.68f,
                    hasOpenXr ? 0.76f : 0.62f,
                    0.86f,
                    0.72f,
                    1f,
                    hasOpenXr ? RokidSpatialEntryStates.MarkerAssisted : RokidSpatialEntryStates.SimulatedWall,
                    hasOpenXr ? RokidImageTargetLockStates.Candidate : RokidImageTargetLockStates.Simulated,
                    RokidWritebackReadinessStates.OperatorReview,
                    RokidDeviceSafetyModes.HardwareGuarded)
            };
        }

        private static RokidPresentationStrategy BuildDesktopFallbackStrategy()
        {
            return new RokidPresentationStrategy
            {
                mode = RokidPresentationMode.DesktopFallback,
                input_adapter = RokidInputAdapterKind.EditorSimulator,
                display_adapter = RokidDisplayAdapterKind.DesktopHud,
                use_spatial_anchors = false,
                use_gaze_pointer = true,
                use_voice_input = false,
                low_distraction_hud = false,
                allow_desktop_shortcuts = true,
                sdk_adapter_name = string.Empty,
                fallback_reason = "Desktop simulator is running the exhibition AR shell with hardware-only actions guarded.",
                experience_tier = "Premium simulator",
                shell_status_label = "Premium simulator shell | spatial rehearsal | operator-safe controls",
                a1_spatial_entry_experience = "a1_spatial_entry_experience",
                a1_entry_lock_state = RokidA1SpatialEntryStates.WaitingForA1,
                a1_entry_lock_label = "A1 lock: desktop fallback rehearsal, confirm at 0.4m-0.5m",
                entry_confirmation_status = "entry_confirmation_pending",
                entry_confirmation_min_meters = 0.4f,
                entry_confirmation_max_meters = 0.5f,
                spatial_layer_transition_state = RokidA1SpatialEntryStates.SpatialLayerStandby,
                spatial_layer_transition_label = "开启空间层 waits for deliberate A1 confirmation; fallback is not hardware ready",
                fallback_claims_hardware_ready = false,
                spatial_entry_state = RokidSpatialEntryStates.SimulatedWall,
                spatial_entry_label = "Spatial entry: gallery wall rehearsal",
                image_target_lock_state = RokidImageTargetLockStates.Simulated,
                image_target_lock_label = "Image targets: simulated lock against print kit",
                image_target_lock_quality = 0.58f,
                discovery_layer_state = RokidDiscoveryLayerStates.Radar,
                discovery_layer_label = "Discovery layer: simulator radar over anchors",
                writeback_readiness_state = RokidWritebackReadinessStates.DraftOnly,
                writeback_readiness_label = "Writeback: draft lane guarded for operator review",
                device_safety_mode = RokidDeviceSafetyModes.SimulatorSafe,
                device_safety_label = "Device mode: operator-safe simulator",
                operator_safe_device_mode = true,
                enable_spatial_entry = true,
                enable_image_target_lock = true,
                enable_discovery_radar = true,
                writeback_operator_review = true,
                premium_metrics = BuildPremiumMetrics(
                    0.64f,
                    0.58f,
                    0.78f,
                    0.52f,
                    1f,
                    RokidSpatialEntryStates.SimulatedWall,
                    RokidImageTargetLockStates.Simulated,
                    RokidWritebackReadinessStates.DraftOnly,
                    RokidDeviceSafetyModes.SimulatorSafe)
            };
        }

        private static RokidPresentationMetric[] BuildPremiumMetrics(
            float spatialEntry,
            float imageTargetLock,
            float discoveryLayer,
            float writebackReadiness,
            float operatorSafety,
            string spatialEntryState,
            string imageTargetLockState,
            string writebackReadinessState,
            string operatorSafetyState)
        {
            return new[]
            {
                RokidPresentationMetric.Create("spatial_entry", "Spatial entry", "quality", spatialEntry, spatialEntryState),
                RokidPresentationMetric.Create("image_target_lock", "Image target lock", "quality", imageTargetLock, imageTargetLockState),
                RokidPresentationMetric.Create("discovery_layer", "Discovery layer", "coverage", discoveryLayer, RokidDiscoveryLayerStates.Radar),
                RokidPresentationMetric.Create("writeback_readiness", "Writeback readiness", "readiness", writebackReadiness, writebackReadinessState),
                RokidPresentationMetric.Create("operator_safety", "Operator-safe mode", "guard", operatorSafety, operatorSafetyState)
            };
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }

    [Serializable]
    public sealed class RokidPresentationMetric
    {
        public string metric_id;
        public string label;
        public string unit;
        public float value;
        public string state;
        public string display_value;

        public static RokidPresentationMetric Create(string metricId, string metricLabel, string metricUnit, float metricValue, string metricState)
        {
            float cleanValue = Clamp01(metricValue);
            return new RokidPresentationMetric
            {
                metric_id = Clean(metricId),
                label = Clean(metricLabel),
                unit = Clean(metricUnit),
                value = cleanValue,
                state = Clean(metricState),
                display_value = PercentLabel(cleanValue)
            };
        }

        public RokidPresentationMetric Clone()
        {
            return new RokidPresentationMetric
            {
                metric_id = metric_id,
                label = label,
                unit = unit,
                value = value,
                state = state,
                display_value = display_value
            };
        }

        private static float Clamp01(float value)
        {
            if (value < 0f) return 0f;
            if (value > 1f) return 1f;
            return value;
        }

        private static string PercentLabel(float value)
        {
            return ((int)(Clamp01(value) * 100f + 0.5f)).ToString() + "%";
        }

        private static string Clean(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        }
    }
}
