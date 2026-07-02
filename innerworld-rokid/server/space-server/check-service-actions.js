const base = process.env.BASE_URL || "http://localhost:5177";
const outboxLimit = 200;

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
  assert(res.ok, `${label} status check failed: ${body.error || res.status}`);
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
  assert(res.ok, `${label} status check failed: ${body.error || res.status}`);
  return body;
}

function assertNoSensitiveText(value, label) {
  const text = JSON.stringify(value);
  for (const forbidden of [
    "real-token-secret",
    "SN-ABC-SECRET",
    "10.0.0.18",
    "private-demo-wifi",
    "00:11:22:33:44:55"
  ]) {
    assert(!text.includes(forbidden), `${label} leaked forbidden value: ${forbidden}`);
  }
}

async function main() {
  await postJson("/api/reset", "reset", {});

  const baselineLedger = await fetchJson("/api/ledger/summary", "baseline_ledger");
  const baselineServiceActions = Number(baselineLedger.by_type?.service_action || 0);

  const created = await postJson("/api/service-actions", "create_service_action", {
    user_id: "A",
    anchor_id: "A2",
    action_id: "JOIN_EVENT_1430",
    label: "Join 14:30 demo",
    note: "operator note with real-token-secret 10.0.0.18 SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55",
    access_token: "real-token-secret",
    serial_number: "SN-ABC-SECRET",
    ip_address: "10.0.0.18"
  });
  assert(created.ok === true, "create ok failed");
  assert(created.record?.action_record_id, "create record id missing");
  assert(created.record.status === "pending", "created record should be pending");
  assert(created.ledger?.type === "service_action", "create ledger service action missing");
  assert(created.state?.completed_steps?.includes("service_action"), "mission state service step missing");
  assertNoSensitiveText(created, "create response");

  const recordId = created.record.action_record_id;
  const pendingOutbox = await fetchJson(`/api/service-actions/outbox?status=pending&limit=${outboxLimit}`, "pending_outbox");
  assert(pendingOutbox.ok === true, "pending outbox ok failed");
  assert(pendingOutbox.schema === "innerworld-service-action-outbox/v1", "pending outbox schema failed");
  assert(pendingOutbox.outbox.some((record) => record.action_record_id === recordId), "pending outbox record missing");
  assertNoSensitiveText(pendingOutbox, "pending outbox");

  const acked = await postJson(`/api/service-actions/${encodeURIComponent(recordId)}/ack`, "ack_service_action", {
    device_id: "rokid-field-device",
    ack_by: "operator-A",
    message: "ack real-token-secret 10.0.0.18 SN-ABC-SECRET private-demo-wifi 00:11:22:33:44:55",
    token: "real-token-secret",
    mac_address: "00:11:22:33:44:55"
  });
  assert(acked.ok === true, "ack ok failed");
  assert(acked.record?.action_record_id === recordId, "ack record id mismatch");
  assert(acked.record.status === "acknowledged", "ack status failed");
  assert(acked.record.acknowledged_at, "ack timestamp missing");
  assertNoSensitiveText(acked, "ack response");

  const [ackOutbox, allOutbox, ledgerSummary, ledgerEvents, storeStatus] = await Promise.all([
    fetchJson(`/api/service-actions/outbox?status=acknowledged&limit=${outboxLimit}`, "ack_outbox"),
    fetchJson(`/api/service-actions/outbox?status=all&limit=${outboxLimit}`, "all_outbox"),
    fetchJson("/api/ledger/summary", "ledger_summary"),
    fetchJson("/api/ledger/events?type=service_action&limit=20", "ledger_events"),
    fetchJson("/api/store/status", "store_status")
  ]);

  assert(ackOutbox.outbox.some((record) => record.action_record_id === recordId), "ack outbox record missing");
  assert(allOutbox.outbox.some((record) => record.action_record_id === recordId), "all outbox record missing");
  assert(ledgerSummary.ok === true, "ledger summary ok failed");
  assert(Number(ledgerSummary.by_type?.service_action || 0) >= baselineServiceActions + 1, "ledger service action count failed");
  assert(ledgerSummary.checks?.has_service_action === true, "ledger service action check failed");
  assert(ledgerEvents.ok === true, "ledger events ok failed");
  assert(ledgerEvents.events.some((event) => event.action_id === "JOIN_EVENT_1430"), "ledger event action id missing");
  assert(storeStatus.ok === true, "store status ok failed");
  assert(storeStatus.service_action_records >= 1, "store service action record count failed");
  assertNoSensitiveText({ ackOutbox, allOutbox, ledgerSummary, ledgerEvents, storeStatus }, "post-ack APIs");

  console.log(JSON.stringify({
    ok: true,
    base,
    action_record_id: recordId,
    service_action_status: acked.record.status,
    outbox_counts: allOutbox.counts,
    ledger_service_actions: ledgerSummary.by_type.service_action,
    store_service_action_records: storeStatus.service_action_records
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
