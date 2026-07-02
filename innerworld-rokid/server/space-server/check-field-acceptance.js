import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFieldAcceptance } from "./src/domain/field-acceptance.js";
import { buildFieldMarkerManifest } from "./src/domain/field-markers.js";
import { buildWallCalibrationManifest, createWallCalibrationObservation } from "./src/domain/wall-calibration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const base = process.env.BASE_URL || "http://localhost:5177";
const useApi = process.argv.includes("--api") || process.env.CHECK_FIELD_ACCEPTANCE_API === "1";
const FIELD_ACCEPTANCE_SCHEMA = "innerworld-field-acceptance/v1";
const FIELD_ACCEPTANCE_ENDPOINT = "/api/field/acceptance";
const requiredGateIds = ["print_kit", "simulator_rehearsal", "hardware_alignment", "trusted_hardware_session"];
const hardwareTrackingModes = ["qr", "image_tracking", "slam"];
const trustedHardwareGatePatterns = [
  /trusted.*hardware.*session/i,
  /sdk.*live.*binding/i
];
const trustedHardwareEvidencePatterns = [
  /trusted.*hardware.*session/i,
  /sdk.*live.*binding/i,
  /live.*sdk.*session/i,
  /live.*binding.*ready/i,
  /live.*bound.*session/i
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function readJson(relativePath) {
  const raw = await readText(relativePath);
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function byId(items) {
  return new Map((Array.isArray(items) ? items : []).map((item) => [item.id, item]));
}

function assertEndpoint(endpoint, label) {
  assert(endpoint, `${label} endpoint missing`);
  assert(endpoint.method === "GET", `${label} endpoint method must be GET`);
  assert(endpoint.path === FIELD_ACCEPTANCE_ENDPOINT, `${label} endpoint path mismatch`);
}

function assertGate(gate, id) {
  assert(gate, `${id} gate missing`);
  assert(gate.id === id, `${id} gate id mismatch`);
  assert(typeof (gate.label || gate.title) === "string" && (gate.label || gate.title).length > 0, `${id} gate label/title missing`);
  assert(["pending", "ready", "blocked", "failed", "pass", "warn", "warning"].includes(gate.status), `${id} gate status unsupported`);
  assert(gate.evidence && typeof gate.evidence === "object" && !Array.isArray(gate.evidence), `${id} structured gate evidence missing`);
}

function isTrustedHardwareGateId(id) {
  const value = String(id || "");
  return trustedHardwareGatePatterns.some((pattern) => pattern.test(value));
}

function keyMatchesTrustedHardwareEvidence(key) {
  const normalized = String(key || "").replace(/[-\s]+/g, "_");
  return trustedHardwareEvidencePatterns.some((pattern) => pattern.test(normalized));
}

function hasTrustedHardwareEvidence(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    if (keyMatchesTrustedHardwareEvidence(key)) return true;
    if (hasTrustedHardwareEvidence(nested, seen)) return true;
  }
  return false;
}

function hasPositiveTrustedHardwareEvidence(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    if (keyMatchesTrustedHardwareEvidence(key)) {
      if (nested === true) return true;
      if (typeof nested === "string" && nested.trim().length > 0) return true;
      if (Array.isArray(nested) && nested.length > 0) return true;
      if (nested && typeof nested === "object" && hasPositiveTrustedHardwareEvidence(nested, seen)) return true;
    }
    if (hasPositiveTrustedHardwareEvidence(nested, seen)) return true;
  }
  return false;
}

function assertTrustedHardwareGateOrEvidence(payload, gates) {
  const gateList = Array.isArray(payload.gates) ? payload.gates : [];
  const trustedGate = gateList.find((gate) => isTrustedHardwareGateId(gate?.id));
  const hardwareGate = gates.get("hardware_alignment");
  const evidenceCandidates = [
    trustedGate,
    trustedGate?.evidence,
    hardwareGate?.evidence,
    payload.summary,
    payload.debug
  ];
  assert(
    trustedGate || evidenceCandidates.some((candidate) => hasTrustedHardwareEvidence(candidate)),
    "field acceptance trusted_hardware_session/sdk_live_binding gate or evidence missing"
  );
  if (trustedGate) {
    assertGate(trustedGate, trustedGate.id);
  }
  assert(
    hardwareGate?.status !== "ready" || evidenceCandidates.some((candidate) => hasPositiveTrustedHardwareEvidence(candidate)),
    "hardware_alignment ready requires trusted hardware session/live SDK binding evidence"
  );
}

function assertAcceptancePayload(payload) {
  assert(payload.ok === true, "field acceptance ok mismatch");
  assert(payload.schema === FIELD_ACCEPTANCE_SCHEMA, "field acceptance schema mismatch");
  assertEndpoint(payload.endpoint, "field acceptance");
  assert(Array.isArray(payload.gates), "field acceptance gates missing");
  assert(payload.status, "field acceptance overall status missing");
  assert(Array.isArray(payload.blocking_items), "field acceptance blocking items missing");

  const gates = byId(payload.gates);
  for (const gateId of requiredGateIds) assertGate(gates.get(gateId), gateId);
  for (const gateId of ["mission_loop", "sqlite_evidence", "release_chain", "hardware_kit"]) assertGate(gates.get(gateId), gateId);

  const printKit = gates.get("print_kit");
  const simulator = gates.get("simulator_rehearsal");
  const hardware = gates.get("hardware_alignment");
  const trusted = gates.get("trusted_hardware_session");
  assertTrustedHardwareGateOrEvidence(payload, gates);
  assert(printKit !== simulator && simulator !== hardware && printKit !== hardware, "acceptance gates must be separate objects");
  assert(trusted !== hardware && trusted !== simulator && trusted !== printKit, "trusted hardware session gate must be separate");
  assert(printKit.source !== simulator.source, "print kit and simulator rehearsal must have separate sources");
  assert(simulator.source !== hardware.source, "simulator rehearsal and hardware alignment must have separate sources");
  assert(hardware.source !== trusted.source, "hardware alignment and trusted session must have separate sources");
  assert(Array.isArray(hardware.required_tracking_modes), "hardware alignment tracking modes missing");
  for (const mode of hardwareTrackingModes) {
    assert(hardware.required_tracking_modes.includes(mode), `hardware alignment tracking mode missing: ${mode}`);
  }
  assert(hardware.required_tracking_modes.includes("simulator") === false, "hardware alignment must not accept simulator as hardware tracking");
  assert(payload.summary?.all_simulator_ready_for_hardware === false, "all-simulator must not make hardware ready");
  assert(payload.summary?.ready_for_hardware === false || payload.summary?.trusted_hardware_evidence_count >= 3, "hardware ready requires trusted hardware evidence");
  assert(payload.summary?.ready_for_hardware === false || payload.summary?.trusted_hardware_session_count > 0, "hardware ready requires trusted live SDK session");
  assert(payload.summary?.trusted_hardware_ready === payload.summary?.ready_for_hardware, "trusted hardware readiness must drive top-level hardware readiness");
  assert(payload.summary?.sdk_live_binding_required === true, "SDK live binding must be required for hardware readiness");
  assert(payload.summary?.simulator_rehearsal_is_not_hardware_ready === true, "simulator rehearsal hardware separation missing");
  assert(hardware.evidence?.hardware_alignment_ready === (hardware.status === "ready"), "hardware alignment gate evidence mismatch");
  assert(trusted.evidence?.ready_for_hardware === payload.summary.ready_for_hardware, "trusted hardware summary and gate evidence mismatch");
  assert(trusted.evidence?.sdk_live_binding_required === true, "trusted hardware gate must require SDK live binding");
  assert(Array.isArray(trusted.evidence?.trusted_hardware_sessions), "trusted hardware sessions evidence missing");
  assert(Array.isArray(trusted.evidence?.untrusted_hardware_anchor_ids), "untrusted hardware anchors evidence missing");
  assert(hardware.evidence?.hardware_tracking_modes?.includes("simulator") === false, "hardware evidence modes must exclude simulator");
  assert(trusted.evidence?.hardware_tracking_modes?.includes("simulator") === false, "trusted hardware evidence modes must exclude simulator");
  assert(Array.isArray(payload.hardware_modes_required), "top-level hardware modes missing");
  for (const mode of hardwareTrackingModes) {
    assert(payload.hardware_modes_required.includes(mode), `top-level hardware mode missing: ${mode}`);
  }
}

function buildExpectedPayload({ space, fieldMarkers, wallCalibration }) {
  const fieldMarkerManifest = buildFieldMarkerManifest({
    baseUrl: base,
    space,
    markerConfig: fieldMarkers,
    wallCalibration,
    generatedAt: "2026-07-02T00:03:00.000Z"
  });
  return buildFieldAcceptance({
    baseUrl: base,
    space,
    state: {
      active_user: "A",
      mission_state: "entered",
      current_step_index: 0,
      completed_steps: [],
      beacons: space.beacons,
      events: []
    },
    wallCalibration,
    fieldMarkers: fieldMarkerManifest,
    ledgerSummary: {
      engine: "sqlite",
      checks: {
        has_interaction: false,
        has_service_action: false,
        has_write_back: false
      },
      audit: {
        event_count: 0
      }
    },
    opsStatus: {
      hardware: {
        fit: "fit",
        devices: [
          { model: "RA202" },
          { model: "RAS201" }
        ],
        borrow_deadline: "2026-08-31"
      },
      release_index: {
        ok: false
      },
      deploy_dry_run: {
        ok: false
      }
    },
    generatedAt: "2026-07-02T00:04:00.000Z"
  });
}

function assertAllSimulatorDoesNotMakeHardwareReady(space) {
  const state = {
    active_user: "A",
    mission_state: "entered",
    current_step_index: 0,
    completed_steps: [],
    beacons: space.beacons,
    events: []
  };
  const baseManifest = buildWallCalibrationManifest({
    baseUrl: base,
    space,
    state,
    generatedAt: "2026-07-02T00:00:00.000Z"
  });
  const accepted = baseManifest.anchors.map((anchor) => createWallCalibrationObservation({
    body: {
      anchor_id: anchor.anchor_id,
      tracking_mode: "simulator",
      confidence: Math.max(0.95, anchor.acceptance.confidence_min),
      observed_pose: anchor.expected_pose,
      session_id: "all-simulator-acceptance-check"
    },
    space,
    receivedAt: "2026-07-02T00:01:00.000Z"
  })).filter((observation) => observation.status === "accepted");

  const summary = {
    ok: true,
    total: accepted.length,
    accepted: accepted.length,
    warning: 0,
    rejected: 0,
    calibrated_anchor_count: accepted.length,
    calibrated_anchor_ids: accepted.map((item) => item.anchor_id),
    rehearsal_ready: accepted.length >= 3,
    hardware_calibrated_anchor_count: accepted.filter((item) => hardwareTrackingModes.includes(item.tracking_mode)).length,
    hardware_calibrated_anchor_ids: accepted.filter((item) => hardwareTrackingModes.includes(item.tracking_mode)).map((item) => item.anchor_id),
    hardware_tracking_modes: hardwareTrackingModes,
    trusted_hardware_calibrated_anchor_count: 0,
    trusted_hardware_calibrated_anchor_ids: [],
    trusted_hardware_session_count: 0,
    trusted_hardware_sessions: [],
    untrusted_hardware_anchor_ids: [],
    sdk_live_binding_required: true,
    ready_for_hardware: false
  };
  const simulatorOnlyManifest = buildWallCalibrationManifest({
    baseUrl: base,
    space,
    state,
    summary,
    generatedAt: "2026-07-02T00:02:00.000Z"
  });

  assert(simulatorOnlyManifest.runtime.summary.rehearsal_ready === true, "all-simulator observations should prove rehearsal readiness");
  assert(simulatorOnlyManifest.runtime.summary.hardware_calibrated_anchor_count === 0, "all-simulator observations must not count as hardware calibrated");
  assert(simulatorOnlyManifest.runtime.summary.ready_for_hardware === false, "all-simulator observations must not make hardware ready");
  return simulatorOnlyManifest;
}

function completeRuntimeState(space) {
  return {
    active_user: "B",
    mission_state: "complete",
    current_step_index: 4,
    completed_steps: ["read", "find_year", "service_action", "write_back"],
    beacons: [
      ...(Array.isArray(space.beacons) ? space.beacons : []),
      {
        beacon_id: "check-time-capsule",
        anchor_id: "A3",
        layer: "time_capsule"
      }
    ],
    events: []
  };
}

function hardwareReadyWallCalibration(space) {
  const state = completeRuntimeState(space);
  const anchorIds = ["A1", "A2", "A3"];
  return buildWallCalibrationManifest({
    baseUrl: base,
    space,
    state,
    summary: {
      ok: true,
      total: 3,
      accepted: 3,
      warning: 0,
      rejected: 0,
      calibrated_anchor_count: 3,
      calibrated_anchor_ids: anchorIds,
      rehearsal_ready: true,
      hardware_calibrated_anchor_count: 3,
      hardware_calibrated_anchor_ids: anchorIds,
      hardware_tracking_modes: hardwareTrackingModes,
      trusted_hardware_calibrated_anchor_count: 3,
      trusted_hardware_calibrated_anchor_ids: anchorIds,
      trusted_hardware_session_count: 1,
      trusted_hardware_sessions: [
        {
          session_id: "trusted-live-session-check",
          device_id: "RA202-trusted-check",
          profile: "rokid-ar",
          session_status: "online",
          sdk_binding_stage: "live_binding_ready",
          live_binding_ready: true,
          last_seen_at: "2026-07-02T00:05:01.000Z",
          heartbeat_count: 2
        }
      ],
      untrusted_hardware_anchor_ids: [],
      sdk_live_binding_required: true,
      ready_for_hardware: true
    },
    generatedAt: "2026-07-02T00:05:00.000Z"
  });
}

function trackingModeOnlyHardwareWallCalibration(space) {
  const state = completeRuntimeState(space);
  const anchorIds = ["A1", "A2", "A3"];
  const latest = Object.fromEntries(anchorIds.map((anchorId, index) => [anchorId, {
    schema: "innerworld-wall-calibration-observation/v1",
    observation_id: `tracking-only-${anchorId.toLowerCase()}`,
    status: "accepted",
    issues: [],
    space_id: space.space_id,
    anchor_id: anchorId,
    tracking_mode: hardwareTrackingModes[index],
    session_id: "script-posted-tracking-mode-only",
    device_id: "tracking-mode-script",
    confidence: 0.98,
    position_error_m: 0,
    created_at: "2026-07-02T00:10:00.000Z"
  }]));
  return buildWallCalibrationManifest({
    baseUrl: base,
    space,
    state,
    summary: {
      ok: true,
      total: 3,
      accepted: 3,
      warning: 0,
      rejected: 0,
      calibrated_anchor_count: 3,
      calibrated_anchor_ids: anchorIds,
      rehearsal_ready: true,
      hardware_calibrated_anchor_count: 3,
      hardware_calibrated_anchor_ids: anchorIds,
      hardware_tracking_modes: hardwareTrackingModes,
      trusted_hardware_calibrated_anchor_count: 0,
      trusted_hardware_calibrated_anchor_ids: [],
      trusted_hardware_session_count: 0,
      trusted_hardware_sessions: [],
      untrusted_hardware_anchor_ids: anchorIds,
      sdk_live_binding_required: true,
      ready_for_hardware: true,
      latest_anchor_observations: Object.values(latest),
      latest_by_anchor: latest,
      trusted_hardware_session: false,
      sdk_live_binding_ready: false,
      live_bound_session_ids: []
    },
    generatedAt: "2026-07-02T00:10:00.000Z"
  });
}

function readyOpsStatus() {
  return {
    hardware: {
      fit: "fit",
      devices: [
        { model: "RA202" },
        { model: "RAS201" }
      ],
      borrow_deadline: "2026-08-31"
    },
    release_index: {
      ok: true,
      generated_at: "2026-07-02T00:06:00.000Z"
    },
    deploy_dry_run: {
      ok: true,
      generated_at: "2026-07-02T00:07:00.000Z"
    }
  };
}

function readyLedgerSummary() {
  return {
    engine: "sqlite",
    checks: {
      has_interaction: true,
      has_service_action: true,
      has_write_back: true
    },
    audit: {
      event_count: 3
    }
  };
}

function assertHardwareTrackingRequiresLiveSdkSession(space, fieldMarkers) {
  const state = completeRuntimeState(space);
  const wallCalibration = trackingModeOnlyHardwareWallCalibration(space);
  const validFieldMarkers = buildFieldMarkerManifest({
    baseUrl: base,
    space,
    markerConfig: fieldMarkers,
    wallCalibration,
    generatedAt: "2026-07-02T00:11:00.000Z"
  });
  const payload = buildFieldAcceptance({
    baseUrl: base,
    space,
    state,
    wallCalibration,
    fieldMarkers: validFieldMarkers,
    ledgerSummary: readyLedgerSummary(),
    opsStatus: readyOpsStatus(),
    generatedAt: "2026-07-02T00:12:00.000Z"
  });
  const trustedBlocker = payload.blocking_items.some((item) => isTrustedHardwareGateId(item.gate_id));
  assert(
    payload.status !== "hardware_acceptance_ready",
    "tracking-mode-only hardware observations must not set hardware_acceptance_ready without trusted hardware session/live SDK binding"
  );
  assert(payload.ready === false, "tracking-mode-only hardware observations must not set field acceptance ready");
  assert(trustedBlocker, "missing trusted hardware session/sdk live binding blocker");
}

function assertHardwareReadyRequiresAllRequiredGates(space, fieldMarkers) {
  const state = completeRuntimeState(space);
  const wallCalibration = hardwareReadyWallCalibration(space);
  const validFieldMarkers = buildFieldMarkerManifest({
    baseUrl: base,
    space,
    markerConfig: fieldMarkers,
    wallCalibration,
    generatedAt: "2026-07-02T00:08:00.000Z"
  });
  const common = {
    baseUrl: base,
    space,
    state,
    wallCalibration,
    opsStatus: readyOpsStatus(),
    generatedAt: "2026-07-02T00:09:00.000Z"
  };

  const missingLedger = buildFieldAcceptance({
    ...common,
    fieldMarkers: validFieldMarkers,
    ledgerSummary: {
      engine: "sqlite",
      checks: {
        has_interaction: true,
        has_service_action: false,
        has_write_back: true
      },
      audit: {
        event_count: 2
      }
    }
  });
  assert(missingLedger.status !== "hardware_acceptance_ready", "hardware acceptance must require sqlite evidence");
  assert(missingLedger.ready === false, "missing sqlite evidence must not set ready");
  assert(missingLedger.blocking_items.some((item) => item.gate_id === "sqlite_evidence"), "missing sqlite evidence blocker missing");

  const missingPrintKit = buildFieldAcceptance({
    ...common,
    fieldMarkers: {
      ok: true,
      schema: "innerworld-field-markers/v1",
      markers: [],
      acceptance: {}
    },
    ledgerSummary: readyLedgerSummary()
  });
  assert(missingPrintKit.status !== "hardware_acceptance_ready", "hardware acceptance must require print kit");
  assert(missingPrintKit.ready === false, "missing print kit must not set ready");
  assert(missingPrintKit.blocking_items.some((item) => item.gate_id === "print_kit"), "missing print kit blocker missing");

  const fullyReady = buildFieldAcceptance({
    ...common,
    fieldMarkers: validFieldMarkers,
    ledgerSummary: readyLedgerSummary()
  });
  assert(fullyReady.status === "hardware_acceptance_ready", "trusted live hardware evidence should allow final hardware acceptance");
  assert(fullyReady.ready === true, "trusted live hardware evidence should set ready");
  assert(fullyReady.summary?.trusted_hardware_evidence_count === 3, "trusted hardware evidence count mismatch");
  assert(fullyReady.summary?.trusted_hardware_session_count === 1, "trusted hardware session count mismatch");
}

async function fetchAcceptancePayload() {
  const res = await fetch(`${base}${FIELD_ACCEPTANCE_ENDPOINT}`);
  const contentType = res.headers.get("content-type") || "";
  assert(res.ok, `${FIELD_ACCEPTANCE_ENDPOINT} status check failed`);
  assert(contentType.includes("application/json"), `${FIELD_ACCEPTANCE_ENDPOINT} content-type check failed`);
  return res.json();
}

async function assertCheckIsExposed() {
  const packageJson = JSON.parse(await readText("package.json"));
  const script = packageJson.scripts?.["check:field-acceptance"] || "";
  assert(script === "node server/space-server/check-field-acceptance.js", "package script check:field-acceptance missing");

  const [mainline, contract, webDemo, fieldAcceptanceCheck] = await Promise.all([
    readText("server/space-server/check-mainline.js"),
    readText("server/space-server/check-contract.js"),
    readText("server/space-server/check-web-demo.js"),
    readText("server/space-server/check-field-acceptance.js")
  ]);
  const checks = `${mainline}\n${contract}\n${webDemo}\n${fieldAcceptanceCheck}\n${script}`;
  assert(checks.includes(FIELD_ACCEPTANCE_ENDPOINT), "field acceptance endpoint is not constrained by checks");
  assert(checks.includes(FIELD_ACCEPTANCE_SCHEMA), "field acceptance schema is not constrained by checks");
  assert(checks.includes("trusted_hardware_session") || checks.includes("sdk_live_binding"), "trusted hardware session check is not constrained");
}

async function main() {
  const [space, fieldMarkers] = await Promise.all([
    readJson("data/space_demo.json"),
    readJson("data/field_markers.json")
  ]);
  const simulatorOnlyManifest = assertAllSimulatorDoesNotMakeHardwareReady(space);
  assertHardwareReadyRequiresAllRequiredGates(space, fieldMarkers);
  assertHardwareTrackingRequiresLiveSdkSession(space, fieldMarkers);
  const payload = useApi
    ? await fetchAcceptancePayload()
    : buildExpectedPayload({ space, fieldMarkers, wallCalibration: simulatorOnlyManifest });

  assertAcceptancePayload(payload);
  await assertCheckIsExposed();

  console.log(JSON.stringify({
    ok: true,
    mode: useApi ? "api" : "static-contract",
    schema: FIELD_ACCEPTANCE_SCHEMA,
    endpoint: FIELD_ACCEPTANCE_ENDPOINT,
    gates: requiredGateIds,
    trusted_hardware_gate_required: "trusted_hardware_session or sdk_live_binding",
    separated_states: ["print_kit", "simulator_rehearsal", "hardware_alignment"],
    all_simulator_ready_for_hardware: false,
    tracking_mode_only_hardware_ready: false,
    constrained_by: "check:field-acceptance"
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
