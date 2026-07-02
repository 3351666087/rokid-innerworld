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

        public bool RequiresRokidSdk
        {
            get { return input_adapter == RokidInputAdapterKind.RokidSdk || display_adapter == RokidDisplayAdapterKind.RokidSdkOverlay; }
        }

        public bool IsFallback
        {
            get { return RokidPresentationModes.IsFallback(mode); }
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
                fallback_reason = string.Empty
            };
        }

        private static RokidPresentationStrategy BuildOnSiteDisplayStrategy(RokidPresentationEnvironment environment)
        {
            return new RokidPresentationStrategy
            {
                mode = RokidPresentationMode.OnSiteDisplay,
                input_adapter = RokidInputAdapterKind.TouchOrMouse,
                display_adapter = RokidDisplayAdapterKind.WorldSpaceHud,
                use_spatial_anchors = environment != null && environment.has_openxr,
                use_gaze_pointer = true,
                use_voice_input = false,
                low_distraction_hud = true,
                allow_desktop_shortcuts = true,
                sdk_adapter_name = string.Empty,
                fallback_reason = "Field display fallback uses Unity input until hardware input is bound."
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
                fallback_reason = "Desktop fallback keeps the mission loop testable without Rokid hardware."
            };
        }
    }
}
