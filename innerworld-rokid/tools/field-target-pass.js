import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const options = {
  baseUrl: process.env.INNERWORLD_API_BASE_URL || "http://127.0.0.1:5177",
  outputRoot: path.join(root, "output", "field-target-pass"),
  applyMissionActions: false,
  confirmUserBReadback: false,
  requireLiveSession: false,
  requireTrusted: false,
  requireMissionLoop: false,
  requireTargetDiagnostics: false,
  durationSec: 1,
  intervalSec: 2,
  includeLogcatCounts: false,
  clearLogcat: false
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--base-url" && next) {
    options.baseUrl = next;
    index += 1;
  } else if (arg === "--output-root" && next) {
    options.outputRoot = path.resolve(next);
    index += 1;
  } else if (arg === "--apply-mission-actions") {
    options.applyMissionActions = true;
  } else if (arg === "--confirm-user-b-readback") {
    options.confirmUserBReadback = true;
  } else if (arg === "--require-live-session") {
    options.requireLiveSession = true;
  } else if (arg === "--require-trusted") {
    options.requireTrusted = true;
  } else if (arg === "--require-mission-loop") {
    options.requireMissionLoop = true;
  } else if (arg === "--require-target-diagnostics") {
    options.requireTargetDiagnostics = true;
  } else if (arg === "--watch") {
    options.durationSec = 120;
    options.includeLogcatCounts = true;
  } else if (arg === "--single") {
    options.durationSec = 1;
  } else if (arg === "--duration-sec" && next) {
    options.durationSec = Number(next);
    index += 1;
  } else if (arg === "--interval-sec" && next) {
    options.intervalSec = Number(next);
    index += 1;
  } else if (arg === "--logcat") {
    options.includeLogcatCounts = true;
  } else if (arg === "--clear-logcat") {
    options.clearLogcat = true;
  }
}

const REQUIRED_ANCHOR_IDS = ["A1", "A2", "A3"];
const REQUIRED_MISSION_STEP_IDS = ["read", "find_year", "service_action", "write_back"];
const HARDWARE_TRACKING_MODES = new Set(["qr", "image_tracking", "slam"]);
const LIVE_SESSION_REQUIREMENTS = [
  ["session_status", "online", "device_session_online"],
  ["pairing_status", "operator_paired", "operator_pairing"],
  ["hardware_acceptance_eligible", true, "hardware_acceptance_eligible"]
];
const SDK_BINDING_REQUIREMENTS = [
  ["boundary_compiled", "ROKID_UXR boundary compiled"],
  ["package_detected", "Rokid UXR package detected"],
  ["input_binding_ready", "RKInput 3DoF ray/input binding"],
  ["overlay_binding_ready", "Rokid overlay binding"],
  ["live_binding_ready", "live SDK binding"]
];
const ADAPTER_CHECKLIST_REQUIREMENTS = [
  ["rk_camera_rig_ready", "RKCameraRig/camera rig"],
  ["rk_input_3dof_ray_ready", "RKInput 3DoF ray"],
  ["pointable_ui_ready", "PointableUI"],
  ["pointable_ui_curve_ready", "PointableUICurve"],
  ["image_tracking_ready", "A1-A3 image tracking"],
  ["image_target_library_ready", "A1-A3 image target library"],
  ["slam_head_tracking_ready", "SLAM/head tracking"],
  ["head_tracking_heartbeat_ready", "head tracking heartbeat"],
  ["uxr_overlay_renderer_ready", "UXR overlay renderer"]
];
const REQUIRED_TARGET_DIAGNOSTIC_TOKENS = [
  "IW_TARGET_EVENT",
  "IW_TARGET_IGNORED_UNKNOWN_INDEX",
  "IW_TARGET_GATE_LIVE_PAIRING_REQUIRED",
  "IW_TARGET_THROTTLED",
  "IW_TARGET_POST_START",
  "IW_TARGET_POST_RESULT",
  "IW_TARGET_POST_FAIL",
  "IW_TARGET_MISSION_ASSIST"
];
const LOGCAT_PATTERNS = [
  "DllNotFoundException",
  "rokid_openxr_api",
  "UnsatisfiedLinkError",
  "TryOpenImageTracker",
  "Open Marker",
  "ImageDB",
  ...REQUIRED_TARGET_DIAGNOSTIC_TOKENS
];
const SPACE_ID = "innerworld_campus_wall";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(value) {
  return String(value || "http://127.0.0.1:5177").trim().replace(/\/+$/, "");
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function shaPrefix(value, length = 12) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
}

function shaFile(filePath) {
  if (!existsSync(filePath)) return null;
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readJsonFile(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    const port = url.port ? `:${url.port}` : "";
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
      return `${url.protocol}//localhost${port}`;
    }
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(url.hostname)) {
      return `${url.protocol}//<private-ip-redacted>${port}`;
    }
    return `${url.protocol}//<host-redacted>${port}`;
  } catch {
    return "<invalid-url-redacted>";
  }
}

function hostKind(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") return "localhost";
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(url.hostname)) return "private_lan";
    return "public_or_hostname";
  } catch {
    return "invalid";
  }
}

function findAdb() {
  const candidates = [
    process.env.ADB,
    "C:\\Program Files (x86)\\Android\\android-sdk\\platform-tools\\adb.exe",
    "C:\\Program Files\\Android\\android-sdk\\platform-tools\\adb.exe",
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe") : null
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function adbLogcatCounts({ clear = false, read = false } = {}) {
  const adb = findAdb();
  if (!adb) {
    return {
      adb_found: false,
      raw_log_included: false,
      pattern_counts: LOGCAT_PATTERNS.map((pattern) => ({ pattern, count: 0 }))
    };
  }

  if (clear) {
    spawnSync(adb, ["logcat", "-b", "all", "-c"], { encoding: "utf8", windowsHide: true });
  }

  if (!read) {
    return {
      adb_found: true,
      raw_log_included: false,
      pattern_counts: LOGCAT_PATTERNS.map((pattern) => ({ pattern, count: 0 }))
    };
  }

  const result = spawnSync(adb, ["logcat", "-d", "-v", "brief"], { encoding: "utf8", windowsHide: true });
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  return {
    adb_found: true,
    raw_log_included: false,
    pattern_counts: LOGCAT_PATTERNS.map((pattern) => ({
      pattern,
      count: (text.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    }))
  };
}

async function requestJson(baseUrl, apiPath, { method = "GET", body = null } = {}) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body ? { "content-type": "application/json; charset=utf-8" } : {})
    },
    body: body ? JSON.stringify(body) : null
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { ok: false, error: "invalid_json_response" };
  }
  if (!response.ok) {
    throw new Error(`${method} ${apiPath} returned HTTP ${response.status}: ${payload?.error || "request_failed"}`);
  }
  return payload;
}

function latestSession(sessions) {
  return list(sessions)
    .slice()
    .sort((left, right) => Date.parse(right.created_at || 0) - Date.parse(left.created_at || 0))[0] || null;
}

function summarizeAdapterChecklist(sdk) {
  const checklist = sdk?.adapter_checklist || {};
  const items = {};
  const missing = [];
  for (const [id, label] of ADAPTER_CHECKLIST_REQUIREMENTS) {
    const ready = checklist[id] === true;
    items[id] = ready;
    if (!ready) missing.push({ id, label });
  }
  return {
    items,
    missing_item_ids: missing.map((item) => item.id),
    missing_item_labels: missing.map((item) => item.label)
  };
}

function liveBindingMissingItems(session) {
  if (!session) return ["operator_paired_live_session_missing"];
  const sdk = session.sdk_binding_status || {};
  const missing = [];
  for (const [field, expected, id] of LIVE_SESSION_REQUIREMENTS) {
    if (session[field] !== expected) missing.push(id);
  }
  if (Number(session.heartbeat_count || 0) <= 0) missing.push("device_heartbeat");
  if (!session.active_anchor) missing.push("active_anchor_heartbeat");
  for (const [field, label] of SDK_BINDING_REQUIREMENTS) {
    if (sdk[field] !== true) missing.push(label);
  }
  return [...new Set(missing)];
}

function summarizeSession(session) {
  if (!session) return null;
  const sdk = session.sdk_binding_status || {};
  return {
    session_hash_prefix: shaPrefix(session.session_id),
    device_hash_prefix: shaPrefix(session.device_id),
    profile: session.profile || null,
    heartbeat_count: Number(session.heartbeat_count) || 0,
    active_anchor: session.active_anchor || null,
    pairing_status: session.pairing_status || null,
    hardware_acceptance_eligible: session.hardware_acceptance_eligible === true,
    sdk_stage: sdk.stage || null,
    sdk_live_binding_ready: sdk.live_binding_ready === true,
    sdk_input_binding_ready: sdk.input_binding_ready === true,
    sdk_overlay_binding_ready: sdk.overlay_binding_ready === true,
    live_binding_missing_items: liveBindingMissingItems(session),
    adapter_checklist: summarizeAdapterChecklist(sdk),
    raw_session_ids_included: false
  };
}

function summarizeSessions(payload) {
  const sessions = list(payload.sessions);
  const online = sessions.filter((item) => item.session_status === "online");
  const operatorPairedOnline = online.filter((item) => item.pairing_status === "operator_paired");
  const liveOperatorPaired = online.filter((item) => {
    const sdk = item.sdk_binding_status || {};
    return item.pairing_status === "operator_paired"
      && item.hardware_acceptance_eligible === true
      && sdk.live_binding_ready === true
      && sdk.input_binding_ready === true
      && sdk.overlay_binding_ready === true;
  });
  return {
    total: Number(payload.total) || sessions.length,
    online_count: online.length,
    operator_paired_online_count: operatorPairedOnline.length,
    live_operator_paired_ready_count: liveOperatorPaired.length,
    latest_session: summarizeSession(latestSession(sessions)),
    latest_operator_paired_session: summarizeSession(latestSession(operatorPairedOnline)),
    latest_live_operator_paired_session: summarizeSession(latestSession(liveOperatorPaired)),
    raw_session_ids_included: false
  };
}

function summarizeFieldAcceptance(payload) {
  const trustedGate = list(payload.gates).find((gate) => gate.id === "trusted_hardware_session") || {};
  const hardwareGate = list(payload.gates).find((gate) => gate.id === "hardware_alignment") || {};
  const missionGate = list(payload.gates).find((gate) => gate.id === "mission_loop") || {};
  const trustedEvidence = trustedGate.evidence || {};
  const hardwareEvidence = hardwareGate.evidence || {};
  const missionEvidence = missionGate.evidence || {};
  return {
    status: payload.status || null,
    ready: payload.ready === true,
    trusted_hardware_anchor_ids: list(trustedEvidence.trusted_hardware_calibrated_anchor_ids),
    untrusted_hardware_anchor_ids: list(trustedEvidence.untrusted_hardware_anchor_ids),
    hardware_calibrated_anchor_ids: list(hardwareEvidence.hardware_calibrated_anchor_ids),
    missing_trusted_anchor_ids: REQUIRED_ANCHOR_IDS.filter((anchorId) => !list(trustedEvidence.trusted_hardware_calibrated_anchor_ids).includes(anchorId)),
    missing_hardware_anchor_ids: REQUIRED_ANCHOR_IDS.filter((anchorId) => !list(hardwareEvidence.hardware_calibrated_anchor_ids).includes(anchorId)),
    mission_loop_ready: missionGate.status === "ready",
    mission_ledger_ready: missionEvidence.mission_ledger_ready === true,
    mission_missing_trusted_anchor_ids: list(missionEvidence.missing_trusted_anchor_ids),
    mission_trusted_a1_a2_a3_ready: missionEvidence.trusted_a1_a2_a3_ready === true,
    missing_mission_steps: list(missionEvidence.missing_steps),
    write_back_beacons: Number(missionEvidence.write_back_beacons) || 0,
    user_b_readback_ready: missionEvidence.user_b_readback_ready === true,
    trusted_mission_provenance_ready: missionEvidence.trusted_mission_provenance_ready === true,
    trusted_mission_provenance_missing: list(missionEvidence.trusted_mission_provenance?.missing),
    pending_gate_ids: list(payload.gates).filter((gate) => gate.status === "pending").map((gate) => gate.id)
  };
}

function summarizeWallTrustIssues(payload) {
  return list(payload.anchors)
    .map((anchor) => {
      const observation = anchor?.latest_observation || {};
      const acceptance = observation.acceptance || {};
      const proof = acceptance.hardware_session || {};
      const trackingMode = observation.tracking_mode || null;
      return {
        anchor_id: anchor?.anchor_id || observation.anchor_id || null,
        latest_status: observation.status || null,
        latest_tracking_mode: trackingMode,
        hardware_mode: HARDWARE_TRACKING_MODES.has(trackingMode),
        hardware_observation_trusted: acceptance.hardware_observation_trusted === true,
        observation_issues: list(observation.issues),
        hardware_session: {
          trusted: proof.trusted === true,
          trust_status: proof.trust_status || null,
          issues: list(proof.issues),
          session_status_at_observation: proof.session_status_at_observation || null,
          active_anchor_at_observation: proof.active_anchor_at_observation || null,
          pairing_status_at_observation: proof.pairing_status_at_observation || null,
          hardware_acceptance_eligible: proof.hardware_acceptance_eligible === true,
          sdk_binding_stage: proof.sdk_binding_stage || null,
          sdk_live_binding_ready: proof.sdk_live_binding_ready === true,
          sdk_input_binding_ready: proof.sdk_input_binding_ready === true,
          sdk_overlay_binding_ready: proof.sdk_overlay_binding_ready === true
        },
        raw_session_ids_included: false,
        raw_device_ids_included: false
      };
    })
    .filter((item) => item.anchor_id && (item.hardware_mode || item.observation_issues.length || item.hardware_session.issues.length));
}

function summarizeWallCalibration(payload) {
  const summary = payload.runtime?.summary || {};
  return {
    schema: payload.schema || null,
    ready_for_hardware: summary.ready_for_hardware === true,
    rehearsal_ready: summary.rehearsal_ready === true,
    hardware_calibrated_anchor_ids: list(summary.hardware_calibrated_anchor_ids),
    trusted_hardware_calibrated_anchor_ids: list(summary.trusted_hardware_calibrated_anchor_ids),
    untrusted_hardware_anchor_ids: list(summary.untrusted_hardware_anchor_ids),
    trust_issues_by_anchor: summarizeWallTrustIssues(payload)
  };
}

function trustIssueSummary(snapshot, anchorId) {
  const row = list(snapshot.wall_calibration?.trust_issues_by_anchor).find((item) => item.anchor_id === anchorId);
  if (!row) return "";
  const issues = [
    ...list(row.observation_issues),
    ...list(row.hardware_session?.issues)
  ].filter(Boolean);
  return [...new Set(issues)].join(", ");
}

function targetScanAction(snapshot, anchorId, label) {
  const issue = trustIssueSummary(snapshot, anchorId);
  const scanInstruction = snapshot.live_session_ready
    ? `Frame ${anchorId} through the current live Rokid adapter session`
    : `Frame ${anchorId} after the operator-paired live Rokid adapter session is ready`;
  return `${scanInstruction}; ${label}${issue ? ` (existing observation issue: ${issue})` : ""}.`;
}

function summarizeState(payload) {
  const completed = list(payload.completed_steps);
  const beacons = list(payload.beacons);
  const writeBackBeacons = beacons.filter((item) => item?.layer === "time_capsule" || item?.anchor_id === "A3");
  return {
    active_user: payload.active_user || null,
    mission_state: payload.mission_state || null,
    completed_steps: completed,
    missing_mission_steps: REQUIRED_MISSION_STEP_IDS.filter((stepId) => !completed.includes(stepId)),
    beacon_count: beacons.length,
    write_back_beacon_count: writeBackBeacons.length,
    user_b_readback_ready: String(payload.active_user || "").trim().toUpperCase() === "B"
      && payload.mission_state === "complete"
      && writeBackBeacons.length > 0
  };
}

function hasTrustedAnchor(snapshot, anchorId) {
  return snapshot.field_acceptance.trusted_hardware_anchor_ids.includes(anchorId);
}

function hasMissionStep(snapshot, stepId) {
  return snapshot.state.completed_steps.includes(stepId);
}

function rawScanApkForTokens(apkPath, tokens) {
  if (!existsSync(apkPath)) {
    return tokens.map((token) => ({ token, found: false, entry: null }));
  }
  const text = readFileSync(apkPath).toString("latin1");
  return tokens.map((token) => ({
    token,
    found: text.includes(token),
    entry: "raw_apk_binary"
  }));
}

function scanApkForTargetDiagnosticTokens(apkPath, tokens) {
  if (!existsSync(apkPath)) {
    return {
      ok: false,
      method: "apk_missing",
      tokens: tokens.map((token) => ({ token, found: false, entry: null }))
    };
  }

  if (process.platform === "win32") {
    const script = `
      $ErrorActionPreference = "Stop"
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      $apkPath = $env:IW_TARGET_APK_PATH
      $tokens = $env:IW_TARGET_TOKENS_JSON | ConvertFrom-Json
      $zip = [System.IO.Compression.ZipFile]::OpenRead($apkPath)
      try {
        $hits = @{}
        foreach ($token in $tokens) { $hits[$token] = $null }
        foreach ($entry in $zip.Entries) {
          if ($entry.Length -le 0 -or $entry.Length -gt 300MB) { continue }
          $stream = $entry.Open()
          try {
            $memory = New-Object System.IO.MemoryStream
            $stream.CopyTo($memory)
            $text = [System.Text.Encoding]::ASCII.GetString($memory.ToArray())
            foreach ($token in $tokens) {
              if ($null -eq $hits[$token] -and $text.Contains($token)) {
                $hits[$token] = $entry.FullName
              }
            }
          } finally {
            if ($memory) { $memory.Dispose() }
            $stream.Dispose()
          }
        }
        $tokens | ForEach-Object {
          [pscustomobject]@{
            token = $_
            found = $null -ne $hits[$_]
            entry = $hits[$_]
          }
        } | ConvertTo-Json -Depth 5
      } finally {
        $zip.Dispose()
      }
    `;
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    const result = spawnSync("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encoded
    ], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8,
      env: {
        ...process.env,
        IW_TARGET_APK_PATH: apkPath,
        IW_TARGET_TOKENS_JSON: JSON.stringify(tokens)
      }
    });
    if (result.status === 0) {
      try {
        const parsed = JSON.parse(result.stdout);
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        return {
          ok: rows.every((row) => row.found === true),
          method: "powershell_zip_entry_scan",
          tokens: rows.map((row) => ({
            token: row.token,
            found: row.found === true,
            entry: row.entry || null
          }))
        };
      } catch {
        // Fall through to raw binary scan below.
      }
    }
  }

  const rows = rawScanApkForTokens(apkPath, tokens);
  return {
    ok: rows.every((row) => row.found === true),
    method: "raw_apk_binary_scan",
    tokens: rows
  };
}

function collectTargetDiagnosticsPreflight() {
  const apkPath = path.join(root, "output", "unity-android", "InnerWorldRokid.apk");
  const launchPath = path.join(root, "output", "station-pro-apk-smoke", "station-pro-apk-smoke-latest-mutating-launch.json");
  const uxrPath = path.join(root, "output", "uxr-readiness", "uxr-readiness-latest.json");
  const apkExists = existsSync(apkPath);
  const apkSha256 = shaFile(apkPath);
  const launch = readJsonFile(launchPath);
  const uxr = readJsonFile(uxrPath);
  const tokenScan = scanApkForTargetDiagnosticTokens(apkPath, REQUIRED_TARGET_DIAGNOSTIC_TOKENS);
  const launchApkSha = launch?.apk?.sha256 || launch?.latest_mutating_launch?.apk_sha256 || null;
  const uxrCurrentApkSha = uxr?.current_apk?.sha256 || uxr?.station_pro_evidence?.current_apk?.sha256 || null;
  const uxrLaunchSha = uxr?.latest_mutating_launch?.apk_sha256 || uxr?.station_pro_evidence?.latest_mutating_launch?.apk_sha256 || null;
  const targetIndexMap = uxr?.station_pro_evidence?.current_apk?.rokid_image_db?.target_index_map || null;
  const targetIndexMapReady = targetIndexMap?.ready === true;
  const uxrMinimalReady = uxr?.readiness?.minimal_uxr_project_ready === true || uxr?.minimal_uxr_project_ready === true;
  const uxrHardwareReadyClaimAllowed = typeof uxr?.readiness?.hardware_ready_claim_allowed === "boolean"
    ? uxr.readiness.hardware_ready_claim_allowed
    : uxr?.hardware_ready_claim_allowed;
  const launchMatchesCurrentApk = Boolean(apkSha256 && launchApkSha && apkSha256 === launchApkSha);
  const uxrMatchesCurrentApk = Boolean(apkSha256 && uxrCurrentApkSha && apkSha256 === uxrCurrentApkSha);
  const uxrLaunchMatchesCurrentApk = Boolean(apkSha256 && uxrLaunchSha && apkSha256 === uxrLaunchSha);
  const operatorPairingVerified = launch?.readiness?.operator_pairing_verified === true
    || launch?.pairing?.verification?.ok === true;
  const pairSmokeReady = launch?.ok === true
    && launch?.install_and_launch === true
    && launch?.readiness?.install_run_smoke === true
    && operatorPairingVerified;
  const ready = apkExists
    && tokenScan.ok === true
    && launchMatchesCurrentApk
    && uxrMatchesCurrentApk
    && uxrLaunchMatchesCurrentApk
    && pairSmokeReady
    && targetIndexMapReady
    && uxrHardwareReadyClaimAllowed === false;

  return {
    ready,
    apk: {
      exists: apkExists,
      path: apkExists ? "output/unity-android/InnerWorldRokid.apk" : null,
      size_bytes: apkExists ? statSync(apkPath).size : 0,
      sha256_prefix: apkSha256 ? apkSha256.slice(0, 12) : null,
      full_sha256_included: false
    },
    target_diagnostic_tokens: {
      required: REQUIRED_TARGET_DIAGNOSTIC_TOKENS,
      scan_method: tokenScan.method,
      all_found: tokenScan.ok === true,
      tokens: tokenScan.tokens
    },
    mutating_launch: {
      evidence_path: "output/station-pro-apk-smoke/station-pro-apk-smoke-latest-mutating-launch.json",
      ok: launch?.ok === true,
      evidence_kind: launch?.evidence_kind || null,
      install_and_launch: launch?.install_and_launch === true,
      install_run_smoke: launch?.readiness?.install_run_smoke === true,
      operator_pairing_verified: operatorPairingVerified,
      apk_sha256_prefix: launchApkSha ? launchApkSha.slice(0, 12) : null,
      matches_current_apk: launchMatchesCurrentApk,
      raw_pairing_codes_included: launch?.privacy?.raw_pairing_codes_included === true,
      raw_session_ids_included: launch?.privacy?.raw_session_ids_included === true
    },
    uxr_readiness: {
      evidence_path: "output/uxr-readiness/uxr-readiness-latest.json",
      minimal_uxr_project_ready: uxrMinimalReady,
      hardware_ready_claim_allowed: uxrHardwareReadyClaimAllowed === true,
      current_apk_sha256_prefix: uxrCurrentApkSha ? uxrCurrentApkSha.slice(0, 12) : null,
      latest_mutating_launch_apk_sha256_prefix: uxrLaunchSha ? uxrLaunchSha.slice(0, 12) : null,
      current_apk_matches: uxrMatchesCurrentApk,
      latest_mutating_launch_matches_current_apk: uxrLaunchMatchesCurrentApk,
      target_index_map_ready: targetIndexMapReady,
      target_index_map: targetIndexMap ? {
        schema: targetIndexMap.schema || null,
        ready: targetIndexMap.ready === true,
        actual: list(targetIndexMap.actual).map((item) => ({
          index: Number(item.index),
          anchor_id: item.anchor_id || null,
          guid: item.guid || null
        })),
        missing_anchor_ids: list(targetIndexMap.missing_anchor_ids),
        issues: list(targetIndexMap.issues),
        boundary: targetIndexMap.boundary || "Target index map evidence only; physical target observation still required."
      } : null
    },
    privacy: {
      full_apk_sha256_included: false,
      raw_pairing_codes_included: false,
      raw_session_ids_included: false,
      raw_logcat_included: false
    },
    note: "This preflight only proves the current APK and diagnostic tooling are aligned for the physical target pass. It is not hardware readiness."
  };
}

function buildPhases(snapshot) {
  const trusted = new Set(snapshot.field_acceptance.trusted_hardware_anchor_ids);
  const completed = new Set(snapshot.state.completed_steps);
  const writeBackReady = snapshot.state.write_back_beacon_count > 0 && completed.has("write_back");
  const session = snapshot.session.latest_operator_paired_session || snapshot.session.latest_session;
  const liveMissing = list(session?.live_binding_missing_items);
  const adapterMissing = list(session?.adapter_checklist?.missing_item_labels);
  const liveAction = [
    "Run station:apk:pair-smoke or keep the current Rokid Unity APK foregrounded until /api/device/sessions shows one live operator-paired session.",
    liveMissing.length ? `Missing live binding items: ${liveMissing.join(", ")}.` : "",
    adapterMissing.length ? `Remaining adapter checklist: ${adapterMissing.join(", ")}.` : ""
  ].filter(Boolean).join(" ");
  return [
    {
      id: "live_session",
      title: "Operator-paired live SDK session",
      status: snapshot.live_session_ready ? "ready" : "pending",
      required: ["online_session", "operator_pairing", "live/input/overlay SDK binding"],
      action: liveAction
    },
    {
      id: "a1_entry",
      title: "A1 spatial entry",
      anchor_id: "A1",
      status: trusted.has("A1") ? "ready" : "pending",
      required: ["trusted A1 hardware observation", "deliberate entry confirmation in glasses"],
      action: "Frame the A1 QR entry marker with Rokid glasses and confirm the spatial entry."
    },
    {
      id: "a2_memory",
      title: "A2 memory read",
      anchor_id: "A2",
      status: trusted.has("A2") && completed.has("read") && completed.has("find_year") ? "ready" : "pending",
      required: ["trusted A2 image target", "read", "find_year"],
      action: targetScanAction(snapshot, "A2", "with --apply-mission-actions, the runner posts read/find_year only after trusted A2 exists")
    },
    {
      id: "service_action",
      title: "Controlled service action",
      anchor_id: "A3",
      status: completed.has("service_action") ? "ready" : "pending",
      required: ["read", "find_year", "operator-controlled service action"],
      action: "After A2 is trusted and read/find_year are complete, run with --apply-mission-actions to post the controlled service action."
    },
    {
      id: "a3_timemark",
      title: "A3 TimeMark write-back",
      anchor_id: "A3",
      status: trusted.has("A3") && writeBackReady ? "ready" : "pending",
      required: ["trusted A3 image target", "service_action", "write_back beacon"],
      action: targetScanAction(snapshot, "A3", "with --apply-mission-actions, the runner posts a fixed TimeMark only after service_action is complete")
    },
    {
      id: "user_b_readback",
      title: "User B readback",
      anchor_id: "A3",
      status: snapshot.state.user_b_readback_ready ? "ready" : "pending",
      required: ["write_back beacon", "operator-confirmed User B readback"],
      action: "After User B sees the new A3 memory in the glasses, rerun with --confirm-user-b-readback to switch active_user to B."
    }
  ];
}

async function captureSnapshot(baseUrl) {
  const [fieldAcceptance, sessions, state, wallCalibration] = await Promise.all([
    requestJson(baseUrl, "/api/field/acceptance"),
    requestJson(baseUrl, "/api/device/sessions"),
    requestJson(baseUrl, "/api/state"),
    requestJson(baseUrl, "/api/calibration/wall")
  ]);
  const snapshot = {
    captured_at: new Date().toISOString(),
    session: summarizeSessions(sessions),
    field_acceptance: summarizeFieldAcceptance(fieldAcceptance),
    state: summarizeState(state),
    wall_calibration: summarizeWallCalibration(wallCalibration)
  };
  snapshot.live_session_ready = snapshot.session.live_operator_paired_ready_count > 0;
  snapshot.trusted_a1_a2_a3_ready = REQUIRED_ANCHOR_IDS.every((anchorId) => hasTrustedAnchor(snapshot, anchorId));
  snapshot.mission_loop_ready = snapshot.field_acceptance.mission_loop_ready === true;
  snapshot.field_acceptance_ready = snapshot.field_acceptance.ready === true;
  snapshot.phases = buildPhases(snapshot);
  return snapshot;
}

async function captureWatchSnapshots(baseUrl) {
  const snapshots = [];
  const durationMs = Math.max(1, Number(options.durationSec) || 1) * 1000;
  const intervalMs = Math.max(1, Number(options.intervalSec) || 2) * 1000;
  const deadline = Date.now() + durationMs;

  do {
    snapshots.push(await captureSnapshot(baseUrl));
    if (Date.now() + intervalMs > deadline) break;
    await sleep(intervalMs);
  } while (Date.now() < deadline);

  return snapshots;
}

function skippedAction(id, reason) {
  return {
    id,
    ok: false,
    applied: false,
    skipped_reason: reason
  };
}

async function maybePostMissionActions(baseUrl, snapshot) {
  const actions = [];
  if (!options.applyMissionActions) {
    actions.push(skippedAction("mission_actions", "apply_mission_actions_flag_not_set"));
    return actions;
  }

  if (hasTrustedAnchor(snapshot, "A2")) {
    if (!hasMissionStep(snapshot, "read")) {
      await requestJson(baseUrl, "/api/interactions", {
        method: "POST",
        body: { source: "field_target_pass_trusted_a2", user_id: "A", step_id: "read", mission_state: "reading" }
      });
      actions.push({ id: "post_read", ok: true, applied: true, guard: "trusted_A2" });
    }
    if (!hasMissionStep(snapshot, "find_year")) {
      await requestJson(baseUrl, "/api/interactions", {
        method: "POST",
        body: { source: "field_target_pass_trusted_a2", user_id: "A", step_id: "find_year", mission_state: "doing" }
      });
      actions.push({ id: "post_find_year", ok: true, applied: true, guard: "trusted_A2" });
    }
  } else {
    actions.push(skippedAction("post_a2_read_find_year", "trusted_A2_missing"));
  }

  const afterA2 = await captureSnapshot(baseUrl);
  const a2Complete = hasTrustedAnchor(afterA2, "A2")
    && hasMissionStep(afterA2, "read")
    && hasMissionStep(afterA2, "find_year");
  if (a2Complete && !hasMissionStep(afterA2, "service_action")) {
    await requestJson(baseUrl, "/api/service-actions", {
      method: "POST",
      body: {
        source: "field_target_pass",
        user_id: "A",
        action_id: "JOIN_EVENT_1430",
        label: "Join 14:30 demo",
        anchor_id: "A3",
        step_id: "service_action"
      }
    });
    actions.push({ id: "post_service_action", ok: true, applied: true, guard: "trusted_A2_and_read_find_year_complete" });
  } else if (!a2Complete) {
    actions.push(skippedAction("post_service_action", "trusted_A2_or_read_find_year_incomplete"));
  }

  const afterService = await captureSnapshot(baseUrl);
  const canWriteBack = hasTrustedAnchor(afterService, "A3") && hasMissionStep(afterService, "service_action");
  if (canWriteBack && !hasMissionStep(afterService, "write_back")) {
    await requestJson(baseUrl, `/api/spaces/${SPACE_ID}/beacons`, {
      method: "POST",
      body: {
        user_id: "A",
        anchor_id: "A3",
        title: "Field Target Pass",
        text: `Rokid trusted field TimeMark ${new Date().toISOString().slice(11, 19)}`
      }
    });
    actions.push({ id: "post_timemark_write_back", ok: true, applied: true, guard: "trusted_A3_and_service_action" });
  } else if (!canWriteBack) {
    actions.push(skippedAction("post_timemark_write_back", "trusted_A3_or_service_action_missing"));
  }

  return actions;
}

async function maybeConfirmUserBReadback(baseUrl, snapshot) {
  if (!options.confirmUserBReadback) {
    return [skippedAction("confirm_user_b_readback", "confirm_user_b_readback_flag_not_set")];
  }
  const canConfirm = hasTrustedAnchor(snapshot, "A3")
    && snapshot.state.write_back_beacon_count > 0
    && hasMissionStep(snapshot, "write_back");
  if (!canConfirm) {
    return [skippedAction("confirm_user_b_readback", "trusted_A3_or_write_back_beacon_missing")];
  }
  await requestJson(baseUrl, "/api/interactions", {
    method: "POST",
    body: {
      source: "field_target_pass_operator_confirmed_user_b_readback",
      user_id: "B",
      mission_state: "complete"
    }
  });
  return [{ id: "confirm_user_b_readback", ok: true, applied: true, guard: "operator_confirmed_after_write_back" }];
}

function buildBlockers(snapshot, targetDiagnostics) {
  const blockers = [];
  if (options.requireLiveSession && !snapshot.live_session_ready) blockers.push("live_operator_paired_sdk_session_missing");
  if (options.requireTargetDiagnostics && targetDiagnostics.ready !== true) blockers.push("current_target_diagnostics_apk_preflight_missing");
  if (options.requireTrusted && !snapshot.trusted_a1_a2_a3_ready) blockers.push("trusted_a1_a2_a3_observations_missing");
  if (options.requireMissionLoop && !snapshot.mission_loop_ready) {
    blockers.push(
      snapshot.field_acceptance.mission_ledger_ready === true
        && snapshot.field_acceptance.mission_missing_trusted_anchor_ids.length
        ? "mission_loop_waiting_for_trusted_a1_a2_a3"
        : "p0_mission_writeback_user_b_loop_missing"
    );
  }
  if (options.requireMissionLoop && snapshot.field_acceptance.trusted_mission_provenance_ready !== true) blockers.push("trusted_mission_provenance_missing");
  return blockers;
}

function buildPhysicalBlockers(snapshot, targetDiagnostics) {
  const blockers = [];
  if (!snapshot.live_session_ready) blockers.push("live_operator_paired_sdk_session_missing");
  if (targetDiagnostics.ready !== true) blockers.push("current_target_diagnostics_apk_preflight_missing");
  if (!snapshot.trusted_a1_a2_a3_ready) blockers.push("trusted_a1_a2_a3_observations_missing");
  if (!snapshot.mission_loop_ready) {
    blockers.push(
      snapshot.field_acceptance.mission_ledger_ready === true
        && snapshot.field_acceptance.mission_missing_trusted_anchor_ids.length
        ? "mission_loop_waiting_for_trusted_a1_a2_a3"
        : "p0_mission_writeback_user_b_loop_missing"
    );
  }
  if (snapshot.field_acceptance.trusted_mission_provenance_ready !== true) blockers.push("trusted_mission_provenance_missing");
  if (!snapshot.field_acceptance_ready) blockers.push("field_acceptance_not_ready");
  return blockers;
}

function buildMarkdown(report) {
  const phaseLines = report.latest_snapshot.phases.map((phase) => `- ${phase.id}: ${phase.status} | ${phase.action}`);
  const actionLines = report.actions.length
    ? report.actions.map((action) => `- ${action.id}: applied=${action.applied}, ok=${action.ok}${action.skipped_reason ? `, skipped=${action.skipped_reason}` : ""}`)
    : ["- none"];
  const blockerLines = report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ["- none"];
  const physicalBlockerLines = report.physical_blockers.length ? report.physical_blockers.map((item) => `- ${item}`) : ["- none"];
  const targetDiagnostics = report.target_diagnostics_preflight;
  const tokenLines = targetDiagnostics.target_diagnostic_tokens.tokens.map((item) => `- ${item.token}: found=${item.found}${item.entry ? `, entry=${item.entry}` : ""}`);
  const targetLogcatLines = (report.logcat.pattern_counts || [])
    .filter((item) => String(item.pattern || "").startsWith("IW_TARGET_"))
    .map((item) => `- ${item.pattern}: ${item.count}`);
  const trustIssueLines = list(report.latest_snapshot.wall_calibration?.trust_issues_by_anchor)
    .filter((item) => item.hardware_mode && item.hardware_observation_trusted !== true)
    .map((item) => {
      const issues = [
        ...list(item.observation_issues),
        ...list(item.hardware_session?.issues)
      ].filter(Boolean);
      return `- ${item.anchor_id}: mode=${item.latest_tracking_mode || "unknown"} status=${item.latest_status || "unknown"} issues=${[...new Set(issues)].join(",") || "none"} sdk_stage=${item.hardware_session?.sdk_binding_stage || "unknown"} pairing=${item.hardware_session?.pairing_status_at_observation || "unknown"}`;
    });
  const latestOperatorSession = report.latest_snapshot.session.latest_operator_paired_session
    || report.latest_snapshot.session.latest_session
    || {};
  const liveBindingLines = list(latestOperatorSession.live_binding_missing_items).map((item) => `- ${item}`);
  const adapterChecklistLines = list(latestOperatorSession.adapter_checklist?.missing_item_labels).map((item) => `- ${item}`);
  return [
    "# Field Target Pass",
    "",
    `- Generated: ${report.generated_at}`,
    `- OK: ${report.ok}`,
    `- Precheck OK: ${report.precheck_ok}`,
    `- Physical acceptance ready: ${report.physical_acceptance_ready}`,
    `- API host kind: ${report.api.host_kind}`,
    `- Watch duration seconds: ${report.watch.duration_sec}`,
    `- Snapshot count: ${report.watch.snapshot_count}`,
    `- Apply mission actions: ${report.mutation_policy.apply_mission_actions}`,
    `- Confirm User B readback: ${report.mutation_policy.confirm_user_b_readback}`,
    `- Target diagnostics preflight ready: ${targetDiagnostics.ready}`,
    `- Current APK SHA prefix: ${targetDiagnostics.apk.sha256_prefix || "missing"}`,
    `- Mutating launch matches current APK: ${targetDiagnostics.mutating_launch.matches_current_apk}`,
    `- Trusted A1/A2/A3 ready: ${report.latest_snapshot.trusted_a1_a2_a3_ready}`,
    `- Mission loop ready: ${report.latest_snapshot.mission_loop_ready}`,
    `- Field acceptance ready: ${report.latest_snapshot.field_acceptance_ready}`,
    `- Missing trusted anchors: ${report.latest_snapshot.field_acceptance.missing_trusted_anchor_ids.join(",") || "none"}`,
    `- Missing mission steps: ${report.latest_snapshot.state.missing_mission_steps.join(",") || "none"}`,
    `- User B readback ready: ${report.latest_snapshot.state.user_b_readback_ready}`,
    "",
    "## Phases",
    "",
    ...phaseLines,
    "",
    "## Actions",
    "",
    ...actionLines,
    "",
    "## Live Adapter Binding",
    "",
    `- Latest operator-paired session available: ${Boolean(report.latest_snapshot.session.latest_operator_paired_session)}`,
    `- SDK stage: ${latestOperatorSession.sdk_stage || "unknown"}`,
    `- SDK live binding ready: ${latestOperatorSession.sdk_live_binding_ready === true}`,
    `- SDK input binding ready: ${latestOperatorSession.sdk_input_binding_ready === true}`,
    `- SDK overlay binding ready: ${latestOperatorSession.sdk_overlay_binding_ready === true}`,
    "- Missing live binding items:",
    ...(liveBindingLines.length ? liveBindingLines : ["- none"]),
    "- Missing adapter checklist items:",
    ...(adapterChecklistLines.length ? adapterChecklistLines : ["- none"]),
    "",
    "## Target Diagnostics Preflight",
    "",
    `- Ready: ${targetDiagnostics.ready}`,
    `- APK exists: ${targetDiagnostics.apk.exists}`,
    `- APK size bytes: ${targetDiagnostics.apk.size_bytes}`,
    `- Token scan method: ${targetDiagnostics.target_diagnostic_tokens.scan_method}`,
    `- All target diagnostic tokens found: ${targetDiagnostics.target_diagnostic_tokens.all_found}`,
    `- Mutating launch install/run smoke: ${targetDiagnostics.mutating_launch.install_run_smoke}`,
    `- Mutating launch operator pairing verified: ${targetDiagnostics.mutating_launch.operator_pairing_verified}`,
    `- UXR current APK matches: ${targetDiagnostics.uxr_readiness.current_apk_matches}`,
    `- UXR latest mutating launch matches current APK: ${targetDiagnostics.uxr_readiness.latest_mutating_launch_matches_current_apk}`,
    `- Target index map ready: ${targetDiagnostics.uxr_readiness.target_index_map_ready}`,
    `- Hardware-ready claim allowed: ${targetDiagnostics.uxr_readiness.hardware_ready_claim_allowed}`,
    "",
    ...tokenLines,
    "",
    "## Untrusted Hardware Observations",
    "",
    ...(trustIssueLines.length ? trustIssueLines : ["- none"]),
    "",
    "## Target Logcat Diagnostics",
    "",
    "- Diagnostic counts only; raw logcat is not written.",
    `- ADB found: ${report.logcat.adb_found}`,
    `- Raw log included: ${report.logcat.raw_log_included}`,
    ...(targetLogcatLines.length ? targetLogcatLines : ["- IW_TARGET tokens: 0"]),
    "",
    "## Blockers",
    "",
    ...blockerLines,
    "",
    "## Physical Acceptance Blockers",
    "",
    ...physicalBlockerLines,
    "",
    "## Boundary",
    "",
    "This runner never creates simulator/manual calibration observations and does not claim hardware readiness. Mission/service/write-back actions require --apply-mission-actions and are gated by trusted A2/A3 evidence. User B readback requires --confirm-user-b-readback after an operator has verified the new A3 memory through the glasses."
  ].join("\n");
}

async function main() {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  adbLogcatCounts({ clear: options.clearLogcat, read: false });
  const targetDiagnosticsPreflight = collectTargetDiagnosticsPreflight();
  const initialSnapshot = await captureSnapshot(baseUrl);
  const actions = [
    ...await maybePostMissionActions(baseUrl, initialSnapshot)
  ];
  const afterMission = await captureSnapshot(baseUrl);
  actions.push(...await maybeConfirmUserBReadback(baseUrl, afterMission));
  const snapshots = await captureWatchSnapshots(baseUrl);
  const latestSnapshot = snapshots[snapshots.length - 1];
  const blockers = buildBlockers(latestSnapshot, targetDiagnosticsPreflight);
  const physicalBlockers = buildPhysicalBlockers(latestSnapshot, targetDiagnosticsPreflight);
  const physicalAcceptanceReady = physicalBlockers.length === 0
    && latestSnapshot.field_acceptance_ready === true;
  const precheckOk = latestSnapshot.live_session_ready === true
    && targetDiagnosticsPreflight.ready === true
    && targetDiagnosticsPreflight.mutating_launch.matches_current_apk === true;
  const logcat = adbLogcatCounts({ clear: false, read: options.includeLogcatCounts });
  const report = {
    schema: "innerworld-field-target-pass/v1",
    generated_at: new Date().toISOString(),
    ok: blockers.length === 0,
    precheck_ok: precheckOk,
    physical_acceptance_ready: physicalAcceptanceReady,
    api: {
      base_url_redacted: redactUrl(baseUrl),
      host_kind: hostKind(baseUrl),
      host_hash_prefix: (() => {
        try { return shaPrefix(new URL(baseUrl).hostname); } catch { return null; }
      })()
    },
    mutation_policy: {
      apply_mission_actions: options.applyMissionActions,
      confirm_user_b_readback: options.confirmUserBReadback,
      simulator_or_manual_observations_created: false,
      hardware_ready_claim_allowed: false,
      raw_pairing_codes_included: false,
      raw_session_ids_included: false
    },
    requirements: {
      require_live_session: options.requireLiveSession,
      require_target_diagnostics: options.requireTargetDiagnostics,
      require_trusted_a1_a2_a3: options.requireTrusted,
      require_mission_loop: options.requireMissionLoop
    },
    watch: {
      duration_sec: Math.max(1, Number(options.durationSec) || 1),
      interval_sec: Math.max(1, Number(options.intervalSec) || 2),
      snapshot_count: snapshots.length,
      logcat_counts_requested: options.includeLogcatCounts,
      clear_logcat_requested: options.clearLogcat,
      read_only_by_default: !options.applyMissionActions && !options.confirmUserBReadback
    },
    initial_snapshot: initialSnapshot,
    latest_snapshot: latestSnapshot,
    snapshots,
    target_diagnostics_preflight: targetDiagnosticsPreflight,
    logcat,
    actions,
    blockers,
    physical_blockers: physicalBlockers,
    privacy: {
      raw_session_ids_included: false,
      raw_device_ids_included: false,
      private_ips_included: false,
      raw_pairing_codes_included: false,
      raw_logcat_included: false
    }
  };

  await mkdir(options.outputRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const jsonPath = path.join(options.outputRoot, `field-target-pass-${stamp}.json`);
  const mdPath = path.join(options.outputRoot, `field-target-pass-${stamp}.md`);
  const latestJsonPath = path.join(options.outputRoot, "field-target-pass-latest.json");
  const latestMdPath = path.join(options.outputRoot, "field-target-pass-latest.md");
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = `${buildMarkdown(report)}\n`;
  await Promise.all([
    writeFile(jsonPath, json, "utf8"),
    writeFile(mdPath, markdown, "utf8"),
    writeFile(latestJsonPath, json, "utf8"),
    writeFile(latestMdPath, markdown, "utf8")
  ]);

  console.log(JSON.stringify({
    ok: report.ok,
    precheck_ok: report.precheck_ok,
    physical_acceptance_ready: report.physical_acceptance_ready,
    check: "field-target-pass",
    live_session_ready: latestSnapshot.live_session_ready,
    target_diagnostics_preflight_ready: targetDiagnosticsPreflight.ready,
    watch_duration_sec: report.watch.duration_sec,
    snapshot_count: report.watch.snapshot_count,
    raw_logcat_included: false,
    current_apk_sha256_prefix: targetDiagnosticsPreflight.apk.sha256_prefix,
    target_diagnostic_tokens_found: targetDiagnosticsPreflight.target_diagnostic_tokens.all_found,
    mutating_launch_matches_current_apk: targetDiagnosticsPreflight.mutating_launch.matches_current_apk,
    trusted_a1_a2_a3_ready: latestSnapshot.trusted_a1_a2_a3_ready,
    mission_loop_ready: latestSnapshot.mission_loop_ready,
    field_acceptance_ready: latestSnapshot.field_acceptance_ready,
    missing_trusted_anchor_ids: latestSnapshot.field_acceptance.missing_trusted_anchor_ids,
    missing_mission_step_ids: latestSnapshot.state.missing_mission_steps,
    user_b_readback_ready: latestSnapshot.state.user_b_readback_ready,
    mission_ledger_ready: latestSnapshot.field_acceptance.mission_ledger_ready,
    mission_missing_trusted_anchor_ids: latestSnapshot.field_acceptance.mission_missing_trusted_anchor_ids,
    trusted_mission_provenance_ready: latestSnapshot.field_acceptance.trusted_mission_provenance_ready,
    actions: actions.map((action) => ({
      id: action.id,
      ok: action.ok,
      applied: action.applied,
      skipped_reason: action.skipped_reason || null
    })),
    blockers,
    physical_blockers: physicalBlockers,
    json: jsonPath,
    markdown: mdPath
  }, null, 2));

  if (!report.ok) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
