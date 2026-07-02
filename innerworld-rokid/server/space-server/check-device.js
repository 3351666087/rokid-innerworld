const base = process.env.BASE_URL || "http://localhost:5177";
const expectedSpaceId = "innerworld_campus_wall";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertJsonHeaders(res, label) {
  const contentType = res.headers.get("content-type") || "";
  const cacheControl = res.headers.get("cache-control") || "";
  const corsOrigin = res.headers.get("access-control-allow-origin") || "";
  assert(contentType.includes("application/json"), `${label} content-type check failed`);
  assert(cacheControl.includes("no-store"), `${label} cache-control check failed`);
  assert(corsOrigin === "*", `${label} CORS origin check failed`);
}

async function fetchJson(url, label) {
  const res = await fetch(url);
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed`);
  return body;
}

async function postJson(url, label, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed`);
  return body;
}

function assertEndpoint(endpoint, label, method = "GET") {
  assert(endpoint, `${label} endpoint missing`);
  assert(endpoint.method === method, `${label} method check failed`);
  assert(typeof endpoint.path === "string" && endpoint.path.startsWith("/api/"), `${label} path check failed`);
  assert(typeof endpoint.url === "string" && endpoint.url.startsWith("http"), `${label} url check failed`);
}

async function main() {
  const bootstrapUrl = `${base}/api/device/bootstrap?profile=rokid-ar`;
  const bootstrap = await fetchJson(bootstrapUrl, "device bootstrap");

  assert(bootstrap.ok === true, "bootstrap ok check failed");
  assert(bootstrap.protocol_version === "innerworld-device-bootstrap/v1", "bootstrap protocol check failed");
  assert(bootstrap.profile === "rokid-ar", "bootstrap profile check failed");
  assert(bootstrap.space?.space_id === expectedSpaceId, "bootstrap space check failed");
  assert(Array.isArray(bootstrap.anchors) && bootstrap.anchors.length === 3, "bootstrap anchors check failed");
  assert(Array.isArray(bootstrap.mission?.steps) && bootstrap.mission.steps.length === 4, "bootstrap mission steps check failed");
  assert(bootstrap.ai?.display_text_max_length === 54, "bootstrap AI display max length check failed");
  assert(bootstrap.unity_compat?.config?.space_id === expectedSpaceId, "bootstrap Unity config check failed");
  assert(bootstrap.client_hints?.poll_interval_ms > 0, "bootstrap polling hint check failed");

  const endpoints = bootstrap.endpoints || {};
  assertEndpoint(endpoints.health, "health");
  assertEndpoint(endpoints.ops_status, "ops_status");
  assertEndpoint(endpoints.device_bootstrap, "device_bootstrap");
  assertEndpoint(endpoints.ai_schema, "ai_schema");
  assertEndpoint(endpoints.ai_prompt, "ai_prompt");
  assertEndpoint(endpoints.ai_hud, "ai_hud", "POST");
  assertEndpoint(endpoints.space, "space");
  assertEndpoint(endpoints.state, "state");
  assertEndpoint(endpoints.nearby_pins, "nearby_pins");
  assertEndpoint(endpoints.interactions, "interactions", "POST");
  assertEndpoint(endpoints.service_actions, "service_actions", "POST");
  assertEndpoint(endpoints.write_back, "write_back", "POST");
  assertEndpoint(endpoints.reset, "reset", "POST");

  const [health, space, aiSchema, aiPrompt] = await Promise.all([
    fetchJson(endpoints.health.url, "health"),
    fetchJson(endpoints.space.url, "space"),
    fetchJson(endpoints.ai_schema.url, "ai_schema"),
    fetchJson(endpoints.ai_prompt.url, "ai_prompt")
  ]);

  assert(health.ok === true, "health ok check failed");
  assert(health.space_id === expectedSpaceId, "health space id check failed");
  assert(space.space_id === expectedSpaceId, "space payload check failed");
  assert(aiSchema.title === "InnerWorld HUD AI Output", "AI schema title check failed");
  assert(aiSchema.properties?.display_text?.maxLength === 54, "AI schema display_text check failed");
  assert(aiPrompt.ok === true, "AI prompt ok check failed");
  assert(typeof aiPrompt.prompt === "string" && aiPrompt.prompt.includes("Rokid"), "AI prompt content check failed");

  const hud = await postJson(endpoints.ai_hud.url, "ai_hud", {
    anchor_id: "A2",
    user_action: "gaze"
  });
  assert(typeof hud.display_text === "string" && hud.display_text.length > 0, "AI HUD display text check failed");
  assert(hud.display_text.length <= aiSchema.properties.display_text.maxLength, "AI HUD max length check failed");
  assert(["none", "weak", "strong", "answer"].includes(hud.hint_level), "AI HUD hint level check failed");
  assert(hud.write_back_review?.tag === "time_capsule", "AI HUD write-back tag check failed");

  console.log(JSON.stringify({
    ok: true,
    base,
    protocol_version: bootstrap.protocol_version,
    profile: bootstrap.profile,
    space_id: bootstrap.space.space_id,
    anchors: bootstrap.anchors.length,
    mission_steps: bootstrap.mission.steps.length,
    endpoints: Object.keys(endpoints).length,
    ai_schema_title: aiSchema.title,
    ai_hud_hint_level: hud.hint_level,
    prompt_chars: aiPrompt.prompt.length,
    unity_base_url: bootstrap.unity_compat.config.base_url
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
