import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const args = new Set(process.argv.slice(2));
const requireAdbDevice = args.has("--require-adb-device");
const skipProbe = args.has("--skip-probe");
const probeTimeoutMs = 90_000;

const outputRoot = path.join(root, "output", "device-probe");
const latestJsonPath = path.join(outputRoot, "device-probe-latest.json");
const latestMdPath = path.join(outputRoot, "device-probe-latest.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runProbe() {
  const scriptPath = path.join(root, "tools", "device-probe.ps1");
  const probeArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath
  ];
  if (requireAdbDevice) probeArgs.push("-RequireAdbDevice");

  const result = spawnSync("powershell", probeArgs, {
    cwd: root,
    encoding: "utf8",
    timeout: probeTimeoutMs,
    windowsHide: true
  });

  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`device probe timed out after ${Math.round(probeTimeoutMs / 1000)}s`);
  }
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(`device probe failed with exit code ${result.status}\n${output}`);
  }
}

function assertNoSensitiveLeak(text, label) {
  const macPattern = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i;
  const privateIpPattern = /\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b/;
  const rawInstanceIdKeyPattern = /"instance_id"\s*:/i;
  const rawSerialKeyPattern = /"serial"\s*:/i;

  assert(!macPattern.test(text), `${label} leaked a MAC address`);
  assert(!privateIpPattern.test(text), `${label} leaked a private IP address`);
  assert(!rawInstanceIdKeyPattern.test(text), `${label} contains a raw instance_id key`);
  assert(!rawSerialKeyPattern.test(text), `${label} contains a raw serial key`);
}

function assertArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
}

function assertDeviceRedaction(devices) {
  const ignoredAdbNoiseStates = new Set(["daemon", "started"]);
  for (const device of devices) {
    assert(!("serial" in device), "ADB device entry must not expose serial");
    assert(!ignoredAdbNoiseStates.has(device.state), "ADB daemon output must not be parsed as a device");
    assert(typeof device.id_hash_prefix === "string" && /^[0-9a-f]{8,16}$/i.test(device.id_hash_prefix), "ADB device hash prefix missing");
    assert(typeof device.id_redacted === "string" && device.id_redacted.includes("redacted"), "ADB device redacted id missing");
    assert(["device", "offline", "unauthorized", "recovery", "sideload", "no permissions"].includes(device.state) || typeof device.state === "string", "ADB device state missing");
  }
}

function assertPnpRedaction(devices) {
  for (const device of devices) {
    assert(!("instance_id" in device), "PnP device entry must not expose raw instance_id");
    assert(typeof device.instance_id_redacted === "string" && device.instance_id_redacted.includes("<redacted>"), "PnP redacted instance id missing");
    assert(typeof device.instance_hash_prefix === "string" && /^[0-9a-f]{8,16}$/i.test(device.instance_hash_prefix), "PnP instance hash prefix missing");
  }
}

async function main() {
  if (!skipProbe) runProbe();

  const [jsonTextRaw, markdownTextRaw] = await Promise.all([
    readFile(latestJsonPath, "utf8"),
    readFile(latestMdPath, "utf8")
  ]);
  const jsonText = jsonTextRaw.replace(/^\uFEFF/, "");
  const markdownText = markdownTextRaw.replace(/^\uFEFF/, "");

  assertNoSensitiveLeak(jsonText, "device probe JSON");
  assertNoSensitiveLeak(markdownText, "device probe Markdown");

  const report = JSON.parse(jsonText);
  assert(report.schema === "innerworld-device-probe/v1", "device probe schema mismatch");
  assert(typeof report.generated_at === "string", "generated_at missing");
  assert(typeof report.ok === "boolean", "ok flag missing");
  assert(report.timeouts && typeof report.timeouts === "object", "timeouts section missing");
  assert(typeof report.timeouts.command_seconds === "number", "command timeout missing");
  assert(typeof report.timeouts.pnp_seconds === "number", "pnp timeout missing");
  assert(typeof report.timeouts.adb_timed_out === "boolean", "adb timeout flag missing");
  assert(typeof report.timeouts.pnp_timed_out === "boolean", "pnp timeout flag missing");
  assert(report.adb && typeof report.adb === "object", "ADB section missing");
  assert(report.android_sdk && typeof report.android_sdk === "object", "Android SDK section missing");
  assert(report.unity && typeof report.unity === "object", "Unity section missing");
  assert(report.pnp && typeof report.pnp === "object", "PnP section missing");
  assert(report.tools && typeof report.tools === "object", "tools section missing");
  assert(report.environment && typeof report.environment === "object", "environment section missing");
  assertArray(report.warnings, "warnings");
  assertArray(report.errors, "errors");

  assertArray(report.adb.candidates, "adb.candidates");
  assertArray(report.adb.devices, "adb.devices");
  assertDeviceRedaction(report.adb.devices);
  assert(typeof report.adb.device_state_count === "number", "adb.device_state_count missing");

  assertArray(report.android_sdk.roots, "android_sdk.roots");
  for (const sdkRoot of report.android_sdk.roots) {
    assert(typeof sdkRoot.exists === "boolean", "android sdk root exists flag missing");
    assert(sdkRoot.build_tools && Array.isArray(sdkRoot.build_tools.versions), "build tools versions missing");
    assert(sdkRoot.platforms && Array.isArray(sdkRoot.platforms.versions), "platform versions missing");
    assert(sdkRoot.cmdline_tools && Array.isArray(sdkRoot.cmdline_tools.versions), "cmdline tools versions missing");
  }

  assertArray(report.unity.hub, "unity.hub");
  assertArray(report.unity.editors, "unity.editors");
  assertArray(report.pnp.devices, "pnp.devices");
  assertArray(report.pnp.counts_by_class, "pnp.counts_by_class");
  assertArray(report.pnp.counts_by_status, "pnp.counts_by_status");
  assertPnpRedaction(report.pnp.devices);

  for (const name of ["java", "maven", "node", "npm"]) {
    assert(report.tools[name], `${name} tool section missing`);
    assert(typeof report.tools[name].ok === "boolean", `${name} ok flag missing`);
  }

  assertArray(report.environment.variables, "environment.variables");
  assertArray(report.environment.path_highlights, "environment.path_highlights");

  if (requireAdbDevice) {
    assert(report.require_adb_device === true, "strict probe flag missing");
    assert(report.adb.device_state_count >= 1, "strict probe requires an ADB device in device state");
    assert(report.ok === true, "strict probe should be ok when a device is present");
  } else if (report.adb.device_state_count < 1) {
    assert(report.ok === false, "non-strict probe with no ADB device should record ok=false");
    assert(report.warnings.some((warning) => /No ADB device/i.test(warning)), "missing no-device warning");
  }

  console.log(JSON.stringify({
    ok: true,
    check: "device-probe",
    require_adb_device: requireAdbDevice,
    report_ok: report.ok,
    adb_found: report.adb.found,
    adb_device_state_count: report.adb.device_state_count,
    android_sdk_roots: report.android_sdk.existing_root_count,
    unity_editors: report.unity.editors.length,
    pnp_devices_summarized: report.pnp.devices.length,
    warnings: report.warnings.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
