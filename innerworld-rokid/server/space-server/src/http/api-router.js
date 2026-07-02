import { readFile } from "node:fs/promises";
import {
  INNERWORLD_SERVICE_NAME,
  buildDemoStatus,
  buildDeviceBootstrap as buildDeviceBootstrapPayload,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";
import { buildDeviceManifest, createDeviceRuntimeStore } from "../domain/device-runtime.js";
import { buildEvidenceChain } from "../domain/evidence-chain.js";
import { buildSessionPlan } from "../domain/session-planner.js";
import { applyInteraction, applyServiceAction, applyWriteBack } from "../domain/mission-engine.js";
import { generateHudOutput } from "../domain/hud-generator.js";
import { readJson } from "../lib/json-file.js";
import { readBody, sendError, sendJson } from "./response.js";

function getRequestBaseUrl(req, url, port) {
  const explicitBaseUrl = url.searchParams.get("base_url") || url.searchParams.get("public_url");
  if (explicitBaseUrl && /^https?:\/\//i.test(explicitBaseUrl)) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }
  return new URL("/", `http://${req.headers.host || `localhost:${port}`}`).origin;
}

export function createApiRouter({
  aiPromptPath,
  aiSchemaPath,
  buildOpsStatus,
  loadSpace,
  loadState,
  port,
  resetState,
  sqliteStore,
  updateState
}) {
  const deviceRuntime = createDeviceRuntimeStore({
    restoreSnapshot: !sqliteStore,
    sessionStore: sqliteStore
  });

  async function loadDeviceBootstrap(req, url) {
    const [space, state, aiSchema] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath)
    ]);
    const baseUrl = getRequestBaseUrl(req, url, port);
    return buildDeviceBootstrapPayload({
      baseUrl,
      profile: url.searchParams.get("profile") || "rokid-ar",
      space,
      state,
      aiSchema
    });
  }

  async function loadDeviceManifest(req, url) {
    const [space, state, aiSchema] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath)
    ]);
    return buildDeviceManifest({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      aiSchema
    });
  }

  async function loadEvidenceChain(req, url) {
    const [space, state, aiSchema, opsStatus] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath),
      buildOpsStatus()
    ]);
    return buildEvidenceChain({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      aiSchema,
      opsStatus
    });
  }

  async function loadSessionPlan(req, url) {
    const [space, state, aiSchema] = await Promise.all([
      loadSpace(),
      loadState(),
      readJson(aiSchemaPath)
    ]);
    return buildSessionPlan({
      baseUrl: getRequestBaseUrl(req, url, port),
      space,
      state,
      aiSchema
    });
  }

  return async function routeApi(req, res, url) {
    if (req.method === "GET" && url.pathname === "/api/health") {
      const space = await loadSpace();
      const state = await loadState();
      sendJson(res, 200, {
        ok: true,
        service: INNERWORLD_SERVICE_NAME,
        port,
        time: new Date().toISOString(),
        ...buildDemoStatus(space, state)
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      sendJson(res, 200, await loadState());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ops/status") {
      sendJson(res, 200, await buildOpsStatus());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/store/status") {
      sendJson(res, 200, sqliteStore?.status?.() || {
        ok: false,
        error: "sqlite_store_unavailable"
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/datasets/catalog") {
      sendJson(res, 200, sqliteStore?.catalog?.() || {
        ok: false,
        error: "dataset_store_unavailable"
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/datasets/call") {
      const body = await readBody(req);
      const result = sqliteStore?.datasetCall?.(body) || {
        ok: false,
        status: 503,
        error: "dataset_store_unavailable"
      };
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "dataset_call_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/evidence/chain") {
      sendJson(res, 200, await loadEvidenceChain(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/session/plan") {
      sendJson(res, 200, await loadSessionPlan(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/bootstrap") {
      sendJson(res, 200, await loadDeviceBootstrap(req, url));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/manifest") {
      sendJson(res, 200, await loadDeviceManifest(req, url));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/device/register") {
      const [space, state, aiSchema, body] = await Promise.all([
        loadSpace(),
        loadState(),
        readJson(aiSchemaPath),
        readBody(req)
      ]);
      sendJson(res, 201, deviceRuntime.register({
        body,
        baseUrl: getRequestBaseUrl(req, url, port),
        space,
        state,
        aiSchema
      }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/device/heartbeat") {
      const [space, state, body] = await Promise.all([
        loadSpace(),
        loadState(),
        readBody(req)
      ]);
      const result = deviceRuntime.heartbeat({
        body,
        baseUrl: getRequestBaseUrl(req, url, port),
        space,
        state
      });
      if (result.ok === false) {
        sendError(res, result.status || 400, result.error || "device_heartbeat_failed");
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/device/sessions") {
      sendJson(res, 200, deviceRuntime.sessionsSummary());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ai/schema") {
      sendJson(res, 200, await readJson(aiSchemaPath));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ai/prompt") {
      const prompt = await readFile(aiPromptPath, "utf8");
      sendJson(res, 200, {
        ok: true,
        title: "InnerWorld HUD Prompt",
        format: "markdown",
        prompt: prompt.replace(/^\uFEFF/, "")
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/hud") {
      const [space, state, aiSchema, body] = await Promise.all([
        loadSpace(),
        loadState(),
        readJson(aiSchemaPath),
        readBody(req)
      ]);
      sendJson(res, 200, generateHudOutput({ space, state, aiSchema, body }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reset") {
      const state = await resetState();
      sendJson(res, 200, state);
      return;
    }

    const spaceMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)$/);
    if (req.method === "GET" && spaceMatch) {
      const space = await loadSpace();
      const state = await loadState();
      if (spaceMatch[1] !== space.space_id) {
        sendError(res, 404, "space_not_found");
        return;
      }
      normalizeMissionState(space, state);
      sendJson(res, 200, {
        ...space,
        runtime: {
          active_user: state.active_user,
          mission_state: state.mission_state,
          current_step_index: state.current_step_index,
          completed_steps: state.completed_steps
        },
        beacons: state.beacons
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/pins/nearby") {
      const space = await loadSpace();
      const state = await loadState();
      sendJson(res, 200, {
        space_id: space.space_id,
        radius_m: Number(url.searchParams.get("radius") || 20),
        pins: space.anchors.map((anchor) => ({
          ...anchor,
          beacons: state.beacons.filter((beacon) => beacon.anchor_id === anchor.anchor_id)
        }))
      });
      return;
    }

    const beaconsMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)\/beacons$/);
    if (req.method === "POST" && beaconsMatch) {
      const space = await loadSpace();
      if (beaconsMatch[1] !== space.space_id) {
        sendError(res, 404, "space_not_found");
        return;
      }
      const body = await readBody(req);
      const text = String(body.text || "").trim();
      if (!text) {
        sendError(res, 400, "text_required");
        return;
      }
      const updated = await updateState((state, latestSpace) => {
        return applyWriteBack({ state, space: latestSpace, body, text });
      });
      sendJson(res, 201, { ok: true, beacon: updated.result, state: updated.state });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/interactions") {
      const body = await readBody(req);
      const updated = await updateState((state, space) => {
        return applyInteraction({ state, space, body });
      });
      sendJson(res, 200, { ok: true, state: updated.state });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/service-actions") {
      const body = await readBody(req);
      const updated = await updateState((state, space) => {
        return applyServiceAction({ state, space, body });
      });
      sendJson(res, 200, { ok: true, action: body, state: updated.state });
      return;
    }

    sendError(res, 404, "api_route_not_found");
  };
}
