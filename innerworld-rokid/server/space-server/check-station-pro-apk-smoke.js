import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const args = new Set(process.argv.slice(2));
const skipSmoke = args.has("--skip-smoke");
const allowNoDevice = args.has("--allow-no-device");
const requireLan = args.has("--require-lan");
const requireRkImageDb = args.has("--require-rkimage-db");
const requireRokidNativeLibs = args.has("--require-rokid-native-libs");

const outputRoot = path.join(root, "output", "station-pro-apk-smoke");
const latestInspectJsonPath = path.join(outputRoot, "station-pro-apk-smoke-latest-inspect.json");
const latestInspectMdPath = path.join(outputRoot, "station-pro-apk-smoke-latest-inspect.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runInspect() {
  const scriptPath = path.join(root, "tools", "station-pro-apk-smoke.ps1");
  const result = spawnSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });

  if (result.status !== 0) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(`station apk inspect failed with exit code ${result.status}\n${output}`);
  }
}

function assertNoSensitiveLeak(text, label) {
  const macPattern = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i;
  const privateIpPattern = /\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b/;
  const rawKeyPattern = /"(?:raw_id|raw_device_ids|serial|instance_id|base_url|pairing_code)"\s*:/i;

  assert(!macPattern.test(text), `${label} leaked a MAC address`);
  assert(!privateIpPattern.test(text), `${label} leaked a private IP address`);
  assert(!rawKeyPattern.test(text), `${label} contains a raw identifier or raw base_url key`);
}

function assertArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
}

function assertRokidNativeLibraries(report) {
  const nativeLibraries = report.apk?.native_libraries;
  assert(nativeLibraries && typeof nativeLibraries === "object", "Rokid native library package evidence missing");
  assert(nativeLibraries.required_for_live_rokid_openxr === true, "Rokid native libraries must be marked required for live OpenXR");
  assert(nativeLibraries.abi === "arm64-v8a", `Rokid native library ABI must be arm64-v8a; got ${nativeLibraries.abi}`);
  assertArray(nativeLibraries.libraries, "apk.native_libraries.libraries");

  const byName = new Map(nativeLibraries.libraries.map((library) => [library.name, library]));
  for (const name of ["libopenxr_loader.so", "librokid_openxr_api.so", "libyuv.so"]) {
    const library = byName.get(name);
    assert(library, `${name} evidence missing`);
    assert(library.expected_path === `lib/arm64-v8a/${name}`, `${name} expected path mismatch`);
    assert(library.found === true, `${name} missing from APK; live Rokid OpenXR cannot be accepted`);
    assert(Number(library.size_bytes) > 0, `${name} must not be empty`);
    assert(/^[0-9a-f]{8,16}$/i.test(library.sha256_prefix || ""), `${name} short SHA missing`);
  }
  const loader = byName.get("libopenxr_loader.so");
  assert(loader.required_for_rokid_runtime_discovery === true, "OpenXR loader must be marked required for Rokid runtime discovery");
  assert(loader.contains_rokid_runtime_package_marker === true, "OpenXR loader must come from Rokid package and contain the Rokid runtime marker");
  assert(nativeLibraries.found_all === true, "all required Rokid native libraries must be packaged");
  assert(nativeLibraries.rokid_loader_ready === true, "Rokid OpenXR loader must be ready");
  assert(nativeLibraries.rokid_loader_marker === "com.rokid.openxr.runtime", "Rokid OpenXR loader marker mismatch");
}

async function main() {
  if (!skipSmoke) runInspect();

  const [jsonTextRaw, markdownTextRaw] = await Promise.all([
    readFile(latestInspectJsonPath, "utf8"),
    readFile(latestInspectMdPath, "utf8")
  ]);
  const jsonText = jsonTextRaw.replace(/^\uFEFF/, "");
  const markdownText = markdownTextRaw.replace(/^\uFEFF/, "");

  assertNoSensitiveLeak(jsonText, "station APK smoke JSON");
  assertNoSensitiveLeak(markdownText, "station APK smoke Markdown");

  const report = JSON.parse(jsonText);
  assert(report.schema === "innerworld-station-pro-apk-smoke/v1", "schema mismatch");
  assert(report.ok === true, "inspect report must be ok");
  assert(report.evidence_kind === "inspect_only", "check must read inspect-only evidence, not mutating launch evidence");
  assert(report.install_and_launch === false, "check must not mutate hardware by installing/launching");
  assert(report.pair_with_operator === false, "inspect check must not issue operator pairing codes");
  assert(report.privacy?.raw_pairing_codes_included === false, "pairing code privacy flag must be false");
  assert(report.apk?.exists === true, "APK must exist");
  assert(report.apk.package === "com.innerworld.rokid.prototype", "APK package mismatch");
  assert(typeof report.apk.launchable_activity === "string" && report.apk.launchable_activity.length > 0, "launchable activity missing");
  const minSdkVersion = Number(report.apk.sdk_version);
  assert(Number.isFinite(minSdkVersion) && minSdkVersion >= 25, `min SDK must be >= 25; got ${report.apk.sdk_version}`);
  assert(report.apk.target_sdk_version === "36", "target SDK mismatch");
  assertArray(report.apk.permissions, "apk.permissions");
  assert(report.apk.permissions.includes("android.permission.INTERNET"), "INTERNET permission missing");
  assert(report.apk.manifest?.uses_cleartext_traffic === true, "cleartext traffic flag missing");
  assert(report.apk.manifest?.network_security_config === true, "network security config missing");
  assert(report.apk.manifest?.uxr_manifest_ready === true, "Rokid UXR manifest marker missing");
  assert(report.apk.manifest?.rokid_sdk_value === "uxr", "Rokid SDK marker must be uxr");
  assert(report.apk.manifest?.rokid_uxr_application_mode === "3d", "Rokid UXR application mode must be 3d");
  assert(report.apk.manifest?.openxr_runtime_query === true, "OpenXR runtime package query missing");
  assert(report.apk.rokid_image_db && typeof report.apk.rokid_image_db === "object", "RKImage.db package evidence missing");
  assert(report.apk.rokid_image_db.required_for_trusted_image_tracking === true, "RKImage.db must be marked required for trusted image tracking");
  assert(typeof report.apk.rokid_image_db.expected_path === "string" && report.apk.rokid_image_db.expected_path.endsWith("RKImage.db"), "RKImage.db expected path missing");
  assert(report.apk.rokid_image_db.target_index_map?.schema === "innerworld-rokid-target-index-map/v1", "RKImage.db target index map evidence missing");
  assert(report.apk.rokid_image_db.target_index_map.required_for_trusted_image_tracking === true, "RKImage.db target index map must be required for trusted image tracking");
  assert(report.apk.native_libraries && typeof report.apk.native_libraries === "object", "Rokid native library package evidence missing");
  assert(report.apk.native_libraries.required_for_live_rokid_openxr === true, "Rokid native libraries must be marked required for live OpenXR");
  assert(report.apk.config?.found === true, "embedded config missing");
  assert(!("base_url" in report.apk.config), "embedded config must not expose raw base_url");
  assert(typeof report.apk.config.base_url_redacted === "string", "redacted base URL missing");
  assert(["localhost", "private_lan", "public_or_hostname", "invalid", "missing"].includes(report.apk.config.host_kind), "config host kind invalid");
  assert(report.apk.config.space_id === "innerworld_campus_wall", "space id mismatch");
  if (requireLan) {
    assert(["private_lan", "public_or_hostname"].includes(report.apk.config.host_kind), `LAN-ready APK config required; got ${report.apk.config.host_kind}`);
    assert(report.readiness?.network_ready_for_device === true, "APK config must be network-ready for Station Pro before hardware smoke");
  }
  if (requireRkImageDb) {
    assert(report.apk.rokid_image_db.found === true, "RKImage.db missing from APK; A2/A3 trusted image tracking cannot be accepted");
    assert(report.apk.rokid_image_db.streaming_assets_candidate === true, `RKImage.db must be packaged under StreamingAssets/assets; got ${report.apk.rokid_image_db.path || "missing"}`);
    assert(Number(report.apk.rokid_image_db.size_bytes) > 0, "RKImage.db must not be empty");
    assert(/^[0-9a-f]{8,16}$/i.test(report.apk.rokid_image_db.sha256_prefix || ""), "RKImage.db short SHA missing");
    assert(report.apk.rokid_image_db.contains_image_db_core === true, "RKImage.db must contain ImageDB.core");
    assert(Number(report.apk.rokid_image_db.image_db_core_bytes) >= 1024, "RKImage.db ImageDB.core is unexpectedly small");
    assert(report.apk.rokid_image_db.contains_data_json === true, "RKImage.db must contain Data.json target metadata");
    assert(report.apk.rokid_image_db.target_index_map.ready === true, `RKImage.db target index map invalid: ${(report.apk.rokid_image_db.target_index_map.issues || []).join(", ")}`);
    assert(report.apk.rokid_image_db.target_index_map.actual.map((item) => `${item.index}:${item.anchor_id}`).join(",") === "1:A1,2:A2,3:A3", "RKImage.db target index map must be 1:A1,2:A2,3:A3");
  }
  if (requireRokidNativeLibs) {
    assertRokidNativeLibraries(report);
  }

  assert(report.adb?.found === true, "ADB missing");
  assertArray(report.adb.devices, "adb.devices");
  const ignoredAdbNoiseStates = new Set(["daemon", "started"]);
  for (const device of report.adb.devices) {
    assert(!("raw_id" in device), "ADB device leaked raw_id");
    assert(!ignoredAdbNoiseStates.has(device.state), "ADB daemon output must not be parsed as a device");
    assert(typeof device.id_hash_prefix === "string" && /^[0-9a-f]{8,16}$/i.test(device.id_hash_prefix), "ADB hash prefix missing");
    assert(typeof device.id_redacted === "string" && device.id_redacted.includes("redacted"), "ADB redacted id missing");
  }

  const stationDevices = report.adb.devices.filter((device) => {
    return device.state === "device" && (
      /^stationPro$/i.test(device.product || "") ||
      /^stationPro$/i.test(device.device || "") ||
      /^RG[_-]?stationPro$/i.test(device.model || "")
    );
  });
  if (!allowNoDevice) {
    assert(stationDevices.length === 1, "expected exactly one connected Station Pro ADB device");
  }

  assert(report.readiness?.live_heartbeat_ready === false, "inspect cannot claim live heartbeat readiness");
  assert(report.readiness?.hardware_acceptance_ready === false, "inspect cannot claim hardware acceptance readiness");
  assert(report.readiness?.install_run_smoke === false, "inspect cannot claim install/run smoke");
  assert(report.readiness?.operator_pairing_requested === false, "inspect cannot request operator pairing");
  assert(report.readiness?.glasses_display_ready === false, "inspect cannot claim glasses display readiness");
  assert(report.readiness?.external_display_detected === false, "inspect cannot claim external display detection");
  assert(report.pairing?.issue?.raw_pairing_code_included === false, "pairing issue report must not include raw codes");
  assert(report.pairing?.launch_extra?.raw_pairing_code_included === false, "pairing launch report must not include raw codes");
  assert(report.pairing?.verification?.raw_session_ids_included === false, "pairing verification report must not include raw session ids");
  assert(report.diagnostics?.display?.requested === false, "inspect must not run display dumpsys diagnostics");
  assert(report.diagnostics?.display?.raw_dumpsys_included === false, "display diagnostics must not include raw dumpsys");
  assert(report.diagnostics?.runtime_log?.requested === false, "inspect must not read runtime logcat diagnostics");
  assert(report.diagnostics?.runtime_log?.raw_logcat_included === false, "runtime diagnostics must not include raw logcat");
  assert(report.diagnostics?.glasses_display?.ready === false, "inspect cannot mark glasses display ready");

  console.log(JSON.stringify({
    ok: true,
    check: "station-pro-apk-smoke",
    package: report.apk.package,
    launchable_activity: report.apk.launchable_activity,
    min_sdk: report.apk.sdk_version,
    target_sdk: report.apk.target_sdk_version,
    config_host_kind: report.apk.config.host_kind,
    network_ready_for_device: report.readiness.network_ready_for_device,
    rokid_uxr_manifest_ready: report.apk.manifest.uxr_manifest_ready,
    rkimage_db_packaged: report.apk.rokid_image_db.found,
    rkimage_db_streaming_assets_candidate: report.apk.rokid_image_db.streaming_assets_candidate,
    rkimage_db_core_packaged: report.apk.rokid_image_db.contains_image_db_core,
    rkimage_db_core_bytes: report.apk.rokid_image_db.image_db_core_bytes,
    rkimage_db_target_index_map_ready: report.apk.rokid_image_db.target_index_map?.ready === true,
    require_rkimage_db: requireRkImageDb,
    rokid_native_libs_packaged: report.apk.native_libraries.found_all,
    rokid_openxr_loader_ready: report.apk.native_libraries.rokid_loader_ready,
    rokid_native_libs_missing: report.apk.native_libraries.missing_names,
    require_rokid_native_libs: requireRokidNativeLibs,
    glasses_display_ready: report.readiness.glasses_display_ready,
    external_display_detected: report.readiness.external_display_detected,
    require_lan_config: requireLan,
    station_pro_devices: stationDevices.length,
    install_and_launch: report.install_and_launch
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
