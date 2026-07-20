import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const CHECK_NAME = "field-operator-plan";
const CLI_PATH = "tools/field-operator-plan.js";
const PLAN_SCHEMA = "innerworld-field-operator-plan/v1";
const REPORT_SCHEMA = "innerworld-field-operator-plan-report/v1";
const ENDPOINT_PATH = "/api/field/operator-plan";
const OUTPUT_DIR = "output/field-operator-plan";
const OUTPUT_JSON = "field-operator-plan-latest.json";
const OUTPUT_MARKDOWN = "field-operator-plan-latest.md";
const useApi = process.argv.includes("--api") || process.env.CHECK_FIELD_OPERATOR_PLAN_API === "1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readText(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`${relativePath} missing`);
    }
    throw error;
  }
}

async function readJson(relativePath) {
  const raw = await readText(relativePath);
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function hasPattern(text, pattern) {
  return pattern.test(text);
}

function assertIncludes(text, needle, message) {
  assert(text.includes(needle), message);
}

function assertMatches(text, pattern, message) {
  assert(hasPattern(text, pattern), message);
}

function assertFalseGuard(text, patterns, message) {
  const hasGuard = patterns.some((pattern) => {
    const source = pattern.source;
    const flags = pattern.flags.includes("i") ? pattern.flags : `${pattern.flags}i`;
    const guardPattern = new RegExp(
      `(?:${source})[\\s\\S]{0,140}\\bfalse\\b|\\bfalse\\b[\\s\\S]{0,140}(?:${source})`,
      flags
    );
    return guardPattern.test(text);
  });
  assert(hasGuard, message);
}

function assertNoPattern(text, pattern, message) {
  assert(!pattern.test(text), message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLocalBaseUrl(port) {
  return `http://127.0.0.1:${port}`;
}

function assertJsonObject(value, message) {
  assert(value && typeof value === "object" && !Array.isArray(value), message);
}

function assertBooleanField(value, key, expected = undefined) {
  assert(typeof value?.[key] === "boolean", `${key} boolean field missing`);
  if (expected !== undefined) assert(value[key] === expected, `${key} must be ${expected}`);
}

function assertPathInside(parentPath, childPath, message) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  assert(child === parent || child.startsWith(parent + path.sep), message);
}

async function readAbsoluteJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

async function readAbsoluteText(filePath) {
  return readFile(filePath, "utf8");
}

function assertCliContract(tool) {
  assertIncludes(tool, REPORT_SCHEMA, "field operator plan report schema missing");
  assertIncludes(tool, ENDPOINT_PATH, "field operator plan CLI endpoint path missing");
  assertMatches(
    tool,
    /method\s*:\s*["']GET["']|["']GET["'][\s\S]{0,120}\/api\/field\/operator-plan|\/api\/field\/operator-plan[\s\S]{0,120}["']GET["']/i,
    "field operator plan CLI must explicitly use GET"
  );
  assertIncludes(tool, OUTPUT_DIR, "field operator plan output directory missing");
  assertIncludes(tool, OUTPUT_JSON, "field operator plan JSON output path missing");
  assertIncludes(tool, OUTPUT_MARKDOWN, "field operator plan Markdown output path missing");
  assertMatches(tool, /writeFile\s*\(/, "field operator plan CLI must write report files");

  assertNoPattern(tool, /node:child_process|from\s+["']child_process["']|require\(["']child_process["']\)/, "field operator plan CLI must not shell out");
  assertNoPattern(tool, /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\s*\(/, "field operator plan CLI must not run external commands");
  assertNoPattern(tool, /\badb(?:\.exe)?\s+(?:shell|devices|logcat|install|push|pull|forward|tcpip|connect|disconnect)\b/i, "field operator plan CLI must not run adb");
  assertNoPattern(tool, /\blogcat\s*(?:\||>|-|$)/im, "field operator plan CLI must not run logcat");
  assertNoPattern(tool, /\/api\/calibration\/observations|submitWallCalibrationObservation|createWallCalibrationObservation/i, "field operator plan CLI must not create simulator/manual observations");
  assertNoPattern(tool, /(?:output|data)[\\/]+(?:evidence|observations)\b/i, "field operator plan CLI must not write evidence or observations paths");

  assertFalseGuard(tool, [/adb[\w-]{0,48}(?:invoked|run|ran|executed|used)/i], "field operator plan CLI adb/logcat guard missing");
  assertFalseGuard(tool, [/logcat[\w-]{0,48}(?:invoked|run|ran|executed|used)/i], "field operator plan CLI logcat guard missing");
  assertFalseGuard(tool, [/simulator[_-]?or[_-]?manual[_-]?observations[_-]?created/i, /manual[_-]?observations[_-]?created/i], "field operator plan CLI simulator/manual observation guard missing");
  assertFalseGuard(tool, [/evidence(?:[_-]?files)?[_-]?(?:written|created)/i, /writes[_-]?evidence/i], "field operator plan CLI evidence write guard missing");
  assertFalseGuard(tool, [/raw[_-]?serial(?:s|[_-]?numbers?|[_-]?ids?)?[_-]?included/i], "field operator plan CLI raw serial privacy guard missing");
  assertFalseGuard(tool, [/raw[_-]?session(?:s|[_-]?ids?)?[_-]?included/i], "field operator plan CLI raw session privacy guard missing");
  assertFalseGuard(tool, [/raw[_-]?device(?:s|[_-]?ids?)?[_-]?included/i], "field operator plan CLI raw device privacy guard missing");
  assertFalseGuard(tool, [/private[_-]?ips?[_-]?included/i, /private[_-]?ip[_-]?addresses[_-]?included/i], "field operator plan CLI private IP privacy guard missing");
  assertFalseGuard(tool, [/raw[_-]?pairing(?:[_-]?codes?)?[_-]?included/i], "field operator plan CLI raw pairing privacy guard missing");
  assertFalseGuard(tool, [/raw[_-]?pose(?:s|[_-]?rays?)?[_-]?included/i, /raw[_-]?pose[_-]?or[_-]?ray[_-]?included/i], "field operator plan CLI raw pose privacy guard missing");
  assertFalseGuard(tool, [/raw[_-]?logcat[_-]?included/i], "field operator plan CLI raw logcat privacy guard missing");

  assertIncludes(tool, "current_phase", "field operator plan CLI current phase output missing");
  assertMatches(tool, /readiness/i, "field operator plan CLI readiness output missing");
  assertMatches(tool, /next[_\s-]?actions/i, "field operator plan CLI next actions output missing");
  assertMatches(tool, /phase[_\s-]?table/i, "field operator plan CLI phase table output missing");
  assertMatches(tool, /source[_\s-]?of[_\s-]?truth/i, "field operator plan CLI source of truth output missing");
  assertMatches(tool, /p0[_\s-]?scope[_\s-]?guard|P0\s+scope\s+guard/i, "field operator plan CLI P0 scope guard output missing");
}

function assertPackageScripts(packageJson) {
  const scripts = packageJson.scripts || {};
  const operatorPlan = scripts["field:operator-plan"] || "";
  const check = scripts["check:field-operator-plan"] || "";
  const apiCheck = scripts["check:field-operator-plan:api"] || "";

  assert(operatorPlan.length > 0, "package script field:operator-plan missing");
  assert(check.length > 0, "package script check:field-operator-plan missing");
  assert(apiCheck.length > 0, "package script check:field-operator-plan:api missing");
  assert(operatorPlan.includes("tools/field-operator-plan.js"), "package script field:operator-plan must run CLI");
  assert(check.includes("server/space-server/check-field-operator-plan.js"), "package script check:field-operator-plan must run this check");
  assert(apiCheck.includes("server/space-server/check-field-operator-plan.js") && apiCheck.includes("--api"), "package script check:field-operator-plan:api must run API smoke");
}

function assertEndpointContract({ shared, apiRouter, unityClient, unityDtos }) {
  assertIncludes(shared, "field_operator_plan", "shared contract field_operator_plan endpoint missing");
  assertIncludes(shared, ENDPOINT_PATH, "shared contract field operator plan path missing");
  assertMatches(shared, /getFieldOperatorPlan|field_operator_plan_failed/i, "shared client field operator plan method missing");

  assertIncludes(apiRouter, ENDPOINT_PATH, "api router field operator plan route missing");
  assertMatches(apiRouter, /req\.method\s*===\s*["']GET["'][\s\S]{0,180}\/api\/field\/operator-plan|\/api\/field\/operator-plan[\s\S]{0,180}req\.method\s*===\s*["']GET["']/i, "api router field operator plan GET route missing");

  assertIncludes(unityClient, ENDPOINT_PATH, "Unity client field operator plan path missing");
  assertIncludes(unityClient, "field_operator_plan", "Unity client field_operator_plan endpoint missing");
  assertMatches(unityClient, /["']GET["'][\s\S]{0,120}\/api\/field\/operator-plan|\/api\/field\/operator-plan[\s\S]{0,120}["']GET["']/i, "Unity client field operator plan GET endpoint missing");

  assertIncludes(unityDtos, "field_operator_plan", "Unity DTO field_operator_plan missing");
}

function outputTail(chunks) {
  return chunks.join("").trim().slice(-4000);
}

function listenOnOpenPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (!port) reject(new Error("could not resolve open port"));
        else resolve(port);
      });
    });
    server.listen(0, "127.0.0.1");
  });
}

async function fetchJsonUrl(url, label) {
  const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(2000)
    : undefined;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    signal
  });
  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${label} did not return valid JSON`);
  }
  assert(response.ok, `${label} returned HTTP ${response.status}: ${payload?.error || "request_failed"}`);
  assert(contentType.includes("application/json"), `${label} content-type must be application/json`);
  return payload;
}

async function waitForHealth({ baseUrl, child, stdout, stderr, timeoutMs = 15000 }) {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < timeoutMs) {
    if (child.spawnError) throw child.spawnError;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`temporary Space Server exited before /api/health; stdout=${outputTail(stdout)} stderr=${outputTail(stderr)}`);
    }

    try {
      const health = await fetchJsonUrl(`${baseUrl}/api/health`, "/api/health");
      assert(health.ok === true, "/api/health ok must be true");
      return health;
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw new Error(`timed out waiting for ${baseUrl}/api/health: ${lastError?.message || "no response"}`);
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopTemporaryServer(server) {
  const child = server?.child;
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;

  child.kill();
  if (await waitForChildExit(child, 3000)) return true;

  child.kill("SIGKILL");
  return waitForChildExit(child, 3000);
}

async function startTemporaryServer() {
  const port = await listenOnOpenPort();
  const baseUrl = normalizeLocalBaseUrl(port);
  const stdout = [];
  const stderr = [];
  const child = spawn(process.execPath, [path.join(root, "server", "space-server", "index.js")], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  child.once("error", (error) => {
    child.spawnError = error;
  });

  try {
    const health = await waitForHealth({ baseUrl, child, stdout, stderr });
    return {
      baseUrl,
      port,
      child,
      health,
      stdout,
      stderr
    };
  } catch (error) {
    await stopTemporaryServer({ child });
    error.server_stdout = outputTail(stdout);
    error.server_stderr = outputTail(stderr);
    throw error;
  }
}

function runNodeScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({
        code,
        signal,
        stdout: stdout.join(""),
        stderr: stderr.join("")
      });
    });
  });
}

function parseJsonOutput(text, label) {
  const trimmed = String(text || "").trim();
  assert(trimmed.length > 0, `${label} stdout missing`);
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`${label} stdout was not JSON: ${error.message}`);
  }
}

function assertOperatorPlanPayload(plan) {
  assertJsonObject(plan, "operator plan payload missing");
  assert(plan.ok === true, "operator plan ok mismatch");
  assert(plan.schema === PLAN_SCHEMA, "operator plan schema mismatch");
  assert(plan.endpoint?.method === "GET", "operator plan endpoint method must be GET");
  assert(plan.endpoint?.path === ENDPOINT_PATH, "operator plan endpoint path mismatch");
  assert(typeof plan.current_phase === "string" && plan.current_phase.length > 0, "operator plan current_phase missing");
  assert(Number(plan.phase_index) >= 1, "operator plan phase_index missing");
  assert(Number(plan.total_phases) >= 1, "operator plan total_phases missing");
  assert(Array.isArray(plan.phases) && plan.phases.length === Number(plan.total_phases), "operator plan phases mismatch");
  assert(Array.isArray(plan.next_actions), "operator plan next_actions missing");

  const readiness = plan.readiness || {};
  for (const key of [
    "precheck_ok",
    "physical_acceptance_ready",
    "live_session_ready",
    "trusted_a1_a2_a3_ready",
    "mission_loop_ready",
    "user_b_readback_ready",
    "release_ready",
    "hardware_ready_claim_allowed"
  ]) {
    assertBooleanField(readiness, key);
  }

  for (const phase of plan.phases) {
    assert(typeof phase.id === "string" && phase.id.length > 0, "operator plan phase id missing");
    assert(["ready", "pending", "blocked", "active"].includes(phase.status), `operator plan phase status unsupported: ${phase.status}`);
    assert(Array.isArray(phase.required_evidence), `${phase.id} required_evidence missing`);
    assert(Array.isArray(phase.blockers), `${phase.id} blockers missing`);
    assert(Array.isArray(phase.operator_actions), `${phase.id} operator_actions missing`);
    assert(typeof phase.mutates_state === "boolean", `${phase.id} mutates_state missing`);
  }

  const sourceOfTruth = plan.source_of_truth || {};
  assert(sourceOfTruth.field_acceptance === "/api/field/acceptance", "operator plan field acceptance source missing");
  assert(sourceOfTruth.field_target_readiness === "/api/field/target-readiness", "operator plan field target readiness source missing");
  assert(sourceOfTruth.device_adapter_checklist === "/api/device/adapter-checklist", "operator plan device adapter source missing");
  assert(sourceOfTruth.device_sessions === "/api/device/sessions", "operator plan device sessions source missing");
  assert(sourceOfTruth.wall_calibration === "/api/calibration/wall", "operator plan wall calibration source missing");
  assert(sourceOfTruth.mission_state === "/api/state", "operator plan mission state source missing");
  assert(sourceOfTruth.ops_status === "/api/ops/status", "operator plan ops status source missing");

  const privacy = plan.privacy || {};
  assertBooleanField(privacy, "read_only_endpoint", true);
  assertBooleanField(privacy, "mission_state_mutated", false);
  assertBooleanField(privacy, "evidence_files_written", false);
  assertBooleanField(privacy, "simulator_or_manual_observations_created", false);
  assertBooleanField(privacy, "adb_or_logcat_run", false);
  assertBooleanField(privacy, "raw_serials_included", false);
  assertBooleanField(privacy, "usb_ids_included", false);
  assertBooleanField(privacy, "session_ids_included", false);
  assertBooleanField(privacy, "device_ids_included", false);
  assertBooleanField(privacy, "private_ips_included", false);
  assertBooleanField(privacy, "pairing_codes_included", false);
  assertBooleanField(privacy, "raw_pose_or_ray_included", false);
  assertBooleanField(privacy, "raw_logcat_or_dumpsys_included", false);

  const scope = plan.scope_guard || {};
  assertBooleanField(scope, "p0_only", true);
  assertBooleanField(scope, "campus_wall_only", true);
  assertBooleanField(scope, "a1_a2_a3_user_b_only", true);
  assertBooleanField(scope, "guide_app_or_ppt", false);
  assertBooleanField(scope, "phone_page", false);
  assertBooleanField(scope, "open_ugc", false);
  assertBooleanField(scope, "backend_expansion", false);
  assertBooleanField(scope, "broad_route", false);
}

function assertOperatorPlanReport(report) {
  assertJsonObject(report, "field operator plan report missing");
  assert(report.schema === REPORT_SCHEMA, "field operator plan report schema mismatch");
  assert(report.api?.method === "GET", "field operator plan report api method mismatch");
  assert(report.api?.endpoint === ENDPOINT_PATH, "field operator plan report api endpoint mismatch");
  assert(typeof report.current_phase === "string" && report.current_phase.length > 0, "field operator plan report current_phase missing");
  assert(Number(report.phase_index) >= 1, "field operator plan report phase_index missing");
  assert(Number(report.total_phases) >= 1, "field operator plan report total_phases missing");
  assert(Array.isArray(report.next_actions), "field operator plan report next_actions missing");
  assert(Array.isArray(report.phase_table), "field operator plan report phase_table missing");
  assertJsonObject(report.readiness, "field operator plan report readiness missing");
  assertJsonObject(report.source_of_truth, "field operator plan report source_of_truth missing");

  const privacy = report.privacy || {};
  assertBooleanField(privacy, "read_only_endpoint", true);
  assertBooleanField(privacy, "mission_state_mutated", false);
  assertBooleanField(privacy, "simulator_or_manual_observations_created", false);
  assertBooleanField(privacy, "evidence_files_written", false);
  assertBooleanField(privacy, "adb_or_logcat_run", false);
  assertBooleanField(privacy, "raw_serials_included", false);
  assertBooleanField(privacy, "raw_session_ids_included", false);
  assertBooleanField(privacy, "raw_device_ids_included", false);
  assertBooleanField(privacy, "private_ips_included", false);
  assertBooleanField(privacy, "raw_pairing_codes_included", false);
  assertBooleanField(privacy, "raw_pose_or_ray_included", false);
  assertBooleanField(privacy, "raw_logcat_included", false);
  assertBooleanField(privacy, "field_operator_plan_report_written", true);

  const scope = report.p0_scope_guard || {};
  assertBooleanField(scope, "campus_wall_only", true);
  assertBooleanField(scope, "a1_a2_a3_user_b_only", true);
  assertBooleanField(scope, "guide_app_or_ppt", false);
  assertBooleanField(scope, "phone_page", false);
  assertBooleanField(scope, "open_ugc", false);
  assertBooleanField(scope, "backend_expansion", false);
  assertBooleanField(scope, "broad_route", false);

  assert(report.raw_operator_plan?.schema === PLAN_SCHEMA, "field operator plan report raw plan schema mismatch");
  assert(report.raw_operator_plan?.endpoint?.path === ENDPOINT_PATH, "field operator plan report raw plan endpoint mismatch");
}

async function runApiSmoke() {
  const server = await startTemporaryServer();
  const outputRoot = path.join(root, ...OUTPUT_DIR.split("/"));
  const latestJsonPath = path.join(outputRoot, OUTPUT_JSON);
  const latestMarkdownPath = path.join(outputRoot, OUTPUT_MARKDOWN);
  let summary = null;

  try {
    const plan = await fetchJsonUrl(`${server.baseUrl}${ENDPOINT_PATH}`, ENDPOINT_PATH);
    assertOperatorPlanPayload(plan);

    const cli = await runNodeScript([path.join(root, CLI_PATH), "--base-url", server.baseUrl]);
    assert(
      cli.code === 0 || cli.code === 2,
      `field operator plan CLI failed with exit ${cli.code ?? cli.signal}: stdout=${cli.stdout.trim()} stderr=${cli.stderr.trim()}`
    );
    const cliSummary = parseJsonOutput(cli.stdout, "field operator plan CLI");
    assert(cliSummary.check === CHECK_NAME, "field operator plan CLI check name mismatch");
    assert(typeof cliSummary.json === "string" && cliSummary.json.length > 0, "field operator plan CLI JSON path missing");
    assert(typeof cliSummary.markdown === "string" && cliSummary.markdown.length > 0, "field operator plan CLI Markdown path missing");
    assertPathInside(outputRoot, cliSummary.json, "field operator plan CLI JSON path must stay inside output/field-operator-plan");
    assertPathInside(outputRoot, cliSummary.markdown, "field operator plan CLI Markdown path must stay inside output/field-operator-plan");

    const generatedReport = await readAbsoluteJson(cliSummary.json);
    const latestReport = await readAbsoluteJson(latestJsonPath);
    const latestMarkdown = await readAbsoluteText(latestMarkdownPath);
    assertOperatorPlanReport(generatedReport);
    assertOperatorPlanReport(latestReport);
    assertIncludes(latestMarkdown, "# Field Operator Plan", "field operator plan Markdown title missing");
    assertIncludes(latestMarkdown, "## Privacy", "field operator plan Markdown privacy section missing");
    assertIncludes(latestMarkdown, "## P0 Scope Guard", "field operator plan Markdown scope guard section missing");

    summary = {
      base_url: server.baseUrl,
      health_ok: server.health.ok === true,
      endpoint_schema: plan.schema,
      current_phase: plan.current_phase,
      total_phases: plan.total_phases,
      cli_exit_code: cli.code,
      report_ok: latestReport.ok === true,
      blockers: Array.isArray(latestReport.blockers) ? latestReport.blockers.length : 0,
      latest_json: path.relative(root, latestJsonPath).replace(/\\/g, "/"),
      latest_markdown: path.relative(root, latestMarkdownPath).replace(/\\/g, "/"),
      server_closed: false
    };
    return summary;
  } finally {
    const closed = await stopTemporaryServer(server);
    if (summary) summary.server_closed = closed;
  }
}

async function main() {
  const [
    tool,
    packageJson,
    shared,
    apiRouter,
    unityClient,
    unityDtos
  ] = await Promise.all([
    readText(CLI_PATH),
    readJson("package.json"),
    readText("shared/innerworld-contract.js"),
    readText("server/space-server/src/http/api-router.js"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceApiClient.cs"),
    readText("apps/unity-shell/Assets/Scripts/Protocol/SpaceProtocolDtos.cs")
  ]);

  assertCliContract(tool);
  assertPackageScripts(packageJson);
  assertEndpointContract({ shared, apiRouter, unityClient, unityDtos });

  const result = {
    ok: true,
    check: CHECK_NAME
  };

  if (useApi) {
    result.mode = "api";
    result.api_smoke = await runApiSmoke();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
