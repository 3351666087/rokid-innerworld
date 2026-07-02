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
  sqliteStore: path.join(root, "server", "space-server", "src", "store", "sqlite-store.js"),
  gitAutoSync: path.join(root, "tools", "git-auto-sync.ps1"),
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
  "ai_hud",
  "write_back"
];

const requiredStorageTokens = [
  "createSqliteStore",
  "CREATE TABLE IF NOT EXISTS datasets",
  "CREATE TABLE IF NOT EXISTS device_sessions",
  "datasetCall",
  "raw_sql_api"
];

const requiredUnityTokens = [
  "SpaceApiClient",
  "BootstrapAndLoadSpace",
  "PostWriteBack",
  "RokidInput",
  "Gaze Anchor Reticle"
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
  const combinedDirectionChecks = includesAll(`${sources.goal}\n${sources.contract}\n${sources.webJs}`, requiredCombinedDirection);
  const webChecks = includesAll(`${sources.webHtml}\n${sources.webJs}`, requiredWebModules);
  const contractChecks = includesAll(sources.contract, requiredContractTokens);
  const unityChecks = includesAll(sources.unityController, requiredUnityTokens);
  const storageChecks = includesAll(sources.sqliteStore, requiredStorageTokens);
  const syncChecks = includesAll(sources.gitAutoSync, ["add -A", "git -C", "check:security"]);

  const failures = [
    ...directionChecks.filter((item) => !item.ok).map((item) => `active goal missing: ${item.needle}`),
    ...combinedDirectionChecks.filter((item) => !item.ok).map((item) => `mainline contract missing: ${item.needle}`),
    ...webChecks.filter((item) => !item.ok).map((item) => `web module missing: ${item.needle}`),
    ...contractChecks.filter((item) => !item.ok).map((item) => `contract token missing: ${item.needle}`),
    ...unityChecks.filter((item) => !item.ok).map((item) => `unity controller token missing: ${item.needle}`),
    ...storageChecks.filter((item) => !item.ok).map((item) => `storage token missing: ${item.needle}`),
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
    storage_tokens: requiredStorageTokens.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
