import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const args = new Set(process.argv.slice(2));
const skipDoctor = args.has("--skip-doctor");
const requireReady = args.has("--require-ready");

const outputRoot = path.join(root, "output", "uxr-readiness");
const latestJsonPath = path.join(outputRoot, "uxr-readiness-latest.json");
const latestMdPath = path.join(outputRoot, "uxr-readiness-latest.md");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runDoctor() {
  const scriptPath = path.join(root, "tools", "uxr-readiness.js");
  const result = spawnSync("node", [scriptPath], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });

  if (result.status !== 0) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(`uxr readiness doctor failed with exit code ${result.status}\n${output}`);
  }
}

function assertNoSensitiveLeak(text, label) {
  const macPattern = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/i;
  const privateIpPattern = /\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b/;
  const rawSecretPattern = /"(?:serial|instance_id|base_url|pairing_code|token)"\s*:/i;

  assert(!macPattern.test(text), `${label} leaked a MAC address`);
  assert(!privateIpPattern.test(text), `${label} leaked a private IP address`);
  assert(!rawSecretPattern.test(text), `${label} contains a raw secret or identifier key`);
}

async function main() {
  if (!skipDoctor) runDoctor();

  const [jsonTextRaw, markdownTextRaw] = await Promise.all([
    readFile(latestJsonPath, "utf8"),
    readFile(latestMdPath, "utf8")
  ]);
  const jsonText = jsonTextRaw.replace(/^\uFEFF/, "");
  const markdownText = markdownTextRaw.replace(/^\uFEFF/, "");

  assertNoSensitiveLeak(jsonText, "UXR readiness JSON");
  assertNoSensitiveLeak(markdownText, "UXR readiness Markdown");

  const report = JSON.parse(jsonText);
  assert(report.schema === "innerworld-uxr-readiness/v1", "schema mismatch");
  assert(report.ok === true, "doctor report must be ok");
  assert(report.privacy?.full_serials_included === false, "privacy serial flag must be false");
  assert(report.privacy?.private_ips_included === false, "privacy IP flag must be false");
  assert(report.readiness && typeof report.readiness === "object", "readiness section missing");
  assert(Array.isArray(report.readiness.blockers), "readiness blockers must be an array");
  assert(Array.isArray(report.readiness.warnings), "readiness warnings must be an array");
  assert(report.readiness.hardware_ready_claim_allowed === false, "doctor must never claim hardware readiness");

  const packages = report.unity_packages?.packages || {};
  for (const key of ["rokid_uxr", "rokid_openxr", "unity_xr_management"]) {
    assert(packages[key], `package check missing: ${key}`);
    assert(typeof packages[key].in_manifest === "boolean", `package in_manifest flag missing: ${key}`);
  }

  assert(report.android_manifest?.metadata?.rokid_sdk_uxr === true, "Android manifest Rokid SDK marker missing");
  assert(report.android_manifest?.metadata?.rokid_uxr_application_mode_3d === true, "Android manifest UXR 3D marker missing");
  assert(report.android_manifest?.queries?.openxr_runtime === true, "OpenXR runtime query missing");
  assert(report.adapter_boundary?.has_compile_boundary === true, "compile-safe ROKID_UXR boundary missing");
  assert(report.adapter_boundary?.has_adapter_resolver === true, "adapter resolver missing");
  assert(report.adapter_boundary?.has_sdk_binding_probe === true, "SDK binding probe missing");
  assert(report.station_pro_evidence?.current_apk?.rokid_image_db, "current APK RKImage.db evidence missing");
  assert(report.station_pro_evidence.current_apk.rokid_image_db.required_for_trusted_image_tracking === true, "RKImage.db evidence must be marked required for trusted image tracking");

  if (requireReady) {
    assert(report.readiness.minimal_uxr_project_ready === true, `minimal UXR project not ready: ${report.readiness.blockers.join(", ")}`);
    assert(packages.rokid_uxr.in_manifest === true, "official Rokid UXR package missing");
    assert(packages.rokid_openxr.in_manifest === true, "Rokid OpenXR provider package missing");
    assert(packages.unity_xr_management.in_manifest === true, "Unity XR management package missing");
    assert(report.project_settings.rokid_uxr_define_present === true, "ROKID_UXR define missing");
    assert(report.project_settings.xr_settings_files.length > 0, "XR project settings missing");
    assert(report.station_pro_evidence.current_apk.rokid_image_db.found === true, "RKImage.db missing from current APK");
    assert(report.station_pro_evidence.current_apk.rokid_image_db.streaming_assets_candidate === true, "RKImage.db must be packaged under StreamingAssets/assets");
  } else {
    assert(report.readiness.minimal_uxr_project_ready === false, "non-ready mode should not pass if minimal UXR project is already ready; rerun with --require-ready");
    assert(report.readiness.blockers.length > 0, "non-ready mode should report at least one current blocker");
    if (packages.rokid_uxr.in_manifest === false) {
      assert(report.readiness.blockers.includes("official_rokid_uxr_package_missing"), "missing official Rokid UXR package should be reported as a blocker");
    }
    if (packages.rokid_openxr.in_manifest === false) {
      assert(report.readiness.blockers.includes("rokid_openxr_provider_package_missing"), "missing Rokid OpenXR provider package should be reported as a blocker");
    }
    if (packages.unity_xr_management.in_manifest === false) {
      assert(report.readiness.blockers.includes("unity_xr_management_package_missing"), "missing Unity XR management package should be reported as a blocker");
    }
    if (report.station_pro_evidence.current_apk.rokid_image_db.found === false) {
      assert(report.readiness.blockers.includes("rokid_image_db_missing_for_a2_a3_image_tracking"), "missing RKImage.db should be reported as a blocker");
    }
    const latestLaunch = report.station_pro_evidence?.latest_mutating_launch || null;
    if (latestLaunch?.launch_error_code === "102") {
      assert(report.readiness.blockers.includes("station_pro_launch_error_102_non_uxr_app"), "Station Pro launch error 102 must remain a blocker when it is the latest mutating launch evidence");
    }
    if (latestLaunch?.launch_ok === true) {
      assert(!report.readiness.blockers.includes("station_pro_launch_error_102_non_uxr_app"), "resolved Station Pro launch error 102 must not remain a current blocker");
    }
  }

  console.log(JSON.stringify({
    ok: true,
    check: "uxr-readiness",
    require_ready: requireReady,
    minimal_uxr_project_ready: report.readiness.minimal_uxr_project_ready,
    hardware_ready_claim_allowed: report.readiness.hardware_ready_claim_allowed,
    blockers: report.readiness.blockers,
    warnings: report.readiness.warnings,
    next_required_proof: report.readiness.next_required_proof,
    current_apk: report.station_pro_evidence.current_apk,
    package_state: {
      rokid_uxr: packages.rokid_uxr.in_manifest,
      rokid_openxr: packages.rokid_openxr.in_manifest,
      unity_xr_management: packages.unity_xr_management.in_manifest
    },
    latest_mutating_launch: report.station_pro_evidence.latest_mutating_launch
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
