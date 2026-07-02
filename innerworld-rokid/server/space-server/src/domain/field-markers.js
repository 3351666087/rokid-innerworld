export const FIELD_MARKER_SCHEMA = "innerworld-field-markers/v1";

function nowIso() {
  return new Date().toISOString();
}

function cleanBaseUrl(value) {
  return String(value || "http://localhost:5177").replace(/\/+$/, "");
}

function markerConfigByAnchor(markerConfig) {
  const map = new Map();
  for (const marker of Array.isArray(markerConfig?.markers) ? markerConfig.markers : []) {
    if (marker?.anchor_id) {
      map.set(marker.anchor_id, marker);
    }
  }
  return map;
}

function fallbackMarker(anchor) {
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

function expectedPose(anchor, wallAnchor) {
  if (wallAnchor?.expected_pose) return wallAnchor.expected_pose;
  return {
    position: anchor?.pose || { x: 0, y: 0, z: 0 },
    rotation: anchor?.rotation || { x: 0, y: 0, z: 0, w: 1 }
  };
}

function markerPayloadUrl({ baseUrl, anchorId, markerType }) {
  if (markerType === "qr_poster") {
    return `${baseUrl}/?anchor=${encodeURIComponent(anchorId)}`;
  }
  return `${baseUrl}/api/field/markers#${encodeURIComponent(anchorId)}`;
}

export function buildFieldMarkerManifest({
  baseUrl,
  space,
  markerConfig,
  wallCalibration,
  generatedAt = nowIso()
}) {
  const publicBaseUrl = cleanBaseUrl(baseUrl);
  const anchors = Array.isArray(space?.anchors) ? space.anchors : [];
  const wallAnchors = new Map(
    (Array.isArray(wallCalibration?.anchors) ? wallCalibration.anchors : [])
      .map((anchor) => [anchor.anchor_id, anchor])
  );
  const configured = markerConfigByAnchor(markerConfig);

  const markers = anchors.map((anchor) => {
    const wallAnchor = wallAnchors.get(anchor.anchor_id) || {};
    const config = configured.get(anchor.anchor_id) || {};
    const marker = wallAnchor.marker || fallbackMarker(anchor);
    const payloadUrl = markerPayloadUrl({
      baseUrl: publicBaseUrl,
      anchorId: anchor.anchor_id,
      markerType: marker.marker_type
    });

    return {
      anchor_id: anchor.anchor_id,
      label: anchor.label,
      kind: anchor.kind,
      grid_pos: anchor.grid_pos,
      marker,
      tracking_modes: config.tracking_modes || ["image_tracking", "manual", "simulator"],
      expected_pose: expectedPose(anchor, wallAnchor),
      acceptance: wallAnchor.acceptance || null,
      latest_observation: wallAnchor.latest_observation || null,
      print: {
        title: config.print_title || `${anchor.anchor_id} ${anchor.label}`,
        payload_url: payloadUrl,
        placement_note: config.placement_note || "Place on the same physical exhibition wall.",
        cut_line_required: markerConfig?.print_contract?.cut_line_required !== false
      },
      field_role: {
        physical_role: config.physical_role || "Physical wall marker for the InnerWorld spatial layer.",
        operator_action: config.operator_action || "Align the device and submit a calibration observation.",
        evidence_source: config.evidence_source || "field kit print and /api/calibration/observations"
      }
    };
  });

  return {
    ok: true,
    schema: FIELD_MARKER_SCHEMA,
    generated_at: generatedAt,
    space_id: space?.space_id || markerConfig?.space_id || "innerworld_campus_wall",
    source_of_truth: markerConfig?.source_of_truth || {
      space_seed: "data/space_demo.json",
      runtime_manifest: "/api/calibration/wall",
      observation_endpoint: "/api/calibration/observations"
    },
    print_contract: markerConfig?.print_contract || {},
    public_url: `${publicBaseUrl}/`,
    calibration_manifest: {
      schema: wallCalibration?.schema || null,
      endpoint: "/api/calibration/wall",
      observation_endpoint: wallCalibration?.observation_endpoint || null,
      ready_for_hardware: wallCalibration?.runtime?.summary?.ready_for_hardware || false,
      calibrated_anchor_ids: wallCalibration?.runtime?.summary?.calibrated_anchor_ids || []
    },
    markers,
    acceptance: {
      ...(markerConfig?.acceptance || {}),
      required_anchor_ids: markerConfig?.acceptance?.required_anchor_ids || markers.map((marker) => marker.anchor_id),
      required_marker_ids: markerConfig?.acceptance?.required_marker_ids || markers.map((marker) => marker.marker.marker_id),
      runtime_fields_bound_to_wall_calibration: true
    },
    privacy: "Field marker data is public print/runtime metadata. It must not include private WeChat evidence, device serials, SSIDs, MACs, IPs, tokens, phone numbers, or addresses."
  };
}
