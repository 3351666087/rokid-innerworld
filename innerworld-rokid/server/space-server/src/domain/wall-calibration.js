export const WALL_CALIBRATION_SCHEMA = "innerworld-wall-calibration/v1";
export const WALL_CALIBRATION_OBSERVATION_SCHEMA = "innerworld-wall-calibration-observation/v1";

const DEFAULT_CONFIDENCE_MIN = 0.55;
const DEFAULT_ERROR_WARN_M = 0.18;
const DEFAULT_ERROR_REJECT_M = 0.35;
const TRACKING_MODES = new Set(["qr", "image_tracking", "slam", "manual", "simulator", "unknown"]);

function nowIso() {
  return new Date().toISOString();
}

function trimText(value, maxLength = 160) {
  return String(value || "").trim().slice(0, maxLength);
}

function redactSensitiveText(value) {
  return String(value || "")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[redacted_ip]")
    .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, "[redacted_mac]")
    .replace(/\b[A-Z0-9._:-]*(?:token|secret)[A-Z0-9._:-]*\b/gi, "[redacted_secret]")
    .replace(/\bSN[-_A-Z0-9]*\b/gi, "[redacted_serial]")
    .replace(/\bprivate[-_\w]*wifi\b/gi, "[redacted_ssid]");
}

function cleanId(value, fallback = "") {
  return trimText(value, 96).replace(/[^A-Za-z0-9_.:-]/g, "-") || fallback;
}

function cleanPublicId(value, fallback = "") {
  const redacted = trimText(redactSensitiveText(value), 96)
    .replace(/\[redacted_([a-z]+)\]/gi, "redacted_$1");
  return cleanId(redacted, fallback);
}

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max, fallback = min) {
  const number = finiteNumber(value, fallback);
  return Math.max(min, Math.min(max, number));
}

function cleanVector(value) {
  if (!value || typeof value !== "object") return null;
  return {
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    z: finiteNumber(value.z, 0)
  };
}

function cleanRotation(value) {
  if (!value || typeof value !== "object") return null;
  return {
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    z: finiteNumber(value.z, 0),
    w: finiteNumber(value.w, 1)
  };
}

function cleanPose(value) {
  if (!value || typeof value !== "object") return null;
  const position = cleanVector(value.position || value);
  const rotation = cleanRotation(value.rotation);
  return {
    position,
    rotation
  };
}

function anchorPose(anchor) {
  return cleanPose({
    position: anchor?.pose || {},
    rotation: anchor?.rotation || { x: 0, y: 0, z: 0, w: 1 }
  });
}

function distanceMeters(a, b) {
  if (!a || !b) return null;
  const dx = finiteNumber(a.x, 0) - finiteNumber(b.x, 0);
  const dy = finiteNumber(a.y, 0) - finiteNumber(b.y, 0);
  const dz = finiteNumber(a.z, 0) - finiteNumber(b.z, 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function trackingMode(value) {
  const mode = trimText(value || "unknown", 40).toLowerCase();
  return TRACKING_MODES.has(mode) ? mode : "unknown";
}

function markerForAnchor(anchor) {
  if (anchor?.kind === "entry") {
    return {
      marker_id: `${anchor.anchor_id}:qr-entry`,
      marker_type: "qr_poster",
      detection_priority: "primary"
    };
  }
  return {
    marker_id: `${anchor?.anchor_id || "anchor"}:image-target`,
    marker_type: "image_target",
    detection_priority: anchor?.kind === "write_back" ? "required_for_writeback" : "required_for_alignment"
  };
}

function wallDimensions(space) {
  const grid = space?.grid || {};
  const unitCm = finiteNumber(grid.unit_cm, 30);
  return {
    unit_cm: unitCm,
    width_m: Number(((finiteNumber(grid.width_units, 12) * unitCm) / 100).toFixed(3)),
    height_m: Number(((finiteNumber(grid.height_units, 6) * unitCm) / 100).toFixed(3)),
    scope: grid.scope || "one_wall"
  };
}

export function buildWallCalibrationManifest({
  baseUrl,
  space,
  state,
  summary = null,
  generatedAt = nowIso()
}) {
  const anchors = Array.isArray(space?.anchors) ? space.anchors : [];
  const dimensions = wallDimensions(space);
  const latestByAnchor = summary?.latest_by_anchor || {};

  return {
    ok: true,
    schema: WALL_CALIBRATION_SCHEMA,
    generated_at: generatedAt,
    space_id: space?.space_id || "innerworld_campus_wall",
    wall: {
      coordinate_system: "innerworld-wall-local/v1",
      origin_anchor_id: "A2",
      forward_axis: "+z from viewer toward wall",
      up_axis: "+y",
      right_axis: "+x",
      units: "meters",
      dimensions,
      grid: space?.grid || null,
      physical_scope: "single campus exhibition wall"
    },
    anchors: anchors.map((anchor) => ({
      anchor_id: anchor.anchor_id,
      label: anchor.label,
      kind: anchor.kind,
      grid_pos: anchor.grid_pos,
      expected_pose: anchorPose(anchor),
      marker: markerForAnchor(anchor),
      acceptance: {
        confidence_min: DEFAULT_CONFIDENCE_MIN,
        position_error_warn_m: DEFAULT_ERROR_WARN_M,
        position_error_reject_m: DEFAULT_ERROR_REJECT_M
      },
      latest_observation: latestByAnchor[anchor.anchor_id] || null
    })),
    procedure: [
      {
        step_id: "print_and_place",
        label: "Place A1/A2/A3 physical markers on the exhibition wall",
        evidence: "A1 entry poster, A2 memory marker, A3 write-back marker"
      },
      {
        step_id: "scan_a1",
        label: "Use Rokid QR or image tracking to lock A1",
        anchor_id: "A1"
      },
      {
        step_id: "align_a2",
        label: "Turn to A2 and confirm the memory beacon overlaps the physical marker",
        anchor_id: "A2"
      },
      {
        step_id: "validate_a3",
        label: "Confirm A3 write-back capsule appears below the physical write-back marker",
        anchor_id: "A3"
      },
      {
        step_id: "handoff",
        label: "Submit calibration observations and hand the same Space API to Web, Unity, and Rokid"
      }
    ],
    observation_endpoint: {
      method: "POST",
      path: "/api/calibration/observations",
      url: `${String(baseUrl || "").replace(/\/+$/, "")}/api/calibration/observations`,
      schema: WALL_CALIBRATION_OBSERVATION_SCHEMA
    },
    runtime: {
      mission_state: state?.mission_state || null,
      active_user: state?.active_user || null,
      summary: summary || {
        ok: true,
        total: 0,
        accepted: 0,
        warning: 0,
        rejected: 0,
        calibrated_anchor_count: 0,
        ready_for_hardware: false
      }
    },
    privacy: "Calibration stores only sanitized anchor observations, pose, confidence, and bounded notes. It omits device serials, tokens, SSID, MAC, IP, phone, address, and raw private evidence."
  };
}

export function createWallCalibrationObservation({ body = {}, space, receivedAt = nowIso() }) {
  const anchors = Array.isArray(space?.anchors) ? space.anchors : [];
  const anchorId = cleanId(body.anchor_id, "");
  const anchor = anchors.find((item) => item.anchor_id === anchorId) || null;
  const observedPose = cleanPose(body.observed_pose || body.pose || {});
  const expectedPose = anchor ? anchorPose(anchor) : null;
  const positionError = distanceMeters(observedPose?.position, expectedPose?.position);
  const confidence = clamp(body.confidence, 0, 1, 0);
  const mode = trackingMode(body.tracking_mode);
  const notes = trimText(redactSensitiveText(body.notes), 240);
  const hasPose = Boolean(observedPose?.position);
  const status = !anchor || confidence < DEFAULT_CONFIDENCE_MIN || !hasPose
    ? "rejected"
    : positionError !== null && positionError > DEFAULT_ERROR_REJECT_M
      ? "rejected"
      : positionError !== null && positionError > DEFAULT_ERROR_WARN_M
        ? "warning"
        : "accepted";

  const issues = [];
  if (!anchor) issues.push("anchor_not_found");
  if (!hasPose) issues.push("observed_pose_missing");
  if (confidence < DEFAULT_CONFIDENCE_MIN) issues.push("confidence_below_threshold");
  if (positionError !== null && positionError > DEFAULT_ERROR_WARN_M) issues.push("position_error_above_warning");
  if (positionError !== null && positionError > DEFAULT_ERROR_REJECT_M) issues.push("position_error_above_reject");

  return {
    ok: true,
    schema: WALL_CALIBRATION_OBSERVATION_SCHEMA,
    observation_id: `cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    status,
    issues,
    space_id: space?.space_id || "innerworld_campus_wall",
    anchor_id: anchorId || null,
    tracking_mode: mode,
    session_id: cleanPublicId(body.session_id, null),
    device_id: cleanPublicId(body.device_id, null),
    observed_pose: observedPose,
    expected_pose: expectedPose,
    confidence,
    position_error_m: positionError === null ? null : Number(positionError.toFixed(4)),
    notes,
    client_time: trimText(body.client_time, 64) || null,
    created_at: receivedAt,
    acceptance: {
      confidence_min: DEFAULT_CONFIDENCE_MIN,
      position_error_warn_m: DEFAULT_ERROR_WARN_M,
      position_error_reject_m: DEFAULT_ERROR_REJECT_M
    },
    privacy: "Sanitized calibration observation. Device/network identifiers and secrets are not accepted into the calibration record."
  };
}
