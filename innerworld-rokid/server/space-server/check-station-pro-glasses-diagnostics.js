import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const args = new Set(process.argv.slice(2));
const requireReady = args.has("--require-ready");

const latestJsonPath = path.join(root, "output", "station-pro-glasses-diagnostics", "station-pro-glasses-diagnostics-latest.json");
const expectedSchema = "innerworld-station-pro-glasses-diagnostics/v1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function walk(value, visitor, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, [...pathParts, String(index)]));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    visitor(child, key, childPath.join("."));
    walk(child, visitor, childPath);
  }
}

function hasValue(value) {
  if (value === null || value === undefined || value === "" || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function assertNoSensitiveText(text, label) {
  const privateIpPattern = /\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b/;
  assert(!/\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i.test(text), `${label} leaked a MAC address`);
  assert(!privateIpPattern.test(text), `${label} leaked a private IP address`);
  assert(!/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/.test(text), `${label} leaked a pairing code`);
  assert(!/USB\\VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4}\\(?!<redacted>)[^\\\s"',}]+/i.test(text), `${label} leaked a USB instance id`);
  assert(!/\b(?:DisplayDeviceInfo\{|LogicalDisplay\{|mDisplayInfos=|WINDOW MANAGER DISPLAY CONTENTS)/i.test(text), `${label} contains raw dumpsys text`);
  assert(!/(?:^|\n)(?:\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+[VDIWEF]\s+|[VDIWEF]\/[A-Za-z0-9_.:-]+\s*\(\s*\d+\):)/.test(text), `${label} contains raw logcat text`);
}

function assertPrivacy(report, jsonText) {
  assert(isObject(report.privacy), "privacy must be an object");
  assertNoSensitiveText(jsonText, "station Pro glasses diagnostics JSON");

  for (const key of [
    "full_serials_included",
    "raw_serials_included",
    "full_usb_instance_ids_included",
    "private_ips_included",
    "mac_addresses_included",
    "raw_pairing_codes_included",
    "raw_session_ids_included"
  ]) {
    if (key in report.privacy) {
      assert(report.privacy[key] === false, `privacy.${key} must be false`);
    }
  }

  const requiredFlags = new Map([
    ["raw_dumpsys_included", false],
    ["raw_logcat_included", false],
    ["raw_getprop_included", false],
    ["raw_usb_dump_included", false],
    ["raw_service_dump_included", false],
    ["raw_input_dump_included", false],
    ["raw_package_dump_included", false]
  ]);
  const rawPrivateKeyPattern = /^(?:serial|serial_no|serial_number|device_serial|raw_serial|raw_id|raw_device_ids|instance_id|usb_instance_id|pairing_code|operator_pairing_code|raw_dumpsys|dumpsys_text|raw_logcat|logcat_text)$/i;

  walk(report, (value, key, label) => {
    if (requiredFlags.has(key)) {
      assert(value === false, `${label} must be false`);
      requiredFlags.set(key, true);
    }
    if (rawPrivateKeyPattern.test(key)) {
      assert(!hasValue(value), `${label} must not include raw private data`);
    }
    if (typeof value === "string") {
      assertNoSensitiveText(value, label);
    }
  });

  for (const [key, found] of requiredFlags.entries()) {
    assert(found, `${key} privacy flag missing`);
  }
}

async function main() {
  const jsonText = (await readFile(latestJsonPath, "utf8")).replace(/^\uFEFF/, "");
  const report = JSON.parse(jsonText);
  assert(isObject(report), "report must be an object");
  assert(report.schema === expectedSchema, `schema mismatch: expected ${expectedSchema}`);

  assertPrivacy(report, jsonText);

  const readiness = report.readiness;
  assert(isObject(readiness), "readiness must be an object");
  assert(typeof readiness.glasses_display_ready === "boolean", "readiness.glasses_display_ready must be a boolean");
  if ("external_display_detected" in readiness) {
    assert(typeof readiness.external_display_detected === "boolean", "readiness.external_display_detected must be a boolean");
  }
  if ("rokid_display_service_ready" in readiness) {
    assert(typeof readiness.rokid_display_service_ready === "boolean", "readiness.rokid_display_service_ready must be a boolean");
  }
  if ("station_usb_role_ready_for_glasses" in readiness) {
    assert(typeof readiness.station_usb_role_ready_for_glasses === "boolean", "readiness.station_usb_role_ready_for_glasses must be a boolean");
  }
  if (requireReady) {
    assert(readiness.glasses_display_ready === true, "readiness.glasses_display_ready must be true when --require-ready is used");
  }

  console.log(JSON.stringify({
    ok: true,
    check: "station-pro-glasses-diagnostics",
    require_ready: requireReady,
    report_ok: report.ok ?? null,
    evidence_kind: report.evidence_kind ?? null,
    generated_at: report.generated_at ?? null,
    glasses_display_ready: readiness.glasses_display_ready,
    external_display_detected: readiness.external_display_detected ?? null,
    rokid_display_service_ready: readiness.rokid_display_service_ready ?? null,
    station_usb_role_ready_for_glasses: readiness.station_usb_role_ready_for_glasses ?? null,
    rokid_display_dsp_connected: report.rokid_display?.dsp_connected ?? null,
    rokid_usb_display_connected: report.rokid_display?.usb_display_connected ?? null,
    station_usb_current_mode: report.usb?.current_mode ?? null,
    station_usb_current_data_role: report.usb?.current_data_role ?? null,
    blockers: Array.isArray(readiness.blocker_ids)
      ? readiness.blocker_ids
      : (Array.isArray(report.diagnostics?.glasses_display?.blocker_ids) ? report.diagnostics.glasses_display.blocker_ids : []),
    warnings: Array.isArray(report.warnings) ? report.warnings : [],
    errors: Array.isArray(report.errors) ? report.errors : []
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
