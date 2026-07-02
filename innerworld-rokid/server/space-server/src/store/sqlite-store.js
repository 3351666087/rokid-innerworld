import initSqlJs from "sql.js";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const STORE_SCHEMA = "innerworld-sqlite-store/v1";
const CURRENT_STATE_KEY = "current";
const DATASET_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;
const RECORD_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,96}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const LEDGER_DATASET_ID = "runtime.mission_ledger";
const LEDGER_SCHEMA = "innerworld-mission-ledger/v1";
const LEDGER_MISSION_ID = "innerworld-campus-wall-mission";
const LEDGER_TYPES = new Set(["interaction", "service_action", "write_back"]);
const SENSITIVE_LEDGER_KEYS = new Set([
  "access_token",
  "address",
  "bssid",
  "gateway",
  "ip",
  "ip_address",
  "ipv4",
  "ipv6",
  "mac",
  "mac_address",
  "phone",
  "recipient",
  "serial",
  "serial_number",
  "ssid",
  "token"
]);

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringifyJson(value) {
  return JSON.stringify(value ?? null);
}

function trimText(value, maxLength = 160) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanId(value, pattern, fallback) {
  const candidate = String(value || "").trim();
  return pattern.test(candidate) ? candidate : fallback;
}

function clampLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(number)));
}

function cleanLedgerType(value) {
  const type = String(value || "").trim();
  return LEDGER_TYPES.has(type) ? type : "interaction";
}

function sanitizeLedgerValue(value, depth = 0) {
  if (depth > 5) return "[max_depth]";
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, 400);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => sanitizeLedgerValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const clean = {};
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = String(key).toLowerCase();
      if (SENSITIVE_LEDGER_KEYS.has(normalizedKey)) continue;
      if (normalizedKey.includes("token") || normalizedKey.includes("secret")) continue;
      clean[key] = sanitizeLedgerValue(nested, depth + 1);
    }
    return clean;
  }
  return String(value).slice(0, 160);
}

function summarizeRuntimeState(state) {
  return {
    active_user: state?.active_user || null,
    mission_state: state?.mission_state || null,
    current_step_index: Number.isFinite(Number(state?.current_step_index)) ? Number(state.current_step_index) : 0,
    completed_steps: Array.isArray(state?.completed_steps) ? state.completed_steps.slice(0, 20) : [],
    beacon_count: Array.isArray(state?.beacons) ? state.beacons.length : 0
  };
}

function ledgerEventFromRow(row) {
  return {
    event_id: row.event_id,
    type: row.type,
    space_id: row.space_id,
    user_id: row.user_id,
    anchor_id: row.anchor_id,
    step_id: row.step_id,
    action_id: row.action_id,
    beacon_id: row.beacon_id,
    payload: parseJson(row.payload_json, {}),
    result: parseJson(row.result_json, {}),
    state: parseJson(row.state_json, {}),
    created_at: row.created_at
  };
}

function rowsFromExec(result) {
  const table = result?.[0];
  if (!table) return [];
  return table.values.map((values) => {
    return Object.fromEntries(table.columns.map((column, index) => [column, values[index]]));
  });
}

async function readJsonFile(file) {
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function publicHardwareManifest(manifest) {
  const devices = Array.isArray(manifest?.applied_hardware) ? manifest.applied_hardware : [];
  return {
    status: manifest?.status || null,
    kit_interpretation: manifest?.kit_interpretation || null,
    borrow_deadline: manifest?.loan_terms_summary?.borrow_deadline || null,
    project_fit: manifest?.project_fit?.assessment || null,
    devices: devices.map((device) => ({
      product_name: device.product_name,
      model: device.model,
      quantity: device.quantity,
      role: device.role
    })),
    privacy: "Public hardware summary only; recipient, phone, address, serial, token, and source-image details are not stored in this dataset."
  };
}

function datasetSummaryFromRow(row) {
  return {
    dataset_id: row.dataset_id,
    title: row.title,
    kind: row.kind,
    schema_version: row.schema_version,
    privacy: row.privacy,
    source_ref: row.source_ref,
    record_count: Number(row.record_count || 0),
    updated_at: row.updated_at,
    metadata: parseJson(row.metadata_json, {})
  };
}

function sessionFromRow(row) {
  return parseJson(row?.session_json, null);
}

export async function createSqliteStore({
  databasePath,
  spacePath,
  hardwareManifestPath,
  aiSchemaPath,
  legacyStatePath
}) {
  await mkdir(path.dirname(databasePath), { recursive: true });
  const SQL = await initSqlJs();
  const db = existsSync(databasePath)
    ? new SQL.Database(readFileSync(databasePath))
    : new SQL.Database();

  function run(sql, params = []) {
    const statement = db.prepare(sql);
    try {
      statement.run(params);
    } finally {
      statement.free();
    }
  }

  function select(sql, params = []) {
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return rows;
    } finally {
      statement.free();
    }
  }

  function get(sql, params = []) {
    return select(sql, params)[0] || null;
  }

  function persist() {
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const tempPath = path.join(path.dirname(databasePath), `.${path.basename(databasePath)}.${process.pid}.${Date.now()}.tmp`);
    writeFileSync(tempPath, Buffer.from(db.export()));
    renameSync(tempPath, databasePath);
  }

  function writeTransaction(task) {
    run("BEGIN IMMEDIATE");
    try {
      const result = task();
      run("COMMIT");
      persist();
      return result;
    } catch (error) {
      try {
        run("ROLLBACK");
      } catch {
        // Ignore rollback failures caused by SQLite already closing the transaction.
      }
      throw error;
    }
  }

  function ensureSchema() {
    db.run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runtime_state (
        key TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS datasets (
        dataset_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        privacy TEXT NOT NULL,
        source_ref TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        record_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS dataset_records (
        dataset_id TEXT NOT NULL,
        record_id TEXT NOT NULL,
        record_json TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (dataset_id, record_id),
        FOREIGN KEY (dataset_id) REFERENCES datasets(dataset_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dataset_records_dataset ON dataset_records(dataset_id, updated_at);
      CREATE TABLE IF NOT EXISTS device_sessions (
        session_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        profile TEXT NOT NULL,
        client_version TEXT NOT NULL,
        session_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        heartbeat_count INTEGER NOT NULL DEFAULT 0,
        last_health_severity TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_device_sessions_last_seen ON device_sessions(last_seen_at);
      CREATE TABLE IF NOT EXISTS device_events (
        event_id TEXT PRIMARY KEY,
        session_id TEXT,
        device_id TEXT,
        event_type TEXT NOT NULL,
        event_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_device_events_session ON device_events(session_id, created_at);
      CREATE TABLE IF NOT EXISTS mission_ledger (
        event_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        space_id TEXT,
        user_id TEXT,
        anchor_id TEXT,
        step_id TEXT,
        action_id TEXT,
        beacon_id TEXT,
        payload_json TEXT NOT NULL,
        result_json TEXT NOT NULL,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mission_ledger_type_time ON mission_ledger(type, created_at);
      CREATE INDEX IF NOT EXISTS idx_mission_ledger_anchor_time ON mission_ledger(anchor_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_mission_ledger_action_time ON mission_ledger(action_id, created_at);
    `);
  }

  function upsertMeta(key, value) {
    run(`
      INSERT INTO meta (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `, [key, stringifyJson(value), nowIso()]);
  }

  function upsertDataset({ dataset_id, title, kind, schema_version, privacy, source_ref, metadata = {}, records = [] }) {
    const id = cleanId(dataset_id, DATASET_ID_PATTERN, null);
    if (!id) throw new Error("invalid_dataset_id");
    const createdAt = nowIso();
    run(`
      INSERT INTO datasets (
        dataset_id, title, kind, schema_version, privacy, source_ref, metadata_json, record_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dataset_id) DO UPDATE SET
        title = excluded.title,
        kind = excluded.kind,
        schema_version = excluded.schema_version,
        privacy = excluded.privacy,
        source_ref = excluded.source_ref,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `, [
      id,
      String(title || id),
      String(kind || "json"),
      String(schema_version || STORE_SCHEMA),
      String(privacy || "public_sanitized"),
      String(source_ref || "sqlite"),
      stringifyJson(metadata),
      records.length,
      createdAt,
      createdAt
    ]);

    for (const [index, record] of records.entries()) {
      const recordId = cleanId(record?.record_id, RECORD_ID_PATTERN, `${id}:${index + 1}`);
      run(`
        INSERT INTO dataset_records (dataset_id, record_id, record_json, tags_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(dataset_id, record_id) DO UPDATE SET
          record_json = excluded.record_json,
          tags_json = excluded.tags_json,
          updated_at = excluded.updated_at
      `, [
        id,
        recordId,
        stringifyJson(record?.value ?? record),
        stringifyJson(record?.tags || []),
        createdAt,
        createdAt
      ]);
    }

    const count = get("SELECT COUNT(*) AS count FROM dataset_records WHERE dataset_id = ?", [id])?.count || 0;
    run("UPDATE datasets SET record_count = ?, updated_at = ? WHERE dataset_id = ?", [count, nowIso(), id]);
  }

  function upsertLedgerDataset() {
    const createdAt = nowIso();
    const count = get("SELECT COUNT(*) AS count FROM mission_ledger")?.count || 0;
    run(`
      INSERT INTO datasets (
        dataset_id, title, kind, schema_version, privacy, source_ref, metadata_json, record_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dataset_id) DO UPDATE SET
        title = excluded.title,
        kind = excluded.kind,
        schema_version = excluded.schema_version,
        privacy = excluded.privacy,
        source_ref = excluded.source_ref,
        metadata_json = excluded.metadata_json,
        record_count = excluded.record_count,
        updated_at = excluded.updated_at
    `, [
      LEDGER_DATASET_ID,
      "Mission Ledger",
      "runtime_ledger",
      LEDGER_SCHEMA,
      "runtime_sanitized",
      "SQLite mission_ledger table",
      stringifyJson({
        event_types: Array.from(LEDGER_TYPES),
        raw_sql_api: false,
        purpose: "Audit service actions, interactions, and write-backs for field evidence."
      }),
      count,
      createdAt,
      createdAt
    ]);
  }

  async function seedPublicDatasets() {
    const [space, aiSchema, hardwareManifest] = await Promise.all([
      readJsonFile(spacePath),
      readJsonFile(aiSchemaPath),
      readJsonFile(hardwareManifestPath)
    ]);

    writeTransaction(() => {
      upsertMeta("schema", { schema: STORE_SCHEMA, initialized_at: nowIso(), engine: "SQLite/sql.js" });
      upsertDataset({
        dataset_id: "space.contract",
        title: "Space Contract",
        kind: "space_json",
        schema_version: space.version || "space-demo/v1",
        privacy: "public_sanitized",
        source_ref: "data/space_demo.json",
        metadata: {
          space_id: space.space_id,
          anchor_count: Array.isArray(space.anchors) ? space.anchors.length : 0,
          beacon_count: Array.isArray(space.beacons) ? space.beacons.length : 0
        },
        records: [
          { record_id: "space", value: space },
          ...(Array.isArray(space.anchors) ? space.anchors.map((anchor) => ({ record_id: `anchor:${anchor.anchor_id}`, value: anchor, tags: ["anchor"] })) : []),
          ...(Array.isArray(space.beacons) ? space.beacons.map((beacon) => ({ record_id: `beacon:${beacon.beacon_id}`, value: beacon, tags: ["beacon"] })) : [])
        ]
      });
      upsertDataset({
        dataset_id: "ai.hud_schema",
        title: "AI HUD Schema",
        kind: "json_schema",
        schema_version: aiSchema?.$schema || "json-schema",
        privacy: "public_sanitized",
        source_ref: "ai/schema.json",
        metadata: {
          title: aiSchema.title,
          display_text_max_length: aiSchema.properties?.display_text?.maxLength || null
        },
        records: [{ record_id: "schema", value: aiSchema }]
      });
      upsertDataset({
        dataset_id: "hardware.applied_kit",
        title: "Applied Rokid Hardware",
        kind: "hardware_manifest_public",
        schema_version: "hardware-public/v1",
        privacy: "public_sanitized",
        source_ref: "data/hardware_manifest.json public fields",
        metadata: {
          borrow_deadline: hardwareManifest?.loan_terms_summary?.borrow_deadline || null,
          fit: hardwareManifest?.project_fit?.assessment || null
        },
        records: [{ record_id: "kit", value: publicHardwareManifest(hardwareManifest), tags: ["hardware", "public"] }]
      });
      upsertLedgerDataset();
    });
  }

  function loadRuntimeState() {
    const row = get("SELECT state_json FROM runtime_state WHERE key = ?", [CURRENT_STATE_KEY]);
    return parseJson(row?.state_json, null);
  }

  function saveRuntimeState(state) {
    return writeTransaction(() => {
      run(`
        INSERT INTO runtime_state (key, state_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = excluded.updated_at
      `, [CURRENT_STATE_KEY, stringifyJson(state), nowIso()]);
      return state;
    });
  }

  async function migrateLegacyStateIfNeeded() {
    if (loadRuntimeState() || !legacyStatePath || !existsSync(legacyStatePath)) return;
    const legacyState = await readJsonFile(legacyStatePath);
    saveRuntimeState(legacyState);
  }

  function saveDeviceSession(session) {
    if (!session?.session_id) return session;
    return writeTransaction(() => {
      run(`
        INSERT INTO device_sessions (
          session_id, device_id, profile, client_version, session_json, created_at, last_seen_at,
          heartbeat_count, last_health_severity, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          device_id = excluded.device_id,
          profile = excluded.profile,
          client_version = excluded.client_version,
          session_json = excluded.session_json,
          last_seen_at = excluded.last_seen_at,
          heartbeat_count = excluded.heartbeat_count,
          last_health_severity = excluded.last_health_severity,
          updated_at = excluded.updated_at
      `, [
        session.session_id,
        session.device_id,
        session.profile,
        session.client_version,
        stringifyJson(session),
        session.created_at || nowIso(),
        session.last_seen_at || nowIso(),
        Number(session.heartbeat_count || 0),
        session.last_health_severity || "unknown",
        nowIso()
      ]);
      return session;
    });
  }

  function loadDeviceSession(sessionId) {
    const id = String(sessionId || "").trim();
    if (!id) return null;
    return sessionFromRow(get("SELECT session_json FROM device_sessions WHERE session_id = ?", [id]));
  }

  function listDeviceSessions({ limit = 25 } = {}) {
    return select(`
      SELECT session_json
      FROM device_sessions
      ORDER BY datetime(last_seen_at) DESC
      LIMIT ?
    `, [clampLimit(limit)]).map(sessionFromRow).filter(Boolean);
  }

  function appendDeviceEvent({ session_id = null, device_id = null, event_type, event }) {
    const eventId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    writeTransaction(() => {
      run(`
        INSERT INTO device_events (event_id, session_id, device_id, event_type, event_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        eventId,
        session_id || null,
        device_id || null,
        String(event_type || "device_event"),
        stringifyJson(event || {}),
        nowIso()
      ]);
      run(`
        DELETE FROM device_events
        WHERE event_id NOT IN (
          SELECT event_id FROM device_events ORDER BY datetime(created_at) DESC LIMIT 500
        )
      `);
    });
    return eventId;
  }

  function deviceEventSummary({ limit = 50 } = {}) {
    return select(`
      SELECT event_id, session_id, device_id, event_type, event_json, created_at
      FROM device_events
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `, [clampLimit(limit)]).map((row) => ({
      event_id: row.event_id,
      session_id: row.session_id,
      device_id: row.device_id,
      event_type: row.event_type,
      created_at: row.created_at,
      event: parseJson(row.event_json, {})
    }));
  }

  function appendMissionLedgerEvent({ type, space, payload = {}, result = {}, state = {}, createdAt = null }) {
    const eventType = cleanLedgerType(type);
    const sanitizedPayload = sanitizeLedgerValue(payload) || {};
    const sanitizedResult = sanitizeLedgerValue(result) || {};
    const stateSummary = summarizeRuntimeState(state);
    const timestamp = createdAt || result?.created_at || payload?.created_at || nowIso();
    const eventId = `ledger-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const anchorId = trimText(payload.anchor_id || result.anchor_id, 40) || null;
    const stepId = trimText(payload.step_id || result.step_id, 48) || null;
    const actionId = trimText(payload.action_id || result.action_id, 64) || null;
    const beaconId = trimText(result.beacon_id || payload.beacon_id, 80) || null;
    const userId = trimText(payload.user_id || result.source || state?.active_user, 40) || null;
    const spaceId = trimText(space?.space_id || payload.space_id, 80) || null;

    return writeTransaction(() => {
      run(`
        INSERT INTO mission_ledger (
          event_id, type, space_id, user_id, anchor_id, step_id, action_id, beacon_id,
          payload_json, result_json, state_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        eventId,
        eventType,
        spaceId,
        userId,
        anchorId,
        stepId,
        actionId,
        beaconId,
        stringifyJson(sanitizedPayload),
        stringifyJson(sanitizedResult),
        stringifyJson(stateSummary),
        timestamp
      ]);
      upsertLedgerDataset();
      return {
        event_id: eventId,
        type: eventType,
        space_id: spaceId,
        user_id: userId,
        anchor_id: anchorId,
        step_id: stepId,
        action_id: actionId,
        beacon_id: beaconId,
        payload: sanitizedPayload,
        result: sanitizedResult,
        state: stateSummary,
        created_at: timestamp
      };
    });
  }

  function missionLedgerEvents({ limit = 50, type = "" } = {}) {
    const cleanType = String(type || "").trim();
    const params = [];
    let where = "";
    if (cleanType) {
      if (!LEDGER_TYPES.has(cleanType)) {
        return { ok: false, status: 400, error: "invalid_ledger_type" };
      }
      where = "WHERE type = ?";
      params.push(cleanType);
    }
    params.push(clampLimit(limit));
    const events = select(`
      SELECT event_id, type, space_id, user_id, anchor_id, step_id, action_id, beacon_id,
        payload_json, result_json, state_json, created_at
      FROM mission_ledger
      ${where}
      ORDER BY datetime(created_at) DESC, event_id DESC
      LIMIT ?
    `, params).map(ledgerEventFromRow);

    return {
      ok: true,
      schema: `${LEDGER_SCHEMA}/events`,
      total_returned: events.length,
      type: cleanType || "all",
      events,
      privacy: "Ledger events are sanitized summaries. Raw private identifiers, tokens, network addresses, serials, SSID, MAC, and raw pose are omitted."
    };
  }

  function missionLedgerSummary() {
    const generatedAt = nowIso();
    const total = Number(get("SELECT COUNT(*) AS count FROM mission_ledger")?.count || 0);
    const byType = Object.fromEntries(select(`
      SELECT type, COUNT(*) AS count
      FROM mission_ledger
      GROUP BY type
      ORDER BY type
    `).map((row) => [row.type, Number(row.count || 0)]));
    const latest = select(`
      SELECT event_id, type, space_id, user_id, anchor_id, step_id, action_id, beacon_id,
        payload_json, result_json, state_json, created_at
      FROM mission_ledger
      ORDER BY datetime(created_at) DESC, event_id DESC
      LIMIT 5
    `).map(ledgerEventFromRow);
    const latestEvent = latest[0] || null;
    const runtime = loadRuntimeState() || {};
    const stateSummary = summarizeRuntimeState(runtime);
    const serviceActionTotal = byType.service_action || 0;

    return {
      ok: true,
      schema: `${LEDGER_SCHEMA}/summary`,
      generated_at: generatedAt,
      engine: "sqlite",
      dataset_id: LEDGER_DATASET_ID,
      mission_id: LEDGER_MISSION_ID,
      total,
      counts: {
        interactions: byType.interaction || 0,
        service_actions: serviceActionTotal,
        write_backs: byType.write_back || 0
      },
      by_type: {
        interaction: byType.interaction || 0,
        service_action: serviceActionTotal,
        write_back: byType.write_back || 0
      },
      mission: {
        state: stateSummary.mission_state,
        current_step_index: stateSummary.current_step_index,
        completed_step_count: stateSummary.completed_steps.length,
        completed_steps: stateSummary.completed_steps,
        last_event_at: latestEvent?.created_at || null
      },
      service_actions: {
        total: serviceActionTotal,
        pending: 0,
        completed: serviceActionTotal,
        failed: 0,
        last_action_id: latest.find((event) => event.type === "service_action")?.action_id || null,
        last_action_at: latest.find((event) => event.type === "service_action")?.created_at || null
      },
      audit: {
        event_count: total,
        first_event_at: get("SELECT created_at FROM mission_ledger ORDER BY datetime(created_at) ASC, event_id ASC LIMIT 1")?.created_at || null,
        last_event_at: latestEvent?.created_at || null,
        sources: Array.from(new Set(latest.map((event) => event.user_id || "system"))).filter(Boolean)
      },
      latest,
      latest_event: latestEvent,
      checks: {
        has_service_action: serviceActionTotal > 0,
        has_write_back: (byType.write_back || 0) > 0,
        has_interaction: (byType.interaction || 0) > 0
      },
      privacy: "Mission ledger is safe for local field evidence and release summaries; it does not expose raw private chat exports or device/network identifiers."
    };
  }

  function catalog() {
    const datasets = select(`
      SELECT dataset_id, title, kind, schema_version, privacy, source_ref, metadata_json, record_count, updated_at
      FROM datasets
      ORDER BY dataset_id
    `).map(datasetSummaryFromRow);
    return {
      ok: true,
      schema: "innerworld-dataset-catalog/v1",
      engine: "sqlite",
      database: {
        path_hint: "data/innerworld.sqlite",
        committed_to_git: false
      },
      datasets,
      privacy: "Catalog exposes sanitized dataset summaries only. Raw chat exports, private images, addresses, phone numbers, serials, tokens, and network identifiers remain out of this database/API."
    };
  }

  function datasetCall(body = {}) {
    const datasetId = cleanId(body.dataset_id, DATASET_ID_PATTERN, null);
    if (!datasetId) {
      return { ok: false, status: 400, error: "invalid_dataset_id" };
    }

    const dataset = get(`
      SELECT dataset_id, title, kind, schema_version, privacy, source_ref, metadata_json, record_count, updated_at
      FROM datasets
      WHERE dataset_id = ?
    `, [datasetId]);
    if (!dataset) {
      return { ok: false, status: 404, error: "dataset_not_found" };
    }

    const operation = String(body.operation || "snapshot");
    const limit = clampLimit(body.limit);
    if (operation === "summary") {
      return {
        ok: true,
        operation,
        dataset: datasetSummaryFromRow(dataset)
      };
    }

    if (datasetId === LEDGER_DATASET_ID) {
      if (["snapshot", "list_records"].includes(operation)) {
        const ledger = missionLedgerEvents({ limit, type: body.type || "" });
        if (ledger.ok === false) return ledger;
        return {
          ok: true,
          operation,
          dataset: datasetSummaryFromRow(dataset),
          records: ledger.events.map((event) => ({
            record_id: event.event_id,
            value: event,
            tags: [event.type].filter(Boolean),
            updated_at: event.created_at
          })),
          truncated: Number(dataset.record_count || 0) > ledger.events.length
        };
      }
      if (operation === "get_record") {
        const recordId = cleanId(body.record_id, RECORD_ID_PATTERN, null);
        if (!recordId) return { ok: false, status: 400, error: "invalid_record_id" };
        const row = get(`
          SELECT event_id, type, space_id, user_id, anchor_id, step_id, action_id, beacon_id,
            payload_json, result_json, state_json, created_at
          FROM mission_ledger
          WHERE event_id = ?
        `, [recordId]);
        if (!row) return { ok: false, status: 404, error: "record_not_found" };
        const event = ledgerEventFromRow(row);
        return {
          ok: true,
          operation,
          dataset: datasetSummaryFromRow(dataset),
          record: {
            record_id: event.event_id,
            value: event,
            tags: [event.type],
            updated_at: event.created_at
          }
        };
      }
    }

    if (operation === "get_record") {
      const recordId = cleanId(body.record_id, RECORD_ID_PATTERN, null);
      if (!recordId) return { ok: false, status: 400, error: "invalid_record_id" };
      const record = get(`
        SELECT record_id, record_json, tags_json, created_at, updated_at
        FROM dataset_records
        WHERE dataset_id = ? AND record_id = ?
      `, [datasetId, recordId]);
      if (!record) return { ok: false, status: 404, error: "record_not_found" };
      return {
        ok: true,
        operation,
        dataset: datasetSummaryFromRow(dataset),
        record: {
          record_id: record.record_id,
          value: parseJson(record.record_json, null),
          tags: parseJson(record.tags_json, []),
          updated_at: record.updated_at
        }
      };
    }

    if (!["snapshot", "list_records"].includes(operation)) {
      return { ok: false, status: 400, error: "unsupported_dataset_operation" };
    }

    const rows = select(`
      SELECT record_id, record_json, tags_json, created_at, updated_at
      FROM dataset_records
      WHERE dataset_id = ?
      ORDER BY record_id
      LIMIT ?
    `, [datasetId, limit]).map((row) => ({
      record_id: row.record_id,
      value: parseJson(row.record_json, null),
      tags: parseJson(row.tags_json, []),
      updated_at: row.updated_at
    }));

    return {
      ok: true,
      operation,
      dataset: datasetSummaryFromRow(dataset),
      records: rows,
      truncated: Number(dataset.record_count || 0) > rows.length
    };
  }

  function status() {
    const runtime = loadRuntimeState();
    const deviceTotal = get("SELECT COUNT(*) AS count FROM device_sessions")?.count || 0;
    const eventTotal = get("SELECT COUNT(*) AS count FROM device_events")?.count || 0;
    const ledgerTotal = get("SELECT COUNT(*) AS count FROM mission_ledger")?.count || 0;
    return {
      ok: true,
      schema: STORE_SCHEMA,
      engine: "sqlite",
      path_hint: "data/innerworld.sqlite",
      runtime_state: runtime
        ? {
            mission_state: runtime.mission_state,
            active_user: runtime.active_user,
            beacons: Array.isArray(runtime.beacons) ? runtime.beacons.length : 0,
            completed_steps: Array.isArray(runtime.completed_steps) ? runtime.completed_steps.length : 0
          }
        : null,
      datasets: get("SELECT COUNT(*) AS count FROM datasets")?.count || 0,
      device_sessions: deviceTotal,
      device_events: eventTotal,
      mission_ledger_events: ledgerTotal,
      safe_storage: {
        atomic_export: true,
        raw_sql_api: false,
        git_ignored: true,
        private_fields_policy: "Do not store or expose recipient, phone, address, serial, token, SSID, MAC, IP, or raw pose."
      }
    };
  }

  ensureSchema();
  await seedPublicDatasets();
  await migrateLegacyStateIfNeeded();
  persist();

  return {
    catalog,
    datasetCall,
    deviceEventSummary,
    missionLedgerEvents,
    missionLedgerSummary,
    loadDeviceSession,
    listDeviceSessions,
    loadRuntimeState,
    saveDeviceSession,
    saveRuntimeState,
    appendDeviceEvent,
    appendMissionLedgerEvent,
    status
  };
}
