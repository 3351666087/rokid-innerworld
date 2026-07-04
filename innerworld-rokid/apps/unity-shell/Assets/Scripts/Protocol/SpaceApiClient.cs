using System;

namespace InnerWorld.Rokid.Protocol
{
    public sealed class SpaceApiClient
    {
        public const string DefaultBaseUrl = "http://localhost:5177";
        public const string DefaultSpaceId = "innerworld_campus_wall";
        public const string DefaultDeviceProfile = "rokid-ar";
        public const int DefaultNearbyRadiusMeters = 20;

        public SpaceApiClient()
            : this(DefaultBaseUrl, DefaultSpaceId, DefaultDeviceProfile, DefaultNearbyRadiusMeters)
        {
        }

        public SpaceApiClient(string baseUrl, string spaceId)
            : this(baseUrl, spaceId, DefaultDeviceProfile, DefaultNearbyRadiusMeters)
        {
        }

        public SpaceApiClient(string baseUrl, string spaceId, string deviceProfile)
            : this(baseUrl, spaceId, deviceProfile, DefaultNearbyRadiusMeters)
        {
        }

        public SpaceApiClient(string baseUrl, string spaceId, string deviceProfile, int nearbyRadiusMeters)
        {
            BaseUrl = NormalizeBaseUrl(baseUrl);
            SpaceId = CleanOrDefault(spaceId, DefaultSpaceId);
            DeviceProfile = CleanOrDefault(deviceProfile, DefaultDeviceProfile);
            NearbyRadiusMeters = Math.Max(0, nearbyRadiusMeters);
        }

        public string BaseUrl { get; private set; }

        public string SpaceId { get; private set; }

        public string DeviceProfile { get; private set; }

        public int NearbyRadiusMeters { get; private set; }

        public string BootstrapUrl
        {
            get { return BuildBootstrapUrl(BaseUrl, DeviceProfile); }
        }

        public string DeviceManifestUrl
        {
            get { return BuildDeviceManifestUrl(BaseUrl); }
        }

        public string DeviceAdapterChecklistUrl
        {
            get { return BuildDeviceAdapterChecklistUrl(BaseUrl); }
        }

        public string DeviceRegisterUrl
        {
            get { return BuildDeviceRegisterUrl(BaseUrl); }
        }

        public string DeviceHeartbeatUrl
        {
            get { return BuildDeviceHeartbeatUrl(BaseUrl); }
        }

        public string DeviceSessionsUrl
        {
            get { return BuildDeviceSessionsUrl(BaseUrl); }
        }

        public string WallCalibrationUrl
        {
            get { return BuildWallCalibrationUrl(BaseUrl); }
        }

        public string WallCalibrationObservationsUrl
        {
            get { return BuildWallCalibrationObservationsUrl(BaseUrl); }
        }

        public string FieldMarkersUrl
        {
            get { return BuildFieldMarkersUrl(BaseUrl); }
        }

        public string FieldAcceptanceUrl
        {
            get { return BuildFieldAcceptanceUrl(BaseUrl); }
        }

        public string SpaceUrl
        {
            get { return BuildSpaceUrl(BaseUrl, SpaceId); }
        }

        public string StateUrl
        {
            get { return BuildStateUrl(BaseUrl); }
        }

        public string EvidenceChainUrl
        {
            get { return BuildEvidenceChainUrl(BaseUrl); }
        }

        public string LedgerEventsUrl
        {
            get { return BuildLedgerEventsUrl(BaseUrl); }
        }

        public string LedgerSummaryUrl
        {
            get { return BuildLedgerSummaryUrl(BaseUrl); }
        }

        public string SessionPlanUrl
        {
            get { return BuildSessionPlanUrl(BaseUrl); }
        }

        public string AiHudUrl
        {
            get { return BuildAiHudUrl(BaseUrl); }
        }

        public string NearbyPinsUrl
        {
            get { return BuildNearbyPinsUrl(BaseUrl, NearbyRadiusMeters); }
        }

        public string InteractionsUrl
        {
            get { return BuildInteractionsUrl(BaseUrl); }
        }

        public string ServiceActionsUrl
        {
            get { return BuildServiceActionsUrl(BaseUrl); }
        }

        public string ServiceActionsOutboxUrl
        {
            get { return BuildServiceActionsOutboxUrl(BaseUrl); }
        }

        public string WriteBackUrl
        {
            get { return BuildWriteBackUrl(BaseUrl, SpaceId); }
        }

        public SpaceEndpointMap Endpoints
        {
            get { return BuildEndpointMap(BaseUrl, SpaceId); }
        }

        public string BuildUrl(string path)
        {
            return BuildUrl(BaseUrl, path);
        }

        public static string BuildUrl(string baseUrl, string path)
        {
            string cleanBaseUrl = NormalizeBaseUrl(baseUrl);
            string cleanPath = string.IsNullOrWhiteSpace(path) ? "/" : path.Trim();

            if (StartsWithHttpScheme(cleanPath))
            {
                return cleanPath;
            }

            if (!cleanPath.StartsWith("/", StringComparison.Ordinal))
            {
                cleanPath = "/" + cleanPath;
            }

            return cleanBaseUrl + cleanPath;
        }

        public static string BuildBootstrapUrl(string baseUrl)
        {
            return BuildBootstrapUrl(baseUrl, DefaultDeviceProfile);
        }

        public static string BuildBootstrapUrl(string baseUrl, string profile)
        {
            string path = "/api/device/bootstrap";
            string cleanProfile = string.IsNullOrWhiteSpace(profile) ? "" : profile.Trim();
            if (cleanProfile.Length > 0)
            {
                path = AppendQuery(path, "profile", cleanProfile);
            }

            return BuildUrl(baseUrl, path);
        }

        public static string BuildSpaceUrl(string baseUrl)
        {
            return BuildSpaceUrl(baseUrl, DefaultSpaceId);
        }

        public static string BuildSpaceUrl(string baseUrl, string spaceId)
        {
            return BuildUrl(baseUrl, "/api/spaces/" + EscapePathSegment(CleanOrDefault(spaceId, DefaultSpaceId)));
        }

        public static string BuildStateUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/state");
        }

        public static string BuildDeviceManifestUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/device/manifest");
        }

        public static string BuildDeviceAdapterChecklistUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/device/adapter-checklist");
        }

        public static string BuildDeviceRegisterUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/device/register");
        }

        public static string BuildDeviceHeartbeatUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/device/heartbeat");
        }

        public static string BuildDeviceSessionsUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/device/sessions");
        }

        public static string BuildDevicePairingUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/device/pairing");
        }

        public static string BuildWallCalibrationUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/calibration/wall");
        }

        public static string BuildWallCalibrationObservationsUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/calibration/observations");
        }

        public static string BuildFieldMarkersUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/field/markers");
        }

        public static string BuildFieldAcceptanceUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/field/acceptance");
        }

        public static string BuildEvidenceChainUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/evidence/chain");
        }

        public static string BuildLedgerEventsUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/ledger/events");
        }

        public static string BuildLedgerSummaryUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/ledger/summary");
        }

        public static string BuildSessionPlanUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/session/plan");
        }

        public static string BuildAiHudUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/ai/hud");
        }

        public static string BuildNearbyPinsUrl(string baseUrl)
        {
            return BuildNearbyPinsUrl(baseUrl, DefaultNearbyRadiusMeters);
        }

        public static string BuildNearbyPinsUrl(string baseUrl, int radiusMeters)
        {
            int cleanRadiusMeters = Math.Max(0, radiusMeters);
            return BuildUrl(baseUrl, "/api/pins/nearby?radius=" + cleanRadiusMeters);
        }

        public static string BuildInteractionsUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/interactions");
        }

        public static string BuildServiceActionsUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/service-actions");
        }

        public static string BuildServiceActionsOutboxUrl(string baseUrl)
        {
            return BuildUrl(baseUrl, "/api/service-actions/outbox");
        }

        public static string BuildServiceActionAckUrl(string baseUrl, string actionRecordId)
        {
            return BuildUrl(baseUrl, "/api/service-actions/" + EscapePathSegment(CleanOrDefault(actionRecordId, "")) + "/ack");
        }

        public static string BuildWriteBackUrl(string baseUrl)
        {
            return BuildWriteBackUrl(baseUrl, DefaultSpaceId);
        }

        public static string BuildWriteBackUrl(string baseUrl, string spaceId)
        {
            return BuildUrl(baseUrl, "/api/spaces/" + EscapePathSegment(CleanOrDefault(spaceId, DefaultSpaceId)) + "/beacons");
        }

        public static SpaceEndpointMap BuildEndpointMap(string baseUrl)
        {
            return BuildEndpointMap(baseUrl, DefaultSpaceId);
        }

        public static SpaceEndpointMap BuildEndpointMap(string baseUrl, string spaceId)
        {
            string cleanBaseUrl = NormalizeBaseUrl(baseUrl);
            string cleanSpaceId = CleanOrDefault(spaceId, DefaultSpaceId);
            string spacePath = "/api/spaces/" + EscapePathSegment(cleanSpaceId);
            string writeBackPath = spacePath + "/beacons";

            return new SpaceEndpointMap
            {
                health = Endpoint(cleanBaseUrl, "GET", "/api/health"),
                ops_status = Endpoint(cleanBaseUrl, "GET", "/api/ops/status"),
                evidence_chain = Endpoint(cleanBaseUrl, "GET", "/api/evidence/chain"),
                ledger_events = Endpoint(cleanBaseUrl, "GET", "/api/ledger/events"),
                ledger_summary = Endpoint(cleanBaseUrl, "GET", "/api/ledger/summary"),
                session_plan = Endpoint(cleanBaseUrl, "GET", "/api/session/plan"),
                device_bootstrap = Endpoint(cleanBaseUrl, "GET", "/api/device/bootstrap"),
                device_manifest = Endpoint(cleanBaseUrl, "GET", "/api/device/manifest"),
                device_adapter_checklist = Endpoint(cleanBaseUrl, "GET", "/api/device/adapter-checklist"),
                device_pairing = Endpoint(cleanBaseUrl, "POST", "/api/device/pairing"),
                device_register = Endpoint(cleanBaseUrl, "POST", "/api/device/register"),
                device_heartbeat = Endpoint(cleanBaseUrl, "POST", "/api/device/heartbeat"),
                device_sessions = Endpoint(cleanBaseUrl, "GET", "/api/device/sessions"),
                wall_calibration = Endpoint(cleanBaseUrl, "GET", "/api/calibration/wall"),
                wall_calibration_observations = Endpoint(cleanBaseUrl, "POST", "/api/calibration/observations"),
                field_markers = Endpoint(cleanBaseUrl, "GET", "/api/field/markers"),
                field_acceptance = Endpoint(cleanBaseUrl, "GET", "/api/field/acceptance"),
                field_target_readiness = Endpoint(cleanBaseUrl, "GET", "/api/field/target-readiness"),
                ai_schema = Endpoint(cleanBaseUrl, "GET", "/api/ai/schema"),
                ai_prompt = Endpoint(cleanBaseUrl, "GET", "/api/ai/prompt"),
                ai_hud = Endpoint(cleanBaseUrl, "POST", "/api/ai/hud"),
                space = Endpoint(cleanBaseUrl, "GET", spacePath),
                state = Endpoint(cleanBaseUrl, "GET", "/api/state"),
                nearby_pins = Endpoint(cleanBaseUrl, "GET", "/api/pins/nearby?radius=20"),
                interactions = Endpoint(cleanBaseUrl, "POST", "/api/interactions"),
                service_actions = Endpoint(cleanBaseUrl, "POST", "/api/service-actions"),
                service_actions_outbox = Endpoint(cleanBaseUrl, "GET", "/api/service-actions/outbox"),
                service_action_ack_template = Endpoint(cleanBaseUrl, "POST", "/api/service-actions/{action_record_id}/ack"),
                write_back = Endpoint(cleanBaseUrl, "POST", writeBackPath),
                reset = Endpoint(cleanBaseUrl, "POST", "/api/reset")
            };
        }

        public static UnityCompatConfig BuildUnityCompatConfig(string baseUrl, string spaceId)
        {
            return new UnityCompatConfig
            {
                base_url = NormalizeBaseUrl(baseUrl),
                space_id = CleanOrDefault(spaceId, DefaultSpaceId)
            };
        }

        public static string NormalizeBaseUrl(string baseUrl)
        {
            string candidate = CleanOrDefault(baseUrl, DefaultBaseUrl).TrimEnd('/');
            return StartsWithHttpScheme(candidate) ? candidate : DefaultBaseUrl;
        }

        private static SpaceApiEndpoint Endpoint(string baseUrl, string method, string path)
        {
            return new SpaceApiEndpoint
            {
                method = method,
                path = path,
                url = BuildUrl(baseUrl, path)
            };
        }

        private static string AppendQuery(string path, string key, string value)
        {
            string separator = path.IndexOf("?", StringComparison.Ordinal) >= 0 ? "&" : "?";
            return path + separator + Uri.EscapeDataString(key) + "=" + Uri.EscapeDataString(value);
        }

        private static string EscapePathSegment(string value)
        {
            return Uri.EscapeDataString(value);
        }

        private static bool StartsWithHttpScheme(string value)
        {
            return value.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                || value.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        }

        private static string CleanOrDefault(string value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }
    }
}
