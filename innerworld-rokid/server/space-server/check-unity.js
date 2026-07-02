import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const base = process.env.BASE_URL || "http://localhost:5177";
const spaceId = "innerworld_campus_wall";
const qaUser = "UNITY_QA";

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

async function fetchJson(path, options = {}) {
  const res = await fetch(`${base}${path}`, options);
  assertJsonHeaders(res, path);
  const body = await res.json();
  return { res, body };
}

async function resetState() {
  const { res, body } = await fetchJson("/api/reset", { method: "POST" });
  assert(res.ok, "reset request failed");
  return body;
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function assertUnityAdapterBoundary() {
  const [controller, poseProvider, bindingProbe, boundaryStatus, resolver, editorInput, fallbackOverlay, uxrInput, uxrOverlay, docs] = await Promise.all([
    readText("apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/IRokidPoseProvider.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidSdkBindingProbe.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidAdapterBoundaryStatus.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidAdapterResolver.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/EditorRokidInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/FallbackRokidOverlayRenderer.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidUxrInputSource.cs"),
    readText("apps/unity-shell/Assets/Scripts/Rokid/RokidUxrOverlayRenderer.cs"),
    readText("docs/rokid-device-integration.md")
  ]);

  assert(controller.includes("RokidAdapterResolver.Resolve(presentationStrategy)"), "Unity controller resolver boundary missing");
  assert(controller.includes("private RokidAdapterBoundaryStatus rokidAdapterStatus;"), "Unity controller boundary status missing");
  assert(controller.includes("private IRokidInputStateSink rokidInputStateSink;"), "Unity controller input state sink missing");
  assert(controller.includes("RokidSdkBindingProbe.Detect().BoundaryCompiled"), "Unity controller SDK binding probe environment missing");
  assert(poseProvider.includes("interface IRokidInputStateSink"), "Unity input state sink interface missing");
  assert(bindingProbe.includes("innerworld-rokid-sdk-binding/v1"), "Rokid SDK binding schema missing");
  assert(bindingProbe.includes("public enum RokidSdkBindingStage"), "Rokid SDK binding stage enum missing");
  assert(bindingProbe.includes("RokidSdkBindingProbe"), "Rokid SDK binding probe missing");
  assert(bindingProbe.includes("AppDomain.CurrentDomain.GetAssemblies"), "Rokid SDK binding assembly probe missing");
  assert(bindingProbe.includes("LiveBindingReady"), "Rokid SDK live binding state missing");
  assert(boundaryStatus.includes("DefineSymbol = \"ROKID_UXR\""), "ROKID_UXR define marker missing");
  assert(boundaryStatus.includes("#if ROKID_UXR"), "ROKID_UXR compile guard missing");
  assert(boundaryStatus.includes("RokidSdkBindingReport"), "Rokid adapter status SDK binding report missing");
  assert(boundaryStatus.includes("IsSdkLiveBindingReady"), "Rokid adapter status live binding flag missing");
  assert(resolver.includes("#if ROKID_UXR"), "Rokid resolver compile guard missing");
  assert(resolver.includes("RokidSdkBindingProbe.Detect()"), "Rokid resolver SDK binding probe missing");
  assert(resolver.includes("new RokidUxrInputSource"), "Rokid UXR input resolver path missing");
  assert(resolver.includes("new RokidUxrOverlayRenderer"), "Rokid UXR overlay resolver path missing");
  assert(resolver.includes("new EditorRokidInputSource"), "Rokid fallback input resolver path missing");
  assert(resolver.includes("new FallbackRokidOverlayRenderer"), "Rokid fallback overlay resolver path missing");
  assert(editorInput.includes("IRokidInputStateSink"), "Editor input state sink implementation missing");
  assert(fallbackOverlay.includes("IRokidOverlayRenderer"), "Fallback overlay renderer missing");
  assert(uxrInput.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR input file must be fully guarded");
  assert(uxrInput.includes("SDK input binding pending"), "Rokid UXR input stub message missing");
  assert(uxrOverlay.trimStart().startsWith("#if ROKID_UXR"), "Rokid UXR overlay file must be fully guarded");
  assert(docs.includes("RokidAdapterResolver.Resolve"), "Rokid adapter boundary docs missing");
  assert(docs.includes("ROKID_UXR"), "Rokid UXR docs missing");
  return "ROKID_UXR";
}

async function main() {
  let wrote = false;
  try {
    const adapterBoundary = await assertUnityAdapterBoundary();

    const preflight = await fetch(`${base}/api/health`, {
      method: "OPTIONS",
      headers: {
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type"
      }
    });
    assert(preflight.status === 204, "OPTIONS preflight status check failed");
    assert(preflight.headers.get("access-control-allow-origin") === "*", "OPTIONS CORS origin check failed");
    assert((preflight.headers.get("access-control-allow-methods") || "").includes("OPTIONS"), "OPTIONS methods check failed");
    assert((preflight.headers.get("access-control-allow-headers") || "").includes("content-type"), "OPTIONS headers check failed");

    const resetBefore = await resetState();
    assert(resetBefore.mission_state === "entered", "initial reset mission_state check failed");

    const { body: health } = await fetchJson("/api/health");
    assert(health.ok === true, "health ok check failed");
    assert(health.demo_ready === true, "demo readiness check failed");
    assert(health.space_id === spaceId, "health space_id check failed");
    assert(health.anchor_count === 3, "health anchor_count check failed");
    assert(health.mission_state === "entered", "health mission_state check failed");
    assert(typeof health.cache_safe_note === "string" && health.cache_safe_note.includes("no-store"), "health cache note check failed");

    const { body: space } = await fetchJson(`/api/spaces/${spaceId}`);
    assert(space.space_id === spaceId, "space payload check failed");
    assert(space.runtime?.mission_state === "entered", "space runtime check failed");
    assert(Array.isArray(space.anchors) && space.anchors.length === health.anchor_count, "space anchor check failed");

    const { body: nearby } = await fetchJson("/api/pins/nearby?radius=20");
    assert(nearby.space_id === spaceId, "nearby space_id check failed");
    assert(Array.isArray(nearby.pins) && nearby.pins.length === health.anchor_count, "nearby pins check failed");

    const { res: writeRes, body: write } = await fetchJson(`/api/spaces/${spaceId}/beacons`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        user_id: qaUser,
        anchor_id: "A3",
        title: "Unity QA writeback",
        text: "Unity QA writeback loop is reachable."
      })
    });
    wrote = true;
    assert(writeRes.status === 201, "write-back status check failed");
    assert(write.ok === true, "write-back ok check failed");
    assert(write.beacon?.source === qaUser, "write-back beacon source check failed");

    const { body: stateAfterWrite } = await fetchJson("/api/state");
    assert(stateAfterWrite.mission_state === "complete", "state mission_state after write check failed");
    assert(stateAfterWrite.completed_steps?.includes("write_back"), "state completed_steps check failed");
    assert(stateAfterWrite.beacons?.some((item) => item.source === qaUser), "state write-back beacon check failed");

    const resetAfter = await resetState();
    wrote = false;
    assert(resetAfter.mission_state === "entered", "final reset mission_state check failed");
    assert(Array.isArray(resetAfter.completed_steps) && resetAfter.completed_steps.length === 0, "final reset completed_steps check failed");
    assert(!resetAfter.beacons.some((item) => item.source === qaUser), "final reset write-back cleanup check failed");

    const { body: healthAfterReset } = await fetchJson("/api/health");
    assert(healthAfterReset.mission_state === "entered", "health after reset mission_state check failed");
    assert(healthAfterReset.beacon_count === resetAfter.beacons.length, "health after reset beacon_count check failed");

    console.log(JSON.stringify({
      ok: true,
      base,
      space_id: healthAfterReset.space_id,
      anchors: healthAfterReset.anchor_count,
      beacons_after_reset: healthAfterReset.beacon_count,
      mission_state: healthAfterReset.mission_state,
      cors: "ok",
      cache: "no-store",
      adapter_boundary: adapterBoundary
    }, null, 2));
  } catch (error) {
    if (wrote) {
      try {
        await resetState();
      } catch (resetError) {
        console.error("cleanup reset failed", resetError);
      }
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
