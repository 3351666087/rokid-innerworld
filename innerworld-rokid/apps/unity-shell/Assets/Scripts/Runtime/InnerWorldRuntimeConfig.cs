using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;

namespace InnerWorld.Rokid.Runtime
{
    [Serializable]
    public sealed class InnerWorldRuntimeConfig
    {
        public const string DefaultBaseUrl = "http://localhost:5177";
        public const string DefaultSpaceId = "innerworld_campus_wall";
        public const string DefaultDeviceProfile = "rokid-ar";
        public const string DefaultActiveUser = "A";
        public const string DefaultConfigFileName = "innerworld-config.json";
        public const int DefaultNearbyRadiusMeters = 20;
        public const int DefaultPollIntervalMs = 1000;
        public const int DefaultHealthIntervalMs = 3000;
        public const int DefaultRequestTimeoutMs = 5000;

        public const string EnvApiBaseUrl = "INNERWORLD_API_BASE_URL";
        public const string EnvSpaceId = "INNERWORLD_SPACE_ID";
        public const string EnvDeviceProfile = "INNERWORLD_DEVICE_PROFILE";
        public const string EnvPresentationMode = "INNERWORLD_PRESENTATION_MODE";
        public const string EnvNearbyRadiusMeters = "INNERWORLD_NEARBY_RADIUS_METERS";
        public const string EnvPollIntervalMs = "INNERWORLD_POLL_INTERVAL_MS";
        public const string EnvHealthIntervalMs = "INNERWORLD_HEALTH_INTERVAL_MS";
        public const string EnvRequestTimeoutMs = "INNERWORLD_REQUEST_TIMEOUT_MS";
        public const string EnvOfflineFallbackEnabled = "INNERWORLD_OFFLINE_FALLBACK_ENABLED";
        public const string EnvActiveUser = "INNERWORLD_ACTIVE_USER";

        public string base_url;
        public string space_id;
        public string device_profile;
        public string presentation_mode;
        public int nearby_radius_meters;
        public int poll_interval_ms;
        public int health_interval_ms;
        public int request_timeout_ms;
        public bool offline_fallback_enabled;
        public string active_user;

        public static InnerWorldRuntimeConfig CreateDefault()
        {
            return new InnerWorldRuntimeConfig
            {
                base_url = DefaultBaseUrl,
                space_id = DefaultSpaceId,
                device_profile = DefaultDeviceProfile,
                presentation_mode = RokidPresentationModes.Auto,
                nearby_radius_meters = DefaultNearbyRadiusMeters,
                poll_interval_ms = DefaultPollIntervalMs,
                health_interval_ms = DefaultHealthIntervalMs,
                request_timeout_ms = DefaultRequestTimeoutMs,
                offline_fallback_enabled = true,
                active_user = DefaultActiveUser
            };
        }

        public static InnerWorldRuntimeConfig FromJson(string json)
        {
            InnerWorldRuntimeConfig config = CreateDefault();
            ApplyJson(config, json);
            return config.NormalizedCopy();
        }

        public static bool TryFromJson(string json, out InnerWorldRuntimeConfig config)
        {
            config = CreateDefault();
            bool applied = ApplyJson(config, json);
            config = config.NormalizedCopy();
            return applied;
        }

        public static InnerWorldRuntimeConfig FromEnvironment(IDictionary<string, string> environment)
        {
            InnerWorldRuntimeConfig config = CreateDefault();
            ApplyEnvironment(config, environment);
            return config.NormalizedCopy();
        }

        public static InnerWorldRuntimeConfig FromCommandLineArgs(string[] args)
        {
            InnerWorldRuntimeConfig config = CreateDefault();
            ApplyCommandLineArgs(config, args);
            return config.NormalizedCopy();
        }

        public static InnerWorldRuntimeConfig FromSources(string json, IDictionary<string, string> environment, string[] args)
        {
            InnerWorldRuntimeConfig config = CreateDefault();
            ApplyJson(config, json);
            ApplyEnvironment(config, environment);
            ApplyCommandLineArgs(config, args);
            return config.NormalizedCopy();
        }

        public static InnerWorldRuntimeConfig FromCurrentProcess(string json)
        {
            return FromSources(json, CaptureEnvironment(), Environment.GetCommandLineArgs());
        }

        public static IDictionary<string, string> CaptureEnvironment()
        {
            string[] keys =
            {
                EnvApiBaseUrl,
                EnvSpaceId,
                EnvDeviceProfile,
                EnvPresentationMode,
                EnvNearbyRadiusMeters,
                EnvPollIntervalMs,
                EnvHealthIntervalMs,
                EnvRequestTimeoutMs,
                EnvOfflineFallbackEnabled,
                EnvActiveUser
            };

            Dictionary<string, string> environment = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int index = 0; index < keys.Length; index++)
            {
                string value = Environment.GetEnvironmentVariable(keys[index]);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    environment[keys[index]] = value.Trim();
                }
            }

            return environment;
        }

        public InnerWorldRuntimeConfig NormalizedCopy()
        {
            InnerWorldRuntimeConfig copy = new InnerWorldRuntimeConfig
            {
                base_url = NormalizeBaseUrl(base_url),
                space_id = CleanOrDefault(space_id, DefaultSpaceId),
                device_profile = CleanOrDefault(device_profile, DefaultDeviceProfile),
                presentation_mode = RokidPresentationModes.ToConfigValue(RokidPresentationModes.Parse(presentation_mode)),
                nearby_radius_meters = PositiveOrDefault(nearby_radius_meters, DefaultNearbyRadiusMeters),
                poll_interval_ms = PositiveOrDefault(poll_interval_ms, DefaultPollIntervalMs),
                health_interval_ms = PositiveOrDefault(health_interval_ms, DefaultHealthIntervalMs),
                request_timeout_ms = PositiveOrDefault(request_timeout_ms, DefaultRequestTimeoutMs),
                offline_fallback_enabled = offline_fallback_enabled,
                active_user = CleanOrDefault(active_user, DefaultActiveUser)
            };

            return copy;
        }

        public bool UsesCleartextHttp
        {
            get { return NormalizeBaseUrl(base_url).StartsWith("http://", StringComparison.OrdinalIgnoreCase); }
        }

        public bool IsOfflineFallbackAllowed
        {
            get { return offline_fallback_enabled; }
        }

        public RokidPresentationMode PresentationMode
        {
            get { return RokidPresentationModes.Parse(presentation_mode); }
        }

        private static bool ApplyJson(InnerWorldRuntimeConfig config, string json)
        {
            InnerWorldRuntimeConfigJsonPatch patch = TryParseJsonPatch(json);
            if (patch == null)
            {
                return false;
            }

            ApplyPatch(config, patch);
            return true;
        }

        private static void ApplyEnvironment(InnerWorldRuntimeConfig config, IDictionary<string, string> environment)
        {
            string value;

            if (TryGetEnvironmentValue(environment, EnvApiBaseUrl, out value)) config.base_url = value;
            if (TryGetEnvironmentValue(environment, EnvSpaceId, out value)) config.space_id = value;
            if (TryGetEnvironmentValue(environment, EnvDeviceProfile, out value)) config.device_profile = value;
            if (TryGetEnvironmentValue(environment, EnvPresentationMode, out value)) config.presentation_mode = value;
            if (TryGetEnvironmentValue(environment, EnvActiveUser, out value)) config.active_user = value;

            if (TryGetEnvironmentValue(environment, EnvNearbyRadiusMeters, out value)) config.nearby_radius_meters = ParsePositiveInt(value, config.nearby_radius_meters);
            if (TryGetEnvironmentValue(environment, EnvPollIntervalMs, out value)) config.poll_interval_ms = ParsePositiveInt(value, config.poll_interval_ms);
            if (TryGetEnvironmentValue(environment, EnvHealthIntervalMs, out value)) config.health_interval_ms = ParsePositiveInt(value, config.health_interval_ms);
            if (TryGetEnvironmentValue(environment, EnvRequestTimeoutMs, out value)) config.request_timeout_ms = ParsePositiveInt(value, config.request_timeout_ms);
            if (TryGetEnvironmentValue(environment, EnvOfflineFallbackEnabled, out value)) config.offline_fallback_enabled = ParseBool(value, config.offline_fallback_enabled);
        }

        private static void ApplyCommandLineArgs(InnerWorldRuntimeConfig config, string[] args)
        {
            if (args == null)
            {
                return;
            }

            for (int index = 0; index < args.Length; index++)
            {
                string value;
                if (TryReadArg(args, index, "--innerworld-api", out value))
                {
                    config.base_url = value;
                }
                else if (TryReadArg(args, index, "--innerworld-space", out value))
                {
                    config.space_id = value;
                }
                else if (TryReadArg(args, index, "--innerworld-profile", out value))
                {
                    config.device_profile = value;
                }
                else if (TryReadArg(args, index, "--innerworld-mode", out value)
                    || TryReadArg(args, index, "--innerworld-presentation", out value))
                {
                    config.presentation_mode = value;
                }
                else if (TryReadArg(args, index, "--innerworld-user", out value))
                {
                    config.active_user = value;
                }
                else if (TryReadArg(args, index, "--innerworld-radius", out value))
                {
                    config.nearby_radius_meters = ParsePositiveInt(value, config.nearby_radius_meters);
                }
                else if (TryReadArg(args, index, "--innerworld-poll-ms", out value))
                {
                    config.poll_interval_ms = ParsePositiveInt(value, config.poll_interval_ms);
                }
                else if (TryReadArg(args, index, "--innerworld-health-ms", out value))
                {
                    config.health_interval_ms = ParsePositiveInt(value, config.health_interval_ms);
                }
                else if (TryReadArg(args, index, "--innerworld-timeout-ms", out value))
                {
                    config.request_timeout_ms = ParsePositiveInt(value, config.request_timeout_ms);
                }
                else if (TryReadArg(args, index, "--innerworld-offline-fallback", out value))
                {
                    config.offline_fallback_enabled = ParseBool(value, config.offline_fallback_enabled);
                }
            }
        }

        private static void ApplyPatch(InnerWorldRuntimeConfig config, InnerWorldRuntimeConfigJsonPatch patch)
        {
            if (!string.IsNullOrWhiteSpace(patch.base_url)) config.base_url = patch.base_url;
            if (!string.IsNullOrWhiteSpace(patch.space_id)) config.space_id = patch.space_id;
            if (!string.IsNullOrWhiteSpace(patch.device_profile)) config.device_profile = patch.device_profile;
            if (!string.IsNullOrWhiteSpace(patch.presentation_mode)) config.presentation_mode = patch.presentation_mode;
            if (!string.IsNullOrWhiteSpace(patch.active_user)) config.active_user = patch.active_user;
            if (patch.nearby_radius_meters.HasValue) config.nearby_radius_meters = patch.nearby_radius_meters.Value;
            if (patch.poll_interval_ms.HasValue) config.poll_interval_ms = patch.poll_interval_ms.Value;
            if (patch.health_interval_ms.HasValue) config.health_interval_ms = patch.health_interval_ms.Value;
            if (patch.request_timeout_ms.HasValue) config.request_timeout_ms = patch.request_timeout_ms.Value;
            if (patch.offline_fallback_enabled.HasValue) config.offline_fallback_enabled = patch.offline_fallback_enabled.Value;
        }

        private static InnerWorldRuntimeConfigJsonPatch TryParseJsonPatch(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            try
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                using (MemoryStream stream = new MemoryStream(bytes))
                {
                    DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(InnerWorldRuntimeConfigJsonPatch));
                    return serializer.ReadObject(stream) as InnerWorldRuntimeConfigJsonPatch;
                }
            }
            catch
            {
                return null;
            }
        }

        private static bool TryReadArg(string[] args, int index, string name, out string value)
        {
            value = null;
            if (args == null || index < 0 || index >= args.Length || string.IsNullOrWhiteSpace(name))
            {
                return false;
            }

            string arg = args[index];
            if (string.IsNullOrWhiteSpace(arg))
            {
                return false;
            }

            string prefix = name + "=";
            if (arg.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                value = arg.Substring(prefix.Length).Trim();
                return value.Length > 0;
            }

            if (string.Equals(arg, name, StringComparison.OrdinalIgnoreCase)
                && index + 1 < args.Length
                && !string.IsNullOrWhiteSpace(args[index + 1])
                && !args[index + 1].StartsWith("--", StringComparison.Ordinal))
            {
                value = args[index + 1].Trim();
                return true;
            }

            return false;
        }

        private static bool TryGetEnvironmentValue(IDictionary<string, string> environment, string key, out string value)
        {
            value = null;
            if (environment == null || string.IsNullOrWhiteSpace(key))
            {
                return false;
            }

            if (environment.TryGetValue(key, out value) && !string.IsNullOrWhiteSpace(value))
            {
                value = value.Trim();
                return true;
            }

            foreach (KeyValuePair<string, string> pair in environment)
            {
                if (string.Equals(pair.Key, key, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(pair.Value))
                {
                    value = pair.Value.Trim();
                    return true;
                }
            }

            return false;
        }

        private static string NormalizeBaseUrl(string value)
        {
            string candidate = CleanOrDefault(value, DefaultBaseUrl).TrimEnd('/');
            if (candidate.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                || candidate.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return candidate;
            }

            return DefaultBaseUrl;
        }

        private static string CleanOrDefault(string value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private static int PositiveOrDefault(int value, int fallback)
        {
            return value > 0 ? value : fallback;
        }

        private static int ParsePositiveInt(string value, int fallback)
        {
            int parsed;
            if (int.TryParse(value, out parsed) && parsed > 0)
            {
                return parsed;
            }

            return fallback;
        }

        private static bool ParseBool(string value, bool fallback)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return fallback;
            }

            string clean = value.Trim();
            if (string.Equals(clean, "1", StringComparison.OrdinalIgnoreCase)
                || string.Equals(clean, "true", StringComparison.OrdinalIgnoreCase)
                || string.Equals(clean, "yes", StringComparison.OrdinalIgnoreCase)
                || string.Equals(clean, "on", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (string.Equals(clean, "0", StringComparison.OrdinalIgnoreCase)
                || string.Equals(clean, "false", StringComparison.OrdinalIgnoreCase)
                || string.Equals(clean, "no", StringComparison.OrdinalIgnoreCase)
                || string.Equals(clean, "off", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return fallback;
        }
    }

    [DataContract]
    public sealed class InnerWorldRuntimeConfigJsonPatch
    {
        [DataMember(Name = "base_url")]
        public string base_url;

        [DataMember(Name = "space_id")]
        public string space_id;

        [DataMember(Name = "device_profile")]
        public string device_profile;

        [DataMember(Name = "presentation_mode")]
        public string presentation_mode;

        [DataMember(Name = "nearby_radius_meters")]
        public int? nearby_radius_meters;

        [DataMember(Name = "poll_interval_ms")]
        public int? poll_interval_ms;

        [DataMember(Name = "health_interval_ms")]
        public int? health_interval_ms;

        [DataMember(Name = "request_timeout_ms")]
        public int? request_timeout_ms;

        [DataMember(Name = "offline_fallback_enabled")]
        public bool? offline_fallback_enabled;

        [DataMember(Name = "active_user")]
        public string active_user;
    }
}
