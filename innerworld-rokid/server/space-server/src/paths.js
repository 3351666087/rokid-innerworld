import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const serverDir = path.resolve(__dirname, "..");
export const root = path.resolve(serverDir, "../..");
export const dataDir = path.join(root, "data");
export const aiDir = path.join(root, "ai");
export const webDir = path.join(root, "apps", "web-demo");
export const outputDir = path.join(root, "output");

export const spacePath = path.join(dataDir, "space_demo.json");
export const statePath = path.join(dataDir, "runtime_state.json");
export const databasePath = path.join(dataDir, "innerworld.sqlite");
export const hardwareManifestPath = path.join(dataDir, "hardware_manifest.json");
export const fieldMarkersPath = path.join(dataDir, "field_markers.json");
export const aiSchemaPath = path.join(aiDir, "schema.json");
export const aiPromptPath = path.join(aiDir, "prompt.md");
