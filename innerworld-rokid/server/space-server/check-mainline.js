import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  goal: path.join(root, "docs", "active-goal.md"),
  teammateDocsBus: path.join(root, "docs", "teammate-docs-bus.md"),
  contract: path.join(root, "shared", "innerworld-contract.js"),
  webHtml: path.join(root, "apps", "web-demo", "index.html"),
  webJs: path.join(root, "apps", "web-demo", "app.js"),
  unityController: path.join(root, "apps", "unity-shell", "Assets", "Scripts", "InnerWorldDemoController.cs"),
  apiRouter: path.join(root, "server", "space-server", "src", "http", "api-router.js"),
  deviceRuntime: path.join(root, "server", "space-server", "src", "domain", "device-runtime.js"),
  unityGitignore: path.join(root, "apps", "unity-shell", ".gitignore"),
  sqliteStore: path.join(root, "server", "space-server", "src", "store", "sqlite-store.js"),
  gitAutoSync: path.join(root, "tools", "git-auto-sync.ps1"),
  sqliteBackup: path.join(root, "tools", "sqlite-backup.ps1"),
  rootGitignore: path.join(root, ".gitignore"),
  packageDemo: path.join(root, "tools", "package-demo.ps1"),
  packageServerRelease: path.join(root, "tools", "package-server-release.ps1"),
  smokeServerRelease: path.join(root, "tools", "smoke-server-release.ps1"),
  packageAudit: path.join(root, "tools", "audit-demo-package.ps1"),
  spaceData: path.join(root, "data", "space_demo.json"),
  hardwareManifest: path.join(root, "data", "hardware_manifest.json"),
  fieldMarkers: path.join(root, "data", "field_markers.json"),
  fieldAcceptanceCheck: path.join(root, "server", "space-server", "check-field-acceptance.js"),
  fieldOperatorPlanTool: path.join(root, "tools", "field-operator-plan.js")
};

const requiredGoalDirection = [
  "Rokid glasses spatial memory layer",
  "real campus exhibition wall",
  "not a normal guide app",
  "not a PPT",
  "not a phone-only page",
  "localhost/LAN Space Server"
];

const requiredGoalReviewerTokens = [
  "Carver reviewer",
  "persistent reviewer",
  "feed every major implementation checkpoint back to it"
];

const requiredLongModuleTokens = [
  "Hardware-Independent Long Modules",
  "a1_spatial_entry_experience",
  "story_graph_mission_runtime_v2",
  "evidence_replay_judge_mode",
  "premium_unity_spatial_shell_2",
  "controlled_timemark_authoring",
  "ai_hud_contract_hardening",
  "institution_lite_content_compiler",
  "spatial_audio_gesture_feedback_pack",
  "one-wall A1/A2/A3/User B Rokid spatial memory loop",
  "regression check or release/evidence assertion",
  "visual polish alone is not enough"
];

const requiredHardwareConnectedTokens = [
  "Hardware-Connected Phase",
  "RG-stationPro",
  "station_pro_trusted_hardware_session",
  "ADB/toolchain detection",
  "APK install/run capability",
  "trusted A1/A2/A3 observations",
  "device serial numbers",
  "private IPs",
  "Rokid x Bolon",
  "secondary device lane",
  "not a replacement for the Max Pro + Station Pro mainline"
];

const requiredTeammateDocsBusTokens = [
  "Teammate Docs Bus",
  "f402f82f61d62e897d7615fa3f4259423e5cfce9",
  "P0 Adoption",
  "P1 Adoption",
  "P2 / Reference Only",
  "Do Not Merge Into P0",
  "station_pro_trusted_hardware_session",
  "UXR3.0 SDK project validation",
  "RKCameraRig",
  "RKInput 3DoF ray",
  "PointableUI",
  "image target library",
  "SLAM/head tracking heartbeat",
  "operator-paired live SDK proof",
  "one-wall A1/A2/A3/User B Rokid spatial memory loop"
];

const requiredCombinedDirection = [
  "Space API",
  "write-back",
  "AI schema",
  "SQLite",
  "dataset",
  "calibration",
  "field_markers",
  "/api/field/acceptance",
  "innerworld-field-acceptance/v1",
  "trusted_hardware_session",
  "operator_paired_session",
  "/api/device/pairing",
  "INNERWORLD_OPERATOR_PIN",
  "device_pairing_operator_gate_failed"
];

const requiredOperatorPlanTokens = [
  "/api/field/operator-plan",
  "field:operator-plan",
  "innerworld-field-operator-plan-report/v1",
  "output/field-operator-plan",
  "current_phase",
  "phase_table",
  "source_of_truth",
  "p0_scope_guard",
  "simulator_or_manual_observations_created",
  "adb_or_logcat_run",
  "hardware_ready_claim_allowed"
];

const requiredWebModules = [
  "Spatial Route",
  "Rokid Lens",
  "Evidence Chain",
  "Delivery Script",
  "Risk Guardrails",
  "Hardware Runtime",
  "Wall Calibration",
  "Field Acceptance",
  "Mission Ledger",
  "Operator Console",
  "Agent Runtime",
  "Device / Release"
];

const requiredContractTokens = [
  "INNERWORLD_SPACE_ID",
  "DEVICE_BOOTSTRAP_PROTOCOL",
  "buildEndpointMap",
  "buildDeviceBootstrap",
  "dataset_call",
  "ledger_summary",
  "ledger_events",
  "wall_calibration",
  "wall_calibration_observations",
  "field_markers",
  "field_acceptance",
  "device_pairing",
  "service_actions_outbox",
  "service_action_ack_template",
  "ai_hud",
  "write_back"
];

const requiredStorageTokens = [
  "createSqliteStore",
  "CREATE TABLE IF NOT EXISTS datasets",
  "CREATE TABLE IF NOT EXISTS device_sessions",
  "CREATE TABLE IF NOT EXISTS mission_ledger",
  "CREATE TABLE IF NOT EXISTS service_action_records",
  "CREATE TABLE IF NOT EXISTS wall_calibration_observations",
  "datasetCall",
  "appendWallCalibrationObservation",
  "wallCalibrationSummary",
  "appendServiceActionRecord",
  "ackServiceActionRecord",
  "appendMissionLedgerEvent",
  "missionLedgerSummary",
  "raw_sql_api"
];

const requiredBackupTokens = [
  "innerworld-sqlite-backup/v1",
  "Get-FileHash",
  "RestoreFrom",
  "before_restore",
  "D:\\Downloads\\RokidCache\\sqlite-backups"
];

const requiredBackupGuardTokens = [
  "innerworld-sqlite",
  "innerworld-before-restore",
  "sqlite-backup-latest.md"
];

const requiredReleaseSmokeTokens = [
  "/api/field/operator-plan",
  "/api/field/acceptance",
  "/api/field/target-readiness",
  "tools\\field-live-pass.js",
  "hardware_ready_claim_allowed",
  "ready_for_hardware",
  "physical_acceptance_ready",
  "hardware_a1_a2_a3_ready",
  "field_acceptance_ready"
];

const requiredUnityGitignoreTokens = [
  "Library/",
  "Temp/",
  "Obj/",
  "UserSettings/",
  "PackageCache/"
];

const requiredUnityTokens = [
  "SpaceApiClient",
  "BootstrapAndLoadSpace",
  "PostWriteBack",
  "RokidInput",
  "Gaze Anchor Reticle",
  "RokidAdapterResolver.Resolve",
  "RokidAdapterBoundaryStatus",
  "IRokidInputStateSink",
  "RokidSdkBindingProbe.Detect",
  "operatorPairingCode",
  "pairing_code",
  "sdk live"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includesAll(text, needles) {
  const lower = text.toLowerCase();
  return needles.map((needle) => ({
    needle,
    ok: lower.includes(String(needle).toLowerCase())
  }));
}

async function readTextMap() {
  const entries = await Promise.all(Object.entries(files).map(async ([key, file]) => {
    return [key, await readFile(file, "utf8")];
  }));
  return Object.fromEntries(entries);
}

async function main() {
  const sources = await readTextMap();
  const space = JSON.parse(sources.spaceData);
  const hardware = JSON.parse(sources.hardwareManifest);
  const fieldMarkers = JSON.parse(sources.fieldMarkers);
  const directionChecks = includesAll(sources.goal, requiredGoalDirection);
  const reviewerChecks = includesAll(sources.goal, requiredGoalReviewerTokens);
  const longModuleChecks = includesAll(sources.goal, requiredLongModuleTokens);
  const hardwareConnectedChecks = includesAll(sources.goal, requiredHardwareConnectedTokens);
  const teammateDocsBusChecks = includesAll(`${sources.goal}\n${sources.teammateDocsBus}`, requiredTeammateDocsBusTokens);
  const combinedDirectionChecks = includesAll(`${sources.goal}\n${sources.contract}\n${sources.webJs}\n${sources.fieldAcceptanceCheck}\n${sources.apiRouter}\n${sources.deviceRuntime}`, requiredCombinedDirection);
  const operatorPlanChecks = includesAll(`${sources.goal}\n${sources.contract}\n${sources.webJs}\n${sources.fieldOperatorPlanTool}`, requiredOperatorPlanTokens);
  const webChecks = includesAll(`${sources.webHtml}\n${sources.webJs}`, requiredWebModules);
  const contractChecks = includesAll(sources.contract, requiredContractTokens);
  const unityChecks = includesAll(sources.unityController, requiredUnityTokens);
  const unityGitignoreChecks = includesAll(sources.unityGitignore, requiredUnityGitignoreTokens);
  const storageChecks = includesAll(sources.sqliteStore, requiredStorageTokens);
  const backupChecks = includesAll(sources.sqliteBackup, requiredBackupTokens);
  const backupGuardChecks = includesAll([
    sources.rootGitignore,
    sources.gitAutoSync,
    sources.packageDemo,
    sources.packageServerRelease,
    sources.packageAudit
  ].join("\n"), requiredBackupGuardTokens);
  const releaseSmokeChecks = includesAll(sources.smokeServerRelease, requiredReleaseSmokeTokens);
  const syncChecks = includesAll(sources.gitAutoSync, [
    "git -C",
    "check:security",
    "$DryRun",
    "$SkipPush",
    "$IncludeUntracked",
    "$denyPathPatterns",
    "\"add\", \"--\""
  ]);

  const failures = [
    ...directionChecks.filter((item) => !item.ok).map((item) => `active goal missing: ${item.needle}`),
    ...reviewerChecks.filter((item) => !item.ok).map((item) => `Carver reviewer rule missing: ${item.needle}`),
    ...longModuleChecks.filter((item) => !item.ok).map((item) => `hardware-independent long module missing: ${item.needle}`),
    ...hardwareConnectedChecks.filter((item) => !item.ok).map((item) => `hardware-connected phase missing: ${item.needle}`),
    ...teammateDocsBusChecks.filter((item) => !item.ok).map((item) => `teammate docs bus missing: ${item.needle}`),
    ...combinedDirectionChecks.filter((item) => !item.ok).map((item) => `mainline contract missing: ${item.needle}`),
    ...operatorPlanChecks.filter((item) => !item.ok).map((item) => `operator plan mainline missing: ${item.needle}`),
    ...webChecks.filter((item) => !item.ok).map((item) => `web module missing: ${item.needle}`),
    ...contractChecks.filter((item) => !item.ok).map((item) => `contract token missing: ${item.needle}`),
    ...unityChecks.filter((item) => !item.ok).map((item) => `unity controller token missing: ${item.needle}`),
    ...unityGitignoreChecks.filter((item) => !item.ok).map((item) => `Unity gitignore missing: ${item.needle}`),
    ...storageChecks.filter((item) => !item.ok).map((item) => `storage token missing: ${item.needle}`),
    ...backupChecks.filter((item) => !item.ok).map((item) => `SQLite backup token missing: ${item.needle}`),
    ...backupGuardChecks.filter((item) => !item.ok).map((item) => `SQLite backup guard missing: ${item.needle}`),
    ...releaseSmokeChecks.filter((item) => !item.ok).map((item) => `release smoke token missing: ${item.needle}`),
    ...syncChecks.filter((item) => !item.ok).map((item) => `git auto-sync token missing: ${item.needle}`)
  ];

  assert(space.space_id === "innerworld_campus_wall", "space id drifted");
  assert(Array.isArray(space.anchors) && space.anchors.length === 3, "space must keep A1/A2/A3 anchors");
  assert(space.anchors.some((anchor) => anchor.anchor_id === "A3" && anchor.kind === "write_back"), "A3 write-back anchor missing");
  assert(hardware.project_fit?.assessment === "fit", "hardware manifest fit assessment missing");
  assert(hardware.loan_terms_summary?.borrow_deadline === "2026-08-31", "hardware borrow deadline drifted");
  assert(fieldMarkers.schema === "innerworld-field-markers/v1", "field markers schema missing");
  assert(fieldMarkers.markers?.map((marker) => marker.marker_id).join(",") === "A1:qr-entry,A2:image-target,A3:image-target", "field markers ids drifted");

  if (failures.length) {
    throw new Error(failures.join("\n"));
  }

  console.log(JSON.stringify({
    ok: true,
    check: "mainline",
    direction: "Rokid spatial memory layer over a real campus exhibition wall",
    not: ["normal guide app", "PPT", "phone-only page"],
    space_id: space.space_id,
    anchors: space.anchors.map((anchor) => `${anchor.anchor_id}:${anchor.kind}`),
    hardware: hardware.applied_hardware.map((device) => `${device.model} x${device.quantity}`).join(", "),
    borrow_deadline: hardware.loan_terms_summary.borrow_deadline,
    web_modules: requiredWebModules,
    contract_tokens: requiredContractTokens.length,
    unity_tokens: requiredUnityTokens.length,
    storage_tokens: requiredStorageTokens.length,
    hardware_connected_tokens: requiredHardwareConnectedTokens.length,
    hardware_connected_checkpoint: "station_pro_trusted_hardware_session",
    teammate_docs_bus_tokens: requiredTeammateDocsBusTokens.length,
    operator_plan_tokens: requiredOperatorPlanTokens.length,
    release_smoke_tokens: requiredReleaseSmokeTokens.length,
    long_modules: [
      "a1_spatial_entry_experience",
      "story_graph_mission_runtime_v2",
      "evidence_replay_judge_mode",
      "premium_unity_spatial_shell_2",
      "controlled_timemark_authoring",
      "ai_hud_contract_hardening",
      "institution_lite_content_compiler",
      "spatial_audio_gesture_feedback_pack"
    ],
    reviewer: "Carver",
    field_markers: fieldMarkers.markers.map((marker) => marker.marker_id),
    sqlite_backup_tokens: requiredBackupTokens.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
