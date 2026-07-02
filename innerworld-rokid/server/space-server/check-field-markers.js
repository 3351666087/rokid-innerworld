import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWallCalibrationManifest } from "./src/domain/wall-calibration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");
const base = process.env.BASE_URL || "http://localhost:5177";
const useApi = process.argv.includes("--api") || process.env.CHECK_FIELD_MARKERS_API === "1";
const pdfPath = path.join(root, "output", "pdf", "rokid_innerworld_field_kit.pdf");
const htmlPath = path.join(root, "output", "pdf", "rokid_innerworld_field_kit.html");
const requiredAnchorIds = ["A1", "A2", "A3"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relativePath) {
  const raw = await readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

async function tryReadJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return readJson(relativePath);
}

async function tryBuildFieldMarkerManifest({ space, wallCalibration }) {
  const modulePath = path.join(__dirname, "src", "domain", "field-markers.js");
  if (!fs.existsSync(modulePath)) return null;
  const markerConfig = await tryReadJson("data/field_markers.json");
  const moduleUrl = new URL("./src/domain/field-markers.js", import.meta.url);
  const { buildFieldMarkerManifest } = await import(moduleUrl.href);
  return buildFieldMarkerManifest({
    baseUrl: base,
    space,
    markerConfig,
    wallCalibration,
    generatedAt: "2026-07-02T00:00:00.000Z"
  });
}

async function fetchWallCalibrationManifest() {
  const res = await fetch(`${base}/api/calibration/wall`);
  const contentType = res.headers.get("content-type") || "";
  assert(res.ok, "/api/calibration/wall status check failed");
  assert(contentType.includes("application/json"), "/api/calibration/wall content-type check failed");
  return res.json();
}

async function loadWallCalibrationManifest() {
  const space = await readJson("data/space_demo.json");

  if (useApi) {
    const wallCalibration = await fetchWallCalibrationManifest();
    return {
      source: `${base}/api/calibration/wall`,
      space,
      wallCalibration,
      fieldMarkers: await tryBuildFieldMarkerManifest({ space, wallCalibration })
    };
  }

  const wallCalibration = buildWallCalibrationManifest({
    baseUrl: base,
    space,
    state: {
      active_user: "A",
      mission_state: "entered"
    },
    generatedAt: "2026-07-02T00:00:00.000Z"
  });
  return {
    source: "buildWallCalibrationManifest(data/space_demo.json)",
    space,
    wallCalibration,
    fieldMarkers: await tryBuildFieldMarkerManifest({ space, wallCalibration })
  };
}

function assertFiniteVector(vector, label) {
  assert(vector && typeof vector === "object", `${label} missing`);
  for (const axis of ["x", "y", "z"]) {
    assert(Number.isFinite(Number(vector[axis])), `${label}.${axis} must be numeric`);
  }
}

function assertFiniteRotation(rotation, label) {
  assert(rotation && typeof rotation === "object", `${label} missing`);
  for (const axis of ["x", "y", "z", "w"]) {
    assert(Number.isFinite(Number(rotation[axis])), `${label}.${axis} must be numeric`);
  }
}

function assertCalibrationManifest(manifest) {
  assert(manifest.ok === true, "wall calibration manifest ok check failed");
  assert(manifest.schema === "innerworld-wall-calibration/v1", "wall calibration schema check failed");
  assert(manifest.wall?.coordinate_system === "innerworld-wall-local/v1", "wall coordinate system check failed");
  assert(manifest.observation_endpoint?.method === "POST", "observation endpoint method check failed");
  assert(manifest.observation_endpoint?.path === "/api/calibration/observations", "observation endpoint path check failed");
  assert(Array.isArray(manifest.anchors), "wall calibration anchors missing");

  const anchorsById = new Map(manifest.anchors.map((anchor) => [anchor.anchor_id, anchor]));
  assert(requiredAnchorIds.every((anchorId) => anchorsById.has(anchorId)), "wall calibration must cover A1/A2/A3");
  assert(manifest.anchors.length >= requiredAnchorIds.length, "wall calibration anchor count check failed");

  for (const anchorId of requiredAnchorIds) {
    const anchor = anchorsById.get(anchorId);
    assert(anchor.label, `${anchorId} label missing`);
    assert(anchor.kind, `${anchorId} kind missing`);
    assert(anchor.marker?.marker_id, `${anchorId} marker id missing`);
    assert(anchor.marker?.marker_type, `${anchorId} tracking marker type missing`);
    assert(["qr_poster", "image_target"].includes(anchor.marker.marker_type), `${anchorId} unsupported marker type`);
    assert(anchor.marker?.detection_priority, `${anchorId} marker detection priority missing`);
    assert(anchor.expected_pose, `${anchorId} expected pose missing`);
    assertFiniteVector(anchor.expected_pose.position, `${anchorId} expected_pose.position`);
    assertFiniteRotation(anchor.expected_pose.rotation, `${anchorId} expected_pose.rotation`);
    assert(anchor.acceptance?.confidence_min >= 0.5, `${anchorId} confidence threshold missing`);
  }

  assert(anchorsById.get("A1").marker.marker_type === "qr_poster", "A1 must be a QR poster marker");
  assert(anchorsById.get("A2").marker.marker_type === "image_target", "A2 must be an image tracking marker");
  assert(anchorsById.get("A3").marker.marker_type === "image_target", "A3 must be an image tracking marker");
}

function assertFieldMarkerManifest(manifest, wallCalibration) {
  assert(manifest.ok === true, "field marker manifest ok check failed");
  assert(manifest.schema === "innerworld-field-markers/v1", "field marker schema check failed");
  assert(manifest.source_of_truth?.runtime_manifest === "/api/calibration/wall", "field marker runtime manifest link missing");
  assert(manifest.source_of_truth?.observation_endpoint === "/api/calibration/observations", "field marker observation endpoint link missing");
  assert(manifest.calibration_manifest?.ready_for_hardware === Boolean(wallCalibration.runtime?.summary?.ready_for_hardware), "field marker hardware readiness must mirror wall calibration summary");
  assert(Array.isArray(manifest.calibration_manifest?.hardware_tracking_modes), "field marker hardware tracking modes missing");
  assert(manifest.calibration_manifest.hardware_tracking_modes.includes("qr"), "field marker hardware tracking modes must include qr");
  assert(manifest.calibration_manifest.hardware_tracking_modes.includes("image_tracking"), "field marker hardware tracking modes must include image_tracking");
  assert(manifest.calibration_manifest.hardware_tracking_modes.includes("slam"), "field marker hardware tracking modes must include slam");
  assert(Array.isArray(manifest.markers), "field marker list missing");

  const markersById = new Map(manifest.markers.map((marker) => [marker.anchor_id, marker]));
  const wallAnchorsById = new Map(wallCalibration.anchors.map((anchor) => [anchor.anchor_id, anchor]));
  for (const anchorId of requiredAnchorIds) {
    const marker = markersById.get(anchorId);
    const wallAnchor = wallAnchorsById.get(anchorId);
    assert(marker, `${anchorId} field marker missing`);
    assert(wallAnchor, `${anchorId} wall calibration anchor missing`);
    assert(marker.marker?.marker_id, `${anchorId} field marker id missing`);
    assert(marker.marker?.marker_type === wallAnchor.marker?.marker_type, `${anchorId} field marker type must match wall calibration`);
    assert(Array.isArray(marker.tracking_modes) && marker.tracking_modes.length > 0, `${anchorId} tracking modes missing`);
    assert(marker.tracking_modes.includes("manual") || marker.tracking_modes.includes("simulator"), `${anchorId} fallback tracking mode missing`);
    assert(marker.expected_pose, `${anchorId} field marker expected pose missing`);
    assertFiniteVector(marker.expected_pose.position, `${anchorId} field marker expected_pose.position`);
    assertFiniteRotation(marker.expected_pose.rotation, `${anchorId} field marker expected_pose.rotation`);
    assert(JSON.stringify(marker.expected_pose) === JSON.stringify(wallAnchor.expected_pose), `${anchorId} expected pose must bind to wall calibration`);
  }

  const requiredMarkerIds = manifest.acceptance?.required_marker_ids || [];
  assert(requiredMarkerIds.includes("A1:qr-entry"), "A1 required marker id missing");
  assert(requiredMarkerIds.includes("A2:image-target"), "A2 required marker id missing");
  assert(requiredMarkerIds.includes("A3:image-target"), "A3 required marker id missing");
}

function tryExtractPdfText(filePath) {
  try {
    return {
      source: "pdftotext",
      text: execFileSync("pdftotext", ["-layout", filePath, "-"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      })
    };
  } catch {
    return {
      source: "pdf-bytes",
      text: fs.readFileSync(filePath).toString("latin1")
    };
  }
}

function assertPrintableFieldKit(fieldMarkers) {
  assert(fs.existsSync(pdfPath), `field kit PDF missing: ${pdfPath}`);
  const pdfStat = fs.statSync(pdfPath);
  assert(pdfStat.isFile(), "field kit PDF path is not a file");
  assert(pdfStat.size > 1024, "field kit PDF is unexpectedly small");

  const pdfText = tryExtractPdfText(pdfPath);
  const htmlText = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";
  const searchable = `${pdfText.text}\n${htmlText}`.toLowerCase();
  const configuredTokens = Array.isArray(fieldMarkers?.acceptance?.pdf_tokens)
    ? fieldMarkers.acceptance.pdf_tokens
    : [];
  const keywords = [...new Set(["marker", "a1", "a2", "a3", ...configuredTokens].map((keyword) => String(keyword).toLowerCase()))];
  const missing = keywords.filter((keyword) => !searchable.includes(keyword));
  assert(missing.length === 0, `field kit PDF/HTML searchable text missing keywords: ${missing.join(", ")}`);

  return {
    path: path.relative(root, pdfPath).replace(/\\/g, "/"),
    bytes: pdfStat.size,
    text_source: pdfText.source,
    sidecar_html: fs.existsSync(htmlPath)
  };
}

async function main() {
  const { source, wallCalibration, fieldMarkers } = await loadWallCalibrationManifest();
  assertCalibrationManifest(wallCalibration);
  if (fieldMarkers) {
    assertFieldMarkerManifest(fieldMarkers, wallCalibration);
  }
  const pdf = assertPrintableFieldKit(fieldMarkers);

  console.log(JSON.stringify({
    ok: true,
    manifest_source: source,
    schema: wallCalibration.schema,
    field_marker_schema: fieldMarkers?.schema || null,
    wall_coordinate_system: wallCalibration.wall.coordinate_system,
    anchors: requiredAnchorIds.map((anchorId) => {
      const anchor = wallCalibration.anchors.find((item) => item.anchor_id === anchorId);
      const marker = fieldMarkers?.markers?.find((item) => item.anchor_id === anchorId);
      return {
        anchor_id: anchor.anchor_id,
        kind: anchor.kind,
        marker_type: anchor.marker.marker_type,
        tracking_modes: marker?.tracking_modes || null,
        expected_pose: Boolean(anchor.expected_pose)
      };
    }),
    observation_endpoint: wallCalibration.observation_endpoint.path,
    field_kit_pdf: pdf
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
