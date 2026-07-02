const base = process.env.BASE_URL || "http://localhost:5177";
const requireArtifacts = process.argv.includes("--require-artifacts") || process.env.REQUIRE_OPS_ARTIFACTS === "1";
const homepageModules = [
  "Operator Console",
  "Mission Flow",
  "Product System",
  "Agent Runtime",
  "Show Mode",
  "Hardware Runtime",
  "Wall Calibration",
  "Mission Ledger"
];

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

async function fetchJson(route) {
  const res = await fetch(`${base}${route}`);
  assertJsonHeaders(res, route);
  const body = await res.json();
  assert(res.ok, `${route} status check failed`);
  return body;
}

async function postJson(route, payload) {
  const res = await fetch(`${base}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  assertJsonHeaders(res, route);
  const body = await res.json();
  assert(res.ok, `${route} status check failed`);
  return body;
}

async function fetchText(route, label) {
  const res = await fetch(`${base}${route}`);
  assert(res.ok, `${label} status check failed`);
  return res.text();
}

async function main() {
  const [health, ops, htmlRes, appJs, ledgerSummary, ledgerEvents, wallCalibration] = await Promise.all([
    fetchJson("/api/health"),
    fetchJson("/api/ops/status"),
    fetch(`${base}/`),
    fetchText("/app.js", "web demo app script"),
    fetchJson("/api/ledger/summary"),
    fetchJson("/api/ledger/events?limit=8"),
    fetchJson("/api/calibration/wall")
  ]);
  const html = await htmlRes.text();
  const hud = await postJson("/api/ai/hud", {
    anchor_id: "A1",
    mission_state: health.mission_state
  });

  assert(health.ok === true, "health ok check failed");
  assert(ops.ok === true, "ops ok check failed");
  assert(ops.health?.demo_ready === true, "ops health demo_ready check failed");
  assert(ops.health?.space_id === "innerworld_campus_wall", "ops health space_id check failed");
  assert(ops.health?.mission_state === health.mission_state, "ops health mission_state mismatch");
  assert(ops.health?.beacon_count === health.beacon_count, "ops health beacon_count mismatch");
  assert(typeof ops.local_url === "string" && ops.local_url.includes(String(ops.port)), "ops local_url check failed");
  assert(ops.hardware?.fit === "fit", "ops hardware fit check failed");
  assert(ops.hardware?.borrow_deadline === "2026-08-31", "ops hardware borrow deadline check failed");
  assert(Array.isArray(ops.hardware?.devices) && ops.hardware.devices.length === 2, "ops hardware devices check failed");
  assert(ops.hardware.devices.some((device) => device.model === "RA202"), "ops hardware RA202 missing");
  assert(ops.hardware.devices.some((device) => device.model === "RAS201"), "ops hardware RAS201 missing");
  assert(ledgerSummary.ok === true, "ledger summary ok check failed");
  assert(ledgerSummary.engine === "sqlite", "ledger summary engine check failed");
  assert(ledgerSummary.dataset_id === "runtime.mission_ledger", "ledger dataset check failed");
  assert(ledgerSummary.mission?.state, "ledger mission summary check failed");
  assert(ledgerEvents.ok === true, "ledger events ok check failed");
  assert(Array.isArray(ledgerEvents.events), "ledger events list check failed");
  assert(wallCalibration.ok === true, "wall calibration ok check failed");
  assert(wallCalibration.schema === "innerworld-wall-calibration/v1", "wall calibration schema check failed");
  assert(Array.isArray(wallCalibration.anchors) && wallCalibration.anchors.length === 3, "wall calibration anchor list check failed");
  assert(wallCalibration.runtime?.summary, "wall calibration summary check failed");

  assert(htmlRes.ok, "homepage status check failed");
  for (const moduleLabel of homepageModules) {
    assert(html.includes(moduleLabel), `homepage module missing: ${moduleLabel}`);
  }
  assert(appJs.includes("/api/ai/hud"), "web demo HUD route missing");
  assert(appJs.includes("/api/ledger/summary"), "web demo ledger summary route missing");
  assert(appJs.includes("/api/ledger/events"), "web demo ledger events route missing");
  assert(appJs.includes("/api/calibration/wall"), "web demo wall calibration route missing");
  assert(appJs.includes("/api/calibration/observations"), "web demo wall calibration observation route missing");
  assert(appJs.includes("renderLedgerAudit"), "web demo ledger renderer missing");
  assert(appJs.includes("renderWallCalibration"), "web demo wall calibration renderer missing");
  assert(typeof hud.mission_state === "string", "AI HUD mission_state check failed");
  assert(typeof hud.display_text === "string" && hud.display_text.length > 0, "AI HUD display_text check failed");
  assert(["none", "weak", "strong"].includes(hud.hint_level), "AI HUD hint_level check failed");

  if (ops.packages?.main_package) {
    assert(ops.packages.main_package.exists !== false, "main package exists check failed");
    assert(typeof ops.packages.main_package.sha256 === "string", "main package sha check failed");
  }
  if (ops.packages?.server_package) {
    assert(ops.packages.server_package.exists !== false, "server package exists check failed");
    assert(typeof ops.packages.server_package.sha256 === "string", "server package sha check failed");
  }
  if (ops.deploy_dry_run) {
    assert(ops.deploy_dry_run.ok === true, "deploy dry-run ok check failed");
    assert(typeof ops.deploy_dry_run.zip_sha256 === "string", "deploy dry-run sha check failed");
  }

  if (requireArtifacts) {
    assert(ops.release_index?.ok === true, "release index latest check failed");
    assert(ops.packages?.main_package?.exists === true, "required main package missing");
    assert(ops.packages?.server_package?.exists === true, "required server package missing");
    assert(ops.deploy_dry_run?.ok === true, "required deploy dry-run missing");
    assert(ops.ops_monitor?.ok === true, "required ops monitor latest missing");
  }

  console.log(JSON.stringify({
    ok: true,
    base,
    require_artifacts: requireArtifacts,
    mission_state: ops.health.mission_state,
    beacons: ops.health.beacon_count,
    main_package: ops.packages?.main_package?.path || null,
    server_package: ops.packages?.server_package?.path || null,
    deploy_dry_run_ok: ops.deploy_dry_run?.ok ?? null,
    ops_monitor_ok: ops.ops_monitor?.ok ?? null,
    hardware_devices: ops.hardware.devices.map((device) => device.model).join(","),
    ledger_engine: ledgerSummary.engine,
    ledger_events: ledgerEvents.events.length,
    homepage_modules: homepageModules,
    ai_hud_ok: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
