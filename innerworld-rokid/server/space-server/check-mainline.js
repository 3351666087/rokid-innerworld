import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const files = {
  goal: path.join(root, "docs", "active-goal.md"),
  contract: path.join(root, "shared", "innerworld-contract.js"),
  webHtml: path.join(root, "apps", "web-demo", "index.html"),
  webJs: path.join(root, "apps", "web-demo", "app.js"),
  unityController: path.join(root, "apps", "unity-shell", "Assets", "Scripts", "InnerWorldDemoController.cs"),
  unityGitignore: path.join(root, "apps", "unity-shell", ".gitignore"),
  sqliteStore: path.join(root, "server", "space-server", "src", "store", "sqlite-store.js"),
  gitAutoSync: path.join(root, "tools", "git-auto-sync.ps1"),
  sqliteBackup: path.join(root, "tools", "sqlite-backup.ps1"),
  rootGitignore: path.join(root, ".gitignore"),
  packageDemo: path.join(root, "tools", "package-demo.ps1"),
  packageServerRelease: path.join(root, "tools", "package-server-release.ps1"),
  packageAudit: path.join(root, "tools", "audit-demo-package.ps1"),
  spaceData: path.join(root, "data", "space_demo.json"),
  hardwareManifest: path.join(root, "data", "hardware_manifest.json")
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
  "Kepler reviewer",
  "persistent reviewer",
  "feed every major implementation checkpoint back to it"
];

const requiredCombinedDirection = [
  "Space API",
  "write-back",
  "AI schema",
  "SQLite",
  "dataset"
];

const requiredWebModules = [
  "Spatial Route",
  "Rokid Lens",
  "Evidence Chain",
  "Delivery Script",
  "Risk Guardrails",
  "Hardware Runtime",
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
  "ai_hud",
  "write_back"
];

const requiredStorageTokens = [
  "createSqliteStore",
  "CREATE TABLE IF NOT EXISTS datasets",
  "CREATE TABLE IF NOT EXISTS device_sessions",
  "CREATE TABLE IF NOT EXISTS mission_ledger",
  "datasetCall",
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
  "RokidUxrBoundary.IsCompiled"
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
  const directionChecks = includesAll(sources.goal, requiredGoalDirection);
  const reviewerChecks = includesAll(sources.goal, requiredGoalReviewerTokens);
  const combinedDirectionChecks = includesAll(`${sources.goal}\n${sources.contract}\n${sources.webJs}`, requiredCombinedDirection);
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
    ...reviewerChecks.filter((item) => !item.ok).map((item) => `Kepler reviewer rule missing: ${item.needle}`),
    ...combinedDirectionChecks.filter((item) => !item.ok).map((item) => `mainline contract missing: ${item.needle}`),
    ...webChecks.filter((item) => !item.ok).map((item) => `web module missing: ${item.needle}`),
    ...contractChecks.filter((item) => !item.ok).map((item) => `contract token missing: ${item.needle}`),
    ...unityChecks.filter((item) => !item.ok).map((item) => `unity controller token missing: ${item.needle}`),
    ...unityGitignoreChecks.filter((item) => !item.ok).map((item) => `Unity gitignore missing: ${item.needle}`),
    ...storageChecks.filter((item) => !item.ok).map((item) => `storage token missing: ${item.needle}`),
    ...backupChecks.filter((item) => !item.ok).map((item) => `SQLite backup token missing: ${item.needle}`),
    ...backupGuardChecks.filter((item) => !item.ok).map((item) => `SQLite backup guard missing: ${item.needle}`),
    ...syncChecks.filter((item) => !item.ok).map((item) => `git auto-sync token missing: ${item.needle}`)
  ];

  assert(space.space_id === "innerworld_campus_wall", "space id drifted");
  assert(Array.isArray(space.anchors) && space.anchors.length === 3, "space must keep A1/A2/A3 anchors");
  assert(space.anchors.some((anchor) => anchor.anchor_id === "A3" && anchor.kind === "write_back"), "A3 write-back anchor missing");
  assert(hardware.project_fit?.assessment === "fit", "hardware manifest fit assessment missing");
  assert(hardware.loan_terms_summary?.borrow_deadline === "2026-08-31", "hardware borrow deadline drifted");

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
    reviewer: "Kepler",
    sqlite_backup_tokens: requiredBackupTokens.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
