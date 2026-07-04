import { createHash } from "node:crypto";
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
  requireMissionLoop: false
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
  }
}

const REQUIRED_ANCHOR_IDS = ["A1", "A2", "A3"];
const REQUIRED_MISSION_STEP_IDS = ["read", "find_year", "service_action", "write_back"];
const SPACE_ID = "innerworld_campus_wall";

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

function summarizeSessions(payload) {
  const sessions = list(payload.sessions);
  const online = sessions.filter((item) => item.session_status === "online");
  const liveOperatorPaired = online.filter((item) => {
    const sdk = item.sdk_binding_status || {};
    return item.pairing_status === "operator_paired"
      && item.hardware_acceptance_eligible === true
      && sdk.live_binding_ready === true
      && sdk.input_binding_ready === true
      && sdk.overlay_binding_ready === true;
  });
  const latest = liveOperatorPaired.slice().sort((left, right) => Date.parse(right.created_at || 0) - Date.parse(left.created_at || 0))[0] || null;
  return {
    total: Number(payload.total) || sessions.length,
    online_count: online.length,
    live_operator_paired_ready_count: liveOperatorPaired.length,
    latest_live_operator_paired_session: latest ? {
      session_hash_prefix: shaPrefix(latest.session_id),
      device_hash_prefix: shaPrefix(latest.device_id),
      profile: latest.profile || null,
      heartbeat_count: Number(latest.heartbeat_count) || 0,
      active_anchor: latest.active_anchor || null,
      sdk_stage: latest.sdk_binding_status?.stage || null,
      raw_session_ids_included: false
    } : null,
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
    missing_mission_steps: list(missionEvidence.missing_steps),
    write_back_beacons: Number(missionEvidence.write_back_beacons) || 0,
    user_b_readback_ready: missionEvidence.user_b_readback_ready === true,
    pending_gate_ids: list(payload.gates).filter((gate) => gate.status === "pending").map((gate) => gate.id)
  };
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

function buildPhases(snapshot) {
  const trusted = new Set(snapshot.field_acceptance.trusted_hardware_anchor_ids);
  const completed = new Set(snapshot.state.completed_steps);
  const writeBackReady = snapshot.state.write_back_beacon_count > 0 && completed.has("write_back");
  return [
    {
      id: "live_session",
      title: "Operator-paired live SDK session",
      status: snapshot.live_session_ready ? "ready" : "pending",
      required: ["online_session", "operator_pairing", "live/input/overlay SDK binding"],
      action: "Run station:apk:pair-smoke or keep the current Rokid Unity APK foregrounded until /api/device/sessions shows one live operator-paired session."
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
      action: "Frame A2 through the live Rokid image target; with --apply-mission-actions, the runner posts read/find_year only after trusted A2 exists."
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
      action: "Frame A3 through the live Rokid image target; with --apply-mission-actions, the runner posts a fixed TimeMark only after service_action is complete."
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
  const [fieldAcceptance, sessions, state] = await Promise.all([
    requestJson(baseUrl, "/api/field/acceptance"),
    requestJson(baseUrl, "/api/device/sessions"),
    requestJson(baseUrl, "/api/state")
  ]);
  const snapshot = {
    captured_at: new Date().toISOString(),
    session: summarizeSessions(sessions),
    field_acceptance: summarizeFieldAcceptance(fieldAcceptance),
    state: summarizeState(state)
  };
  snapshot.live_session_ready = snapshot.session.live_operator_paired_ready_count > 0;
  snapshot.trusted_a1_a2_a3_ready = REQUIRED_ANCHOR_IDS.every((anchorId) => hasTrustedAnchor(snapshot, anchorId));
  snapshot.mission_loop_ready = snapshot.state.missing_mission_steps.length === 0
    && snapshot.state.write_back_beacon_count > 0
    && snapshot.state.user_b_readback_ready === true;
  snapshot.field_acceptance_ready = snapshot.field_acceptance.ready === true;
  snapshot.phases = buildPhases(snapshot);
  return snapshot;
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

function buildBlockers(snapshot) {
  const blockers = [];
  if (options.requireLiveSession && !snapshot.live_session_ready) blockers.push("live_operator_paired_sdk_session_missing");
  if (options.requireTrusted && !snapshot.trusted_a1_a2_a3_ready) blockers.push("trusted_a1_a2_a3_observations_missing");
  if (options.requireMissionLoop && !snapshot.mission_loop_ready) blockers.push("p0_mission_writeback_user_b_loop_missing");
  return blockers;
}

function buildMarkdown(report) {
  const phaseLines = report.latest_snapshot.phases.map((phase) => `- ${phase.id}: ${phase.status} | ${phase.action}`);
  const actionLines = report.actions.length
    ? report.actions.map((action) => `- ${action.id}: applied=${action.applied}, ok=${action.ok}${action.skipped_reason ? `, skipped=${action.skipped_reason}` : ""}`)
    : ["- none"];
  const blockerLines = report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ["- none"];
  return [
    "# Field Target Pass",
    "",
    `- Generated: ${report.generated_at}`,
    `- OK: ${report.ok}`,
    `- API host kind: ${report.api.host_kind}`,
    `- Apply mission actions: ${report.mutation_policy.apply_mission_actions}`,
    `- Confirm User B readback: ${report.mutation_policy.confirm_user_b_readback}`,
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
    "## Blockers",
    "",
    ...blockerLines,
    "",
    "## Boundary",
    "",
    "This runner never creates simulator/manual calibration observations and does not claim hardware readiness. Mission/service/write-back actions require --apply-mission-actions and are gated by trusted A2/A3 evidence. User B readback requires --confirm-user-b-readback after an operator has verified the new A3 memory through the glasses."
  ].join("\n");
}

async function main() {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const initialSnapshot = await captureSnapshot(baseUrl);
  const actions = [
    ...await maybePostMissionActions(baseUrl, initialSnapshot)
  ];
  const afterMission = await captureSnapshot(baseUrl);
  actions.push(...await maybeConfirmUserBReadback(baseUrl, afterMission));
  const latestSnapshot = await captureSnapshot(baseUrl);
  const blockers = buildBlockers(latestSnapshot);
  const report = {
    schema: "innerworld-field-target-pass/v1",
    generated_at: new Date().toISOString(),
    ok: blockers.length === 0,
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
      require_trusted_a1_a2_a3: options.requireTrusted,
      require_mission_loop: options.requireMissionLoop
    },
    initial_snapshot: initialSnapshot,
    latest_snapshot: latestSnapshot,
    actions,
    blockers,
    privacy: {
      raw_session_ids_included: false,
      raw_device_ids_included: false,
      private_ips_included: false,
      raw_pairing_codes_included: false
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
    check: "field-target-pass",
    live_session_ready: latestSnapshot.live_session_ready,
    trusted_a1_a2_a3_ready: latestSnapshot.trusted_a1_a2_a3_ready,
    mission_loop_ready: latestSnapshot.mission_loop_ready,
    field_acceptance_ready: latestSnapshot.field_acceptance_ready,
    missing_trusted_anchor_ids: latestSnapshot.field_acceptance.missing_trusted_anchor_ids,
    missing_mission_step_ids: latestSnapshot.state.missing_mission_steps,
    user_b_readback_ready: latestSnapshot.state.user_b_readback_ready,
    actions: actions.map((action) => ({
      id: action.id,
      ok: action.ok,
      applied: action.applied,
      skipped_reason: action.skipped_reason || null
    })),
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
