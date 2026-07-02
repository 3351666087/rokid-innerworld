import { createServer } from "node:http";
import { aiPromptPath, aiSchemaPath, databasePath, fieldMarkersPath, hardwareManifestPath, outputDir, spacePath, statePath, webDir } from "./src/paths.js";
import { createRuntimeStore } from "./src/store/runtime-store.js";
import { createApiRouter } from "./src/http/api-router.js";
import { sendError, sendPreflight } from "./src/http/response.js";
import { createStaticFileServer } from "./src/http/static-files.js";
import { createOpsStatusService } from "./src/ops/status-service.js";
import { createSqliteStore } from "./src/store/sqlite-store.js";

const port = Number(process.env.PORT || 5177);
const host = process.env.HOST || "127.0.0.1";

const sqliteStore = await createSqliteStore({
  aiSchemaPath,
  databasePath,
  hardwareManifestPath,
  legacyStatePath: statePath,
  spacePath
});
const runtimeStore = createRuntimeStore({ spacePath, statePath, sqliteStore });
const { loadSpace, loadState, resetState, updateState } = runtimeStore;

const buildOpsStatus = createOpsStatusService({ loadSpace, loadState, outputDir, hardwareManifestPath, host, port });
const routeApi = createApiRouter({
  aiPromptPath,
  aiSchemaPath,
  buildOpsStatus,
  fieldMarkersPath,
  loadSpace,
  loadState,
  port,
  resetState,
  sqliteStore,
  updateState
});
const serveStatic = createStaticFileServer({ webDir });

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "OPTIONS") {
        sendPreflight(res);
        return;
      }
      await routeApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error.message || "internal_error");
  }
});

server.listen(port, host, () => {
  const localUrl = host === "0.0.0.0" ? `http://localhost:${port}/` : `http://${host}:${port}/`;
  console.log(`InnerWorld Space Server running at ${localUrl}`);
  if (host === "0.0.0.0") {
    console.log(`LAN mode enabled. Use the Windows host IP with port ${port} for Rokid/phone access.`);
  }
});
