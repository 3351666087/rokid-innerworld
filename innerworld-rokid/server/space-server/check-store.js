const base = process.env.BASE_URL || "http://localhost:5177";

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

async function fetchJson(path, label) {
  const res = await fetch(`${base}${path}`);
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed`);
  return body;
}

async function postJson(path, label, payload) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  assertJsonHeaders(res, label);
  const body = await res.json();
  assert(res.ok, `${label} status check failed`);
  return body;
}

async function main() {
  const [health, store, catalog] = await Promise.all([
    fetchJson("/api/health", "health"),
    fetchJson("/api/store/status", "store_status"),
    fetchJson("/api/datasets/catalog", "dataset_catalog")
  ]);

  assert(health.ok === true, "health ok failed");
  assert(store.ok === true, "store ok failed");
  assert(store.engine === "sqlite", "store engine must be sqlite");
  assert(store.safe_storage?.raw_sql_api === false, "raw SQL API must stay disabled");
  assert(store.safe_storage?.git_ignored === true, "SQLite database must be git ignored");
  assert(catalog.ok === true, "catalog ok failed");
  assert(catalog.engine === "sqlite", "catalog engine must be sqlite");
  assert(Array.isArray(catalog.datasets), "catalog datasets missing");

  const datasetIds = catalog.datasets.map((dataset) => dataset.dataset_id);
  for (const id of ["space.contract", "ai.hud_schema", "hardware.applied_kit"]) {
    assert(datasetIds.includes(id), `catalog missing ${id}`);
  }

  const spaceSnapshot = await postJson("/api/datasets/call", "dataset_call_space", {
    dataset_id: "space.contract",
    operation: "snapshot",
    limit: 20
  });
  assert(spaceSnapshot.ok === true, "space snapshot ok failed");
  assert(spaceSnapshot.dataset.dataset_id === "space.contract", "space dataset id failed");
  assert(spaceSnapshot.records.some((record) => record.record_id === "space"), "space record missing");

  const hardware = await postJson("/api/datasets/call", "dataset_call_hardware", {
    dataset_id: "hardware.applied_kit",
    operation: "get_record",
    record_id: "kit"
  });
  assert(hardware.ok === true, "hardware record ok failed");
  assert(hardware.record.value.devices.some((device) => device.model === "RA202"), "hardware RA202 missing");
  assert(hardware.record.value.devices.some((device) => device.model === "RAS201"), "hardware RAS201 missing");

  const allText = JSON.stringify({ store, catalog, spaceSnapshot, hardware });
  for (const forbidden of ["SN-ABC-SECRET", "real-token-secret", "10.0.0.18", "private-demo-wifi", "00:11:22:33:44:55"]) {
    assert(!allText.includes(forbidden), `store API leaked forbidden value: ${forbidden}`);
  }

  console.log(JSON.stringify({
    ok: true,
    base,
    engine: store.engine,
    runtime_state: store.runtime_state,
    datasets: datasetIds,
    space_records: spaceSnapshot.records.length,
    hardware_devices: hardware.record.value.devices.map((device) => device.model)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
