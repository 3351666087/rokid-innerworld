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
  await postJson("/api/reset", "reset", {});

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
  for (const id of ["space.contract", "ai.hud_schema", "hardware.applied_kit", "runtime.mission_ledger"]) {
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

  const interaction = await postJson("/api/interactions", "interaction_write", {
    user_id: "A",
    anchor_id: "A2",
    step_id: "read",
    mission_state: "reading",
    ip_address: "10.0.0.18",
    access_token: "real-token-secret"
  });
  assert(interaction.ok === true, "interaction write ok failed");
  assert(interaction.ledger?.type === "interaction", "interaction ledger missing");

  const findYear = await postJson("/api/interactions", "find_year_write", {
    user_id: "A",
    anchor_id: "A2",
    step_id: "find_year",
    mission_state: "doing"
  });
  assert(findYear.ok === true, "find year write ok failed");
  assert(findYear.ledger?.type === "interaction", "find year ledger missing");

  const service = await postJson("/api/service-actions", "service_action_write", {
    user_id: "A",
    anchor_id: "A2",
    action_id: "JOIN_EVENT_1430",
    label: "Join 14:30"
  });
  assert(service.ok === true, "service action write ok failed");
  assert(service.ledger?.type === "service_action", "service action ledger missing");

  const writeBack = await postJson("/api/spaces/innerworld_campus_wall/beacons", "write_back_write", {
    user_id: "A",
    anchor_id: "A3",
    title: "Time capsule",
    text: "后来的人，别忘了抬头看这里。",
    serial_number: "SN-ABC-SECRET"
  });
  assert(writeBack.ok === true, "write-back write ok failed");
  assert(writeBack.ledger?.type === "write_back", "write-back ledger missing");

  const [ledgerSummary, ledgerEvents, ledgerDataset] = await Promise.all([
    fetchJson("/api/ledger/summary", "ledger_summary"),
    fetchJson("/api/ledger/events?limit=20", "ledger_events"),
    postJson("/api/datasets/call", "dataset_call_ledger", {
      dataset_id: "runtime.mission_ledger",
      operation: "snapshot",
      limit: 20
    })
  ]);
  assert(ledgerSummary.ok === true, "ledger summary ok failed");
  assert(ledgerSummary.engine === "sqlite", "ledger engine must be sqlite");
  assert(ledgerSummary.dataset_id === "runtime.mission_ledger", "ledger summary dataset mismatch");
  assert(ledgerSummary.checks?.has_interaction === true, "ledger interaction check failed");
  assert(ledgerSummary.checks?.has_service_action === true, "ledger service action check failed");
  assert(ledgerSummary.checks?.has_write_back === true, "ledger write-back check failed");
  assert(ledgerSummary.mission?.completed_steps?.includes("write_back"), "ledger mission completed steps failed");
  assert(ledgerSummary.service_actions?.total >= 1, "ledger service action summary failed");
  assert(ledgerSummary.mission?.completed_step_count >= 4, "ledger mission completed step count failed");
  assert(ledgerSummary.audit?.event_count >= 4, "ledger audit event count failed");
  assert(ledgerEvents.ok === true, "ledger events ok failed");
  assert(Array.isArray(ledgerEvents.events) && ledgerEvents.events.length >= 4, "ledger events missing");
  assert(ledgerDataset.ok === true, "ledger dataset ok failed");
  assert(ledgerDataset.dataset.dataset_id === "runtime.mission_ledger", "ledger dataset id failed");
  assert(ledgerDataset.records.length >= 4, "ledger dataset records missing");

  const refreshedStore = await fetchJson("/api/store/status", "store_status_after_writes");
  assert(refreshedStore.mission_ledger_events >= 4, "store mission ledger count failed");

  const allText = JSON.stringify({
    store,
    catalog,
    spaceSnapshot,
    hardware,
    interaction,
    findYear,
    service,
    writeBack,
    ledgerSummary,
    ledgerEvents,
    ledgerDataset,
    refreshedStore
  });
  for (const forbidden of ["SN-ABC-SECRET", "real-token-secret", "10.0.0.18", "private-demo-wifi", "00:11:22:33:44:55"]) {
    assert(!allText.includes(forbidden), `store API leaked forbidden value: ${forbidden}`);
  }

  console.log(JSON.stringify({
    ok: true,
    base,
    engine: store.engine,
    runtime_state: refreshedStore.runtime_state,
    mission_ledger_events: refreshedStore.mission_ledger_events,
    ledger_checks: ledgerSummary.checks,
    datasets: datasetIds,
    space_records: spaceSnapshot.records.length,
    hardware_devices: hardware.record.value.devices.map((device) => device.model)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
