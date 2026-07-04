import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OPERATOR_PLAN_ENDPOINT = "/api/field/operator-plan";
const OUTPUT_RELATIVE_ROOT = "output/field-operator-plan";
const PLAN_SCHEMA = "innerworld-field-operator-plan/v1";
const REPORT_SCHEMA = "innerworld-field-operator-plan-report/v1";

const args = process.argv.slice(2);
const options = {
  baseUrl: process.env.INNERWORLD_API_BASE_URL || "http://127.0.0.1:5177",
  outputRoot: path.join(root, ...OUTPUT_RELATIVE_ROOT.split("/")),
  requirePrecheck: false,
  requireLiveSession: false,
  requirePhysicalAcceptance: false,
  requireHardwareReadyClaim: false
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
  } else if (arg === "--require-precheck") {
    options.requirePrecheck = true;
  } else if (arg === "--require-live-session") {
    options.requireLiveSession = true;
  } else if (arg === "--require-physical-acceptance") {
    options.requirePhysicalAcceptance = true;
  } else if (arg === "--require-hardware-ready-claim") {
    options.requireHardwareReadyClaim = true;
  }
}

function normalizeBaseUrl(value) {
  return String(value || "http://127.0.0.1:5177").trim().replace(/\/+$/, "");
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function bool(value) {
  return value === true;
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

async function requestOperatorPlan(baseUrl) {
  const response = await fetch(`${baseUrl}${OPERATOR_PLAN_ENDPOINT}`, {
    method: "GET",
    headers: { accept: "application/json" }
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { ok: false, error: "invalid_json_response" };
  }
  if (!response.ok) {
    throw new Error(`GET ${OPERATOR_PLAN_ENDPOINT} returned HTTP ${response.status}: ${payload?.error || "request_failed"}`);
  }
  return payload;
}

function phaseRows(plan) {
  return list(plan?.phases).map((phase, index) => ({
    index: index + 1,
    id: phase.id || null,
    label: phase.label || phase.id || null,
    anchor_id: phase.anchor_id || null,
    status: phase.status || "unknown",
    mutates_state: bool(phase.mutates_state),
    required_evidence: list(phase.required_evidence),
    blockers: list(phase.blockers),
    operator_actions: list(phase.operator_actions)
  }));
}

function buildBlockers(plan) {
  const blockers = [];
  const readiness = plan?.readiness || {};
  if (plan?.schema !== PLAN_SCHEMA) blockers.push("operator_plan_schema_mismatch");
  if (options.requirePrecheck && !bool(readiness.precheck_ok)) blockers.push("field_precheck_not_ready");
  if (options.requireLiveSession && !bool(readiness.live_session_ready)) blockers.push("operator_paired_live_sdk_session_missing");
  if (options.requirePhysicalAcceptance && !bool(readiness.physical_acceptance_ready)) blockers.push("physical_acceptance_not_ready");
  if (options.requireHardwareReadyClaim && !bool(readiness.hardware_ready_claim_allowed)) blockers.push("hardware_ready_claim_not_allowed");
  return blockers;
}

function buildReport(plan, baseUrl) {
  const blockers = buildBlockers(plan);
  const phases = phaseRows(plan);
  const current = phases.find((phase) => phase.id === plan?.current_phase) || phases.find((phase) => phase.status !== "ready") || phases[0] || null;
  return {
    schema: REPORT_SCHEMA,
    generated_at: new Date().toISOString(),
    ok: blockers.length === 0,
    api: {
      method: "GET",
      endpoint: OPERATOR_PLAN_ENDPOINT,
      base_url_redacted: redactUrl(baseUrl),
      host_kind: hostKind(baseUrl),
      host_hash_prefix: (() => {
        try { return shaPrefix(new URL(baseUrl).hostname); } catch { return null; }
      })()
    },
    requirements: {
      require_precheck: options.requirePrecheck,
      require_live_session: options.requireLiveSession,
      require_physical_acceptance: options.requirePhysicalAcceptance,
      require_hardware_ready_claim: options.requireHardwareReadyClaim
    },
    current_phase: plan?.current_phase || current?.id || null,
    phase_index: Number(plan?.phase_index) || current?.index || 0,
    total_phases: Number(plan?.total_phases) || phases.length,
    next_actions: list(plan?.next_actions),
    readiness: plan?.readiness || {},
    sanitized_summary: plan?.sanitized_summary || {},
    phase_table: phases,
    source_of_truth: plan?.source_of_truth || {},
    blockers,
    hardware_ready_claim_allowed: bool(plan?.readiness?.hardware_ready_claim_allowed),
    privacy: {
      read_only_endpoint: true,
      mission_state_mutated: false,
      simulator_or_manual_observations_created: false,
      evidence_files_written: false,
      adb_or_logcat_run: false,
      raw_serials_included: false,
      usb_ids_included: false,
      raw_session_ids_included: false,
      session_ids_included: false,
      raw_device_ids_included: false,
      device_ids_included: false,
      private_ips_included: false,
      raw_pairing_codes_included: false,
      pairing_codes_included: false,
      raw_pose_or_ray_included: false,
      raw_logcat_included: false,
      raw_logcat_or_dumpsys_included: false,
      field_operator_plan_report_written: true
    },
    p0_scope_guard: {
      campus_wall_only: plan?.scope_guard?.campus_wall_only === true,
      a1_a2_a3_user_b_only: plan?.scope_guard?.a1_a2_a3_user_b_only === true,
      guide_app_or_ppt: plan?.scope_guard?.guide_app_or_ppt === true,
      phone_page: plan?.scope_guard?.phone_page === true,
      open_ugc: plan?.scope_guard?.open_ugc === true,
      backend_expansion: plan?.scope_guard?.backend_expansion === true,
      broad_route: plan?.scope_guard?.broad_route === true
    },
    raw_operator_plan: {
      schema: plan?.schema || null,
      endpoint: plan?.endpoint || null,
      privacy: plan?.privacy || {},
      scope_guard: plan?.scope_guard || {}
    }
  };
}

function markdownList(items, fallback = "- none") {
  const rows = list(items).filter(Boolean);
  return rows.length ? rows.map((item) => `- ${item}`) : [fallback];
}

function markdownBool(value) {
  return value === true ? "true" : "false";
}

function phaseTableRows(phases) {
  if (!phases.length) return ["| none | none | none | false | none |", "| --- | --- | --- | --- | --- |"];
  return [
    "| Phase | Status | Anchor | Mutates state | Blockers |",
    "| --- | --- | --- | --- | --- |",
    ...phases.map((phase) => {
      const blockers = phase.blockers.length ? phase.blockers.join("; ") : "none";
      return `| ${phase.label || phase.id} | ${phase.status} | ${phase.anchor_id || "none"} | ${phase.mutates_state} | ${blockers.replace(/\|/g, "/")} |`;
    })
  ];
}

function buildMarkdown(report) {
  const readiness = report.readiness || {};
  const summary = report.sanitized_summary || {};
  const sourceRows = Object.entries(report.source_of_truth || {}).map(([key, value]) => `- ${key}: ${value}`);
  return [
    "# Field Operator Plan",
    "",
    `- Generated: ${report.generated_at}`,
    `- OK: ${report.ok}`,
    `- API host kind: ${report.api.host_kind}`,
    `- API endpoint: GET ${report.api.endpoint}`,
    `- Current phase: ${report.current_phase || "unknown"} (${report.phase_index}/${report.total_phases})`,
    `- Precheck OK: ${markdownBool(readiness.precheck_ok)}`,
    `- Live session ready: ${markdownBool(readiness.live_session_ready)}`,
    `- Trusted A1/A2/A3 ready: ${markdownBool(readiness.trusted_a1_a2_a3_ready)}`,
    `- Mission loop ready: ${markdownBool(readiness.mission_loop_ready)}`,
    `- User B readback ready: ${markdownBool(readiness.user_b_readback_ready)}`,
    `- Physical acceptance ready: ${markdownBool(readiness.physical_acceptance_ready)}`,
    `- Hardware-ready claim allowed: ${markdownBool(readiness.hardware_ready_claim_allowed)}`,
    `- Missing trusted anchors: ${list(summary.missing_trusted_anchor_ids).join(",") || "none"}`,
    `- Write-back beacons: ${Number(summary.write_back_beacon_count) || 0}`,
    `- Field acceptance status: ${summary.field_acceptance_status || "unknown"}`,
    "",
    "## Next Actions",
    "",
    ...markdownList(report.next_actions),
    "",
    "## Phase Table",
    "",
    ...phaseTableRows(report.phase_table),
    "",
    "## Source Of Truth",
    "",
    ...(sourceRows.length ? sourceRows : ["- none"]),
    "",
    "## Blockers",
    "",
    ...markdownList(report.blockers),
    "",
    "## P0 Scope Guard",
    "",
    `- Campus wall only: ${markdownBool(report.p0_scope_guard.campus_wall_only)}`,
    `- A1/A2/A3/User B only: ${markdownBool(report.p0_scope_guard.a1_a2_a3_user_b_only)}`,
    `- Guide app or PPT: ${markdownBool(report.p0_scope_guard.guide_app_or_ppt)}`,
    `- Phone page: ${markdownBool(report.p0_scope_guard.phone_page)}`,
    `- Open UGC: ${markdownBool(report.p0_scope_guard.open_ugc)}`,
    `- Backend expansion: ${markdownBool(report.p0_scope_guard.backend_expansion)}`,
    `- Broad route: ${markdownBool(report.p0_scope_guard.broad_route)}`,
    "",
    "## Privacy",
    "",
    `- Read-only endpoint: ${markdownBool(report.privacy.read_only_endpoint)}`,
    `- Mission state mutated: ${markdownBool(report.privacy.mission_state_mutated)}`,
    `- Simulator/manual observations created: ${markdownBool(report.privacy.simulator_or_manual_observations_created)}`,
    `- Evidence files written: ${markdownBool(report.privacy.evidence_files_written)}`,
    `- ADB or logcat run: ${markdownBool(report.privacy.adb_or_logcat_run)}`,
    `- Raw serials included: ${markdownBool(report.privacy.raw_serials_included)}`,
    `- Raw session ids included: ${markdownBool(report.privacy.session_ids_included)}`,
    `- Raw device ids included: ${markdownBool(report.privacy.device_ids_included)}`,
    `- Private IPs included: ${markdownBool(report.privacy.private_ips_included)}`,
    `- Pairing codes included: ${markdownBool(report.privacy.pairing_codes_included)}`,
    `- Raw pose/ray included: ${markdownBool(report.privacy.raw_pose_or_ray_included)}`,
    `- Raw logcat/dumpsys included: ${markdownBool(report.privacy.raw_logcat_or_dumpsys_included)}`,
    "",
    "## Boundary",
    "",
    "This command only snapshots the read-only field operator plan. It does not run ADB/logcat, does not create simulator/manual observations, does not write field evidence, and cannot claim hardware-ready unless the live Space API plan and `/api/field/acceptance` are already physically ready for the real A1/A2/A3 -> A3 TimeMark -> User B loop."
  ].join("\n");
}

async function main() {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const plan = await requestOperatorPlan(baseUrl);
  const report = buildReport(plan, baseUrl);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const jsonPath = path.join(options.outputRoot, `field-operator-plan-${stamp}.json`);
  const mdPath = path.join(options.outputRoot, `field-operator-plan-${stamp}.md`);
  const latestJsonPath = path.join(options.outputRoot, "field-operator-plan-latest.json");
  const latestMdPath = path.join(options.outputRoot, "field-operator-plan-latest.md");
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = `${buildMarkdown(report)}\n`;

  await mkdir(options.outputRoot, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, json, "utf8"),
    writeFile(mdPath, markdown, "utf8"),
    writeFile(latestJsonPath, json, "utf8"),
    writeFile(latestMdPath, markdown, "utf8")
  ]);

  console.log(JSON.stringify({
    ok: report.ok,
    check: "field-operator-plan",
    schema: report.schema,
    current_phase: report.current_phase,
    phase_index: report.phase_index,
    total_phases: report.total_phases,
    precheck_ok: report.readiness.precheck_ok === true,
    live_session_ready: report.readiness.live_session_ready === true,
    trusted_a1_a2_a3_ready: report.readiness.trusted_a1_a2_a3_ready === true,
    mission_loop_ready: report.readiness.mission_loop_ready === true,
    user_b_readback_ready: report.readiness.user_b_readback_ready === true,
    physical_acceptance_ready: report.readiness.physical_acceptance_ready === true,
    hardware_ready_claim_allowed: report.hardware_ready_claim_allowed,
    missing_trusted_anchor_ids: report.sanitized_summary.missing_trusted_anchor_ids || [],
    write_back_beacon_count: Number(report.sanitized_summary.write_back_beacon_count) || 0,
    next_actions: report.next_actions,
    blockers: report.blockers,
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
