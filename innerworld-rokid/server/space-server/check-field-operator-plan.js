import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const CHECK_NAME = "field-operator-plan";
const CLI_PATH = "tools/field-operator-plan.js";
const REPORT_SCHEMA = "innerworld-field-operator-plan-report/v1";
const ENDPOINT_PATH = "/api/field/operator-plan";
const OUTPUT_DIR = "output/field-operator-plan";
const OUTPUT_JSON = "field-operator-plan-latest.json";
const OUTPUT_MARKDOWN = "field-operator-plan-latest.md";

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

  assert(operatorPlan.length > 0, "package script field:operator-plan missing");
  assert(check.length > 0, "package script check:field-operator-plan missing");
  assert(operatorPlan.includes("tools/field-operator-plan.js"), "package script field:operator-plan must run CLI");
  assert(check.includes("server/space-server/check-field-operator-plan.js"), "package script check:field-operator-plan must run this check");
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

  console.log(JSON.stringify({
    ok: true,
    check: CHECK_NAME
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
