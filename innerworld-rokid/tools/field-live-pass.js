import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const LOGCAT_PATTERNS = [
  "DllNotFoundException",
  "rokid_openxr_api",
  "UnsatisfiedLinkError",
  "TryOpenImageTracker",
  "Open Marker",
  "ImageDB",
  "IW_TARGET_EVENT",
  "IW_TARGET_IGNORED_UNKNOWN_INDEX",
  "IW_TARGET_GATE_LIVE_PAIRING_REQUIRED",
  "IW_TARGET_THROTTLED",
  "IW_TARGET_POST_START",
  "IW_TARGET_POST_RESULT",
  "IW_TARGET_POST_FAIL",
  "IW_TARGET_MISSION_ASSIST"
];

const args = process.argv.slice(2);
const options = {
  baseUrl: process.env.INNERWORLD_API_BASE_URL || "http://127.0.0.1:5177",
  durationSec: 1,
  intervalSec: 2,
  outputRoot: path.join(root, "output", "field-live-pass"),
  clearLogcat: false,
  includeLogcatCounts: false,
  requireLiveSession: false,
  requireTrusted: false,
  requireMissionLoop: false
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = args[index + 1];
  if (arg === "--base-url" && next) {
    options.baseUrl = next;
    index += 1;
  } else if (arg === "--duration-sec" && next) {
    options.durationSec = Number(next);
    index += 1;
  } else if (arg === "--interval-sec" && next) {
    options.intervalSec = Number(next);
    index += 1;
  } else if (arg === "--output-root" && next) {
    options.outputRoot = path.resolve(next);
    index += 1;
  } else if (arg === "--single") {
    options.durationSec = 1;
  } else if (arg === "--clear-logcat") {
    options.clearLogcat = true;
  } else if (arg === "--logcat") {
    options.includeLogcatCounts = true;
  } else if (arg === "--require-live-session") {
    options.requireLiveSession = true;
  } else if (arg === "--require-trusted") {
    options.requireTrusted = true;
  } else if (arg === "--require-mission-loop") {
    options.requireMissionLoop = true;
  }
}

function normalizeBaseUrl(value) {
  return String(value || "http://127.0.0.1:5177").trim().replace(/\/+$/, "");
}

function shaPrefix(value, length = 12) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex").slice(0, length);
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

function list(value) {
  return Array.isArray(value) ? value : [];
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
const ANCHOR_ACTION_LABELS = {
  A1: "Scan A1 QR entry and confirm the spatial entry.",
  A2: "Scan A2 image target and read the memory.",
  A3: "Scan A3 image target and complete TimeMark write-back."
};

async function getJson(baseUrl, apiPath) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    headers: { accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`${apiPath} returned HTTP ${response.status}`);
  }
  return response.json();
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
  const adapterChecklist = summarizeAdapterChecklist(sdk);
  return {
    session_hash_prefix: shaPrefix(session.session_id),
    device_hash_prefix: shaPrefix(session.device_id),
    profile: session.profile || null,
    client_version: session.client_version || null,
    session_status: session.session_status || null,
    heartbeat_count: Number(session.heartbeat_count) || 0,
    health_severity: session.health_severity || null,
    active_anchor: session.active_anchor || null,
    pairing_status: session.pairing_status || null,
    hardware_acceptance_eligible: session.hardware_acceptance_eligible === true,
    sdk_stage: sdk.stage || null,
    sdk_live_binding_ready: sdk.live_binding_ready === true,
    sdk_input_binding_ready: sdk.input_binding_ready === true,
    sdk_overlay_binding_ready: sdk.overlay_binding_ready === true,
    live_binding_missing_items: liveBindingMissingItems(session),
    adapter_checklist: adapterChecklist,
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
    ready_for_hardware: payload.summary?.ready_for_hardware === true,
    trusted_hardware_ready: payload.summary?.trusted_hardware_ready === true,
    trusted_hardware_evidence_count: Number(payload.summary?.trusted_hardware_evidence_count) || 0,
    trusted_hardware_session_count: Number(payload.summary?.trusted_hardware_session_count) || 0,
    trusted_hardware_anchor_ids: list(trustedEvidence.trusted_hardware_calibrated_anchor_ids),
    untrusted_hardware_anchor_ids: list(trustedEvidence.untrusted_hardware_anchor_ids),
    hardware_calibrated_anchor_ids: list(hardwareEvidence.hardware_calibrated_anchor_ids),
    missing_trusted_anchor_ids: REQUIRED_ANCHOR_IDS.filter((anchorId) => !list(trustedEvidence.trusted_hardware_calibrated_anchor_ids).includes(anchorId)),
    missing_hardware_anchor_ids: REQUIRED_ANCHOR_IDS.filter((anchorId) => !list(hardwareEvidence.hardware_calibrated_anchor_ids).includes(anchorId)),
    missing_mission_steps: list(missionEvidence.missing_steps),
    write_back_beacons: Number(missionEvidence.write_back_beacons) || 0,
    user_b_readback_ready: missionEvidence.user_b_readback_ready === true,
    trusted_mission_provenance_ready: missionEvidence.trusted_mission_provenance_ready === true,
    trusted_mission_provenance_missing: list(missionEvidence.trusted_mission_provenance?.missing),
    pending_gate_ids: list(payload.gates).filter((gate) => gate.status === "pending").map((gate) => gate.id),
    blocking_items: list(payload.blocking_items).map((item) => ({
      gate_id: item.gate_id,
      summary: item.summary
    }))
  };
}

function summarizeWall(payload) {
  const summary = payload.runtime?.summary || {};
  return {
    schema: payload.schema || null,
    ready_for_hardware: summary.ready_for_hardware === true,
    rehearsal_ready: summary.rehearsal_ready === true,
    calibrated_anchor_ids: list(summary.calibrated_anchor_ids),
    hardware_calibrated_anchor_ids: list(summary.hardware_calibrated_anchor_ids),
    trusted_hardware_calibrated_anchor_ids: list(summary.trusted_hardware_calibrated_anchor_ids),
    trusted_hardware_session_count: Number(summary.trusted_hardware_session_count) || 0,
    untrusted_hardware_anchor_ids: list(summary.untrusted_hardware_anchor_ids),
    trust_issues_by_anchor: summarizeWallTrustIssues(payload)
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

function trustIssueSummary(snapshot, anchorId) {
  const row = list(snapshot.wall_calibration?.trust_issues_by_anchor).find((item) => item.anchor_id === anchorId);
  if (!row) return "";
  const issues = [
    ...list(row.observation_issues),
    ...list(row.hardware_session?.issues)
  ].filter(Boolean);
  return [...new Set(issues)].join(", ");
}

function summarizeMission(payload) {
  const beacons = list(payload.beacons);
  const writeBackBeacons = beacons.filter((item) => {
    return /write/i.test(String(item.layer || ""))
      || /WRITE/i.test(String(item.beacon_id || ""))
      || String(item.anchor_id || "") === "A3";
  });
  return {
    active_user: payload.active_user || null,
    mission_state: payload.mission_state || null,
    current_step_index: Number(payload.current_step_index) || 0,
    completed_steps: list(payload.completed_steps),
    beacon_count: beacons.length,
    write_back_beacon_count: writeBackBeacons.length,
    user_b_readback_ready: String(payload.active_user || "").trim().toUpperCase() === "B"
      && payload.mission_state === "complete"
      && writeBackBeacons.length > 0
  };
}

function buildNextRequiredActions(snapshot) {
  const actions = [];
  if (!snapshot.live_session_ready) {
    actions.push("Start LAN server and run station:apk:pair-smoke to create an operator-paired live session.");
    const session = snapshot.session.latest_operator_paired_session || snapshot.session.latest_session;
    const missing = list(session?.live_binding_missing_items);
    if (missing.length) {
      actions.push(`Complete Rokid live adapter binding for the latest session: ${missing.join(", ")}.`);
    }
    const adapterMissing = list(session?.adapter_checklist?.missing_item_labels);
    if (adapterMissing.length) {
      actions.push(`Bind the remaining Rokid adapter checklist items before rescanning: ${adapterMissing.join(", ")}.`);
    }
  }

  const hardwareAnchorSet = new Set(snapshot.field_acceptance.hardware_calibrated_anchor_ids);
  const untrustedAnchorSet = new Set(snapshot.field_acceptance.untrusted_hardware_anchor_ids);
  for (const anchorId of snapshot.field_acceptance.missing_trusted_anchor_ids) {
    if (hardwareAnchorSet.has(anchorId) || untrustedAnchorSet.has(anchorId)) {
      const issueSummary = trustIssueSummary(snapshot, anchorId);
      const scanAction = snapshot.live_session_ready
        ? `Re-scan ${anchorId} with the current live Rokid adapter session`
        : `Re-scan or re-bind ${anchorId} through the operator-paired live SDK session`;
      actions.push(`${scanAction}; existing hardware observation is not trusted${issueSummary ? ` (${issueSummary})` : ""}.`);
    } else {
      actions.push(ANCHOR_ACTION_LABELS[anchorId] || `Scan ${anchorId} with the live Rokid session.`);
    }
  }

  for (const stepId of snapshot.field_acceptance.missing_mission_steps) {
    if (stepId === "read") actions.push("Complete the A2 memory read mission step.");
    else if (stepId === "find_year") actions.push("Complete the A2 mission clue step.");
    else if (stepId === "service_action") actions.push("Complete the controlled service action.");
    else if (stepId === "write_back") actions.push("Complete the A3 TimeMark write-back step.");
    else actions.push(`Complete mission step ${stepId}.`);
  }

  if (snapshot.mission.write_back_beacon_count < 1) {
    actions.push("Verify an A3 write-back beacon exists in /api/state.");
  }
  if (!snapshot.mission.user_b_readback_ready) {
    actions.push("Switch to User B and verify the new A3 memory is readable after write-back.");
  }
  if (!snapshot.field_acceptance.trusted_mission_provenance_ready) {
    const missing = list(snapshot.field_acceptance.trusted_mission_provenance_missing);
    actions.push(`Complete the mission through Unity/Rokid trusted session provenance${missing.length ? ` (${missing.join(",")})` : ""}.`);
  }
  if (!snapshot.field_acceptance_ready) {
    actions.push("Re-run strict field-live-pass with --require-live-session --require-trusted --require-mission-loop.");
  }

  return [...new Set(actions)];
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

async function captureSnapshot(baseUrl) {
  const [fieldAcceptance, sessions, wallCalibration, missionState] = await Promise.all([
    getJson(baseUrl, "/api/field/acceptance"),
    getJson(baseUrl, "/api/device/sessions"),
    getJson(baseUrl, "/api/calibration/wall"),
    getJson(baseUrl, "/api/state")
  ]);

  const field = summarizeFieldAcceptance(fieldAcceptance);
  const session = summarizeSessions(sessions);
  const wall = summarizeWall(wallCalibration);
  const mission = summarizeMission(missionState);
  const trustedAnchorSet = new Set(field.trusted_hardware_anchor_ids);
  const hardwareAnchorSet = new Set(field.hardware_calibrated_anchor_ids);
  const missionStepSet = new Set(mission.completed_steps);
  const missingMissionStepIds = REQUIRED_MISSION_STEP_IDS.filter((stepId) => !missionStepSet.has(stepId));

  const snapshot = {
    captured_at: new Date().toISOString(),
    live_session_ready: session.live_operator_paired_ready_count > 0,
    trusted_a1_a2_a3_ready: REQUIRED_ANCHOR_IDS.every((anchorId) => trustedAnchorSet.has(anchorId)),
    hardware_a1_a2_a3_ready: REQUIRED_ANCHOR_IDS.every((anchorId) => hardwareAnchorSet.has(anchorId)),
    missing_trusted_anchor_ids: REQUIRED_ANCHOR_IDS.filter((anchorId) => !trustedAnchorSet.has(anchorId)),
    missing_hardware_anchor_ids: REQUIRED_ANCHOR_IDS.filter((anchorId) => !hardwareAnchorSet.has(anchorId)),
    missing_mission_step_ids: missingMissionStepIds,
    mission_loop_ready: missingMissionStepIds.length === 0
      && mission.write_back_beacon_count > 0
      && mission.user_b_readback_ready === true
      && field.trusted_mission_provenance_ready === true,
    field_acceptance_ready: field.ready === true,
    session,
    field_acceptance: field,
    wall_calibration: wall,
    mission
  };
  snapshot.next_required_actions = buildNextRequiredActions(snapshot);
  return snapshot;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueSnapshots(snapshots) {
  if (snapshots.length <= 6) return snapshots;
  return [
    snapshots[0],
    ...snapshots.slice(Math.max(1, snapshots.length - 5))
  ];
}

function buildMarkdown(report) {
  const latest = report.latest_snapshot;
  const blockers = report.blockers.length
    ? report.blockers.map((item) => `- ${item}`)
    : ["- none"];
  const targetLogCounts = (report.logcat?.pattern_counts || [])
    .filter((item) => String(item.pattern || "").startsWith("IW_TARGET_"))
    .map((item) => `- ${item.pattern}: ${item.count}`);
  const trustIssueLines = list(latest.wall_calibration.trust_issues_by_anchor)
    .filter((item) => item.hardware_mode && item.hardware_observation_trusted !== true)
    .map((item) => {
      const issues = [
        ...list(item.observation_issues),
        ...list(item.hardware_session?.issues)
      ].filter(Boolean);
      return `- ${item.anchor_id}: mode=${item.latest_tracking_mode || "unknown"} status=${item.latest_status || "unknown"} issues=${[...new Set(issues)].join(",") || "none"} sdk_stage=${item.hardware_session?.sdk_binding_stage || "unknown"} pairing=${item.hardware_session?.pairing_status_at_observation || "unknown"}`;
    });
  const latestOperatorSession = latest.session.latest_operator_paired_session || latest.session.latest_session || {};
  const liveBindingLines = list(latestOperatorSession.live_binding_missing_items).map((item) => `- ${item}`);
  const adapterChecklistLines = list(latestOperatorSession.adapter_checklist?.missing_item_labels).map((item) => `- ${item}`);
  return [
    "# Field Live Pass",
    "",
    `- Generated: ${report.generated_at}`,
    `- OK: ${report.ok}`,
    `- API host kind: ${report.api.host_kind}`,
    `- Live session ready: ${latest.live_session_ready}`,
    `- Trusted A1/A2/A3 ready: ${latest.trusted_a1_a2_a3_ready}`,
    `- Hardware A1/A2/A3 ready: ${latest.hardware_a1_a2_a3_ready}`,
    `- Mission loop ready: ${latest.mission_loop_ready}`,
    `- User B readback ready: ${latest.mission.user_b_readback_ready}`,
    `- Field acceptance ready: ${latest.field_acceptance_ready}`,
    `- Online sessions: ${latest.session.online_count}`,
    `- Live operator-paired sessions: ${latest.session.live_operator_paired_ready_count}`,
    `- Trusted hardware anchors: ${latest.field_acceptance.trusted_hardware_anchor_ids.join(",") || "none"}`,
    `- Hardware anchors: ${latest.field_acceptance.hardware_calibrated_anchor_ids.join(",") || "none"}`,
    `- Missing trusted anchors: ${latest.missing_trusted_anchor_ids.join(",") || "none"}`,
    `- Missing hardware anchors: ${latest.missing_hardware_anchor_ids.join(",") || "none"}`,
    `- Missing mission steps: ${latest.missing_mission_step_ids.join(",") || "none"}`,
    `- Pending gates: ${latest.field_acceptance.pending_gate_ids.join(",") || "none"}`,
    `- Completed mission steps: ${latest.mission.completed_steps.join(",") || "none"}`,
    `- Active user: ${latest.mission.active_user || "unknown"}`,
    `- Beacon count: ${latest.mission.beacon_count}`,
    `- Write-back beacons: ${latest.mission.write_back_beacon_count}`,
    `- Raw session ids included: false`,
    `- Raw logcat included: false`,
    "",
    "## Blockers",
    "",
    ...blockers,
    "",
    "## Next Required Actions",
    "",
    ...(latest.next_required_actions.length ? latest.next_required_actions.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Live Adapter Binding",
    "",
    `- Latest operator-paired session available: ${Boolean(latest.session.latest_operator_paired_session)}`,
    `- SDK stage: ${latestOperatorSession.sdk_stage || "unknown"}`,
    `- SDK live binding ready: ${latestOperatorSession.sdk_live_binding_ready === true}`,
    `- SDK input binding ready: ${latestOperatorSession.sdk_input_binding_ready === true}`,
    `- SDK overlay binding ready: ${latestOperatorSession.sdk_overlay_binding_ready === true}`,
    "- Missing live binding items:",
    ...(liveBindingLines.length ? liveBindingLines : ["- none"]),
    "- Missing adapter checklist items:",
    ...(adapterChecklistLines.length ? adapterChecklistLines : ["- none"]),
    "",
    "## Untrusted Hardware Observations",
    "",
    ...(trustIssueLines.length ? trustIssueLines : ["- none"]),
    "",
    "## Target Logcat Diagnostics",
    "",
    "- Diagnostic counts only; raw logcat is not written.",
    ...(targetLogCounts.length ? targetLogCounts : ["- IW_TARGET tokens: 0"]),
    "",
    "## Boundary",
    "",
    "This report watches the live field pass. It does not create simulator/manual observations and cannot claim hardware readiness unless the live API reports trusted A1/A2/A3 evidence plus the P0 mission/write-back loop."
  ].join("\n");
}

async function main() {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const startedAt = new Date();
  const snapshots = [];
  adbLogcatCounts({ clear: options.clearLogcat, read: false });

  const durationMs = Math.max(1, Number(options.durationSec) || 1) * 1000;
  const intervalMs = Math.max(1, Number(options.intervalSec) || 2) * 1000;
  const deadline = startedAt.getTime() + durationMs;

  do {
    snapshots.push(await captureSnapshot(baseUrl));
    if (Date.now() + intervalMs > deadline) break;
    await sleep(intervalMs);
  } while (Date.now() < deadline);

  const latest = snapshots[snapshots.length - 1];
  const blockers = [];
  if (options.requireLiveSession && !latest.live_session_ready) blockers.push("live_operator_paired_sdk_session_missing");
  if (options.requireTrusted && !latest.trusted_a1_a2_a3_ready) blockers.push("trusted_a1_a2_a3_observations_missing");
  if (options.requireMissionLoop && !latest.mission_loop_ready) blockers.push("p0_mission_writeback_user_b_loop_missing");
  if (options.requireMissionLoop && latest.field_acceptance.trusted_mission_provenance_ready !== true) blockers.push("trusted_mission_provenance_missing");

  const report = {
    schema: "innerworld-field-live-pass/v1",
    generated_at: new Date().toISOString(),
    ok: blockers.length === 0,
    api: {
      api_base_url_redacted: redactUrl(baseUrl),
      host_kind: hostKind(baseUrl),
      host_hash_prefix: (() => {
        try { return shaPrefix(new URL(baseUrl).hostname); } catch { return null; }
      })()
    },
    duration_sec: Math.max(1, Number(options.durationSec) || 1),
    interval_sec: Math.max(1, Number(options.intervalSec) || 2),
    requirements: {
      require_live_session: options.requireLiveSession,
      require_trusted_a1_a2_a3: options.requireTrusted,
      require_mission_loop: options.requireMissionLoop
    },
    latest_snapshot: latest,
    snapshots: uniqueSnapshots(snapshots),
    logcat: adbLogcatCounts({ clear: false, read: options.includeLogcatCounts }),
    blockers,
    privacy: {
      raw_session_ids_included: false,
      raw_device_ids_included: false,
      raw_logcat_included: false,
      private_ips_included: false,
      note: "Session/device identifiers are hashed; raw logcat is never written."
    }
  };

  await mkdir(options.outputRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const jsonPath = path.join(options.outputRoot, `field-live-pass-${stamp}.json`);
  const mdPath = path.join(options.outputRoot, `field-live-pass-${stamp}.md`);
  const latestJsonPath = path.join(options.outputRoot, "field-live-pass-latest.json");
  const latestMdPath = path.join(options.outputRoot, "field-live-pass-latest.md");
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
    check: "field-live-pass",
    live_session_ready: latest.live_session_ready,
    trusted_a1_a2_a3_ready: latest.trusted_a1_a2_a3_ready,
    hardware_a1_a2_a3_ready: latest.hardware_a1_a2_a3_ready,
    mission_loop_ready: latest.mission_loop_ready,
    field_acceptance_ready: latest.field_acceptance_ready,
    online_sessions: latest.session.online_count,
    live_operator_paired_sessions: latest.session.live_operator_paired_ready_count,
    trusted_hardware_anchor_ids: latest.field_acceptance.trusted_hardware_anchor_ids,
    missing_trusted_anchor_ids: latest.missing_trusted_anchor_ids,
    missing_hardware_anchor_ids: latest.missing_hardware_anchor_ids,
    missing_mission_step_ids: latest.missing_mission_step_ids,
    user_b_readback_ready: latest.mission.user_b_readback_ready,
    trusted_mission_provenance_ready: latest.field_acceptance.trusted_mission_provenance_ready,
    pending_gate_ids: latest.field_acceptance.pending_gate_ids,
    next_required_actions: latest.next_required_actions,
    blockers,
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
