#!/usr/bin/env node
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const baseArg = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = (baseArg ? baseArg.split("=").slice(1).join("=") : process.env.BASE_URL || "http://127.0.0.1:5177").replace(/\/$/, "");
const requireReady = args.has("--require-ready");
const outputDir = path.join(root, "output", "field-input-readiness");

function redactUrl(value) {
  return String(value || "").replace(/\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b/g, "<private-ip-redacted>");
}

async function fetchJson(pathname) {
  try {
    const res = await fetch(`${baseUrl}${pathname}`, { headers: { accept: "application/json" } });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return { ok: res.ok, status: res.status, body, error: res.ok ? null : text.slice(0, 180) };
  } catch (error) {
    return { ok: false, status: null, body: null, error: error?.message || String(error) };
  }
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function isLiveStatus(status) {
  return status === "online" || status === "live" || status === "active";
}

function isRealInputFrame(frame, session = {}) {
  if (!isLiveStatus(session.session_status)) return false;
  if (session.pairing_status !== "operator_paired") return false;
  if (session.hardware_acceptance_eligible !== true) return false;
  if (session.sdk_binding_status?.live_binding_ready !== true) return false;
  if (session.sdk_binding_status?.input_binding_ready !== true) return false;
  if (session.sdk_binding_status?.overlay_binding_ready !== true) return false;
  if (!frame || frame.reported !== true) return false;
  if (frame.operator_assist_input === true) return false;
  if (frame.fallback_input_visible === true) return false;
  if (String(frame.input_acceptance_mode || "").includes("rehearsal")) return false;
  return frame.ray_reported === true
    && frame.pointable_ui_focus === true
    && Boolean(frame.focused_anchor_id)
    && (frame.command === "confirm" || frame.confirm_down === true || frame.confirm_held === true || frame.gaze_select_held === true);
}

function summarizeSession(session) {
  const input = session?.input_frame || {};
  return {
    session_status: session?.session_status || null,
    pairing_status: session?.pairing_status || null,
    hardware_acceptance_eligible: session?.hardware_acceptance_eligible === true,
    sdk_live_binding_ready: session?.sdk_binding_status?.live_binding_ready === true,
    sdk_input_binding_ready: session?.sdk_binding_status?.input_binding_ready === true,
    sdk_overlay_binding_ready: session?.sdk_binding_status?.overlay_binding_ready === true,
    input_reported: input.reported === true,
    ray_reported: input.ray_reported === true,
    pointable_ui_focus: input.pointable_ui_focus === true,
    focused_anchor_id: input.focused_anchor_id || null,
    confirm_ready: input.command === "confirm" || input.confirm_down === true || input.confirm_held === true || input.gaze_select_held === true,
    operator_assist_input: input.operator_assist_input === true,
    fallback_input_visible: input.fallback_input_visible === true,
    input_blocker: input.input_blocker || null,
    input_acceptance_mode: input.input_acceptance_mode || null,
    real_input_frame_ready: isRealInputFrame(input, session)
  };
}

function buildBlockers(rows) {
  const blockers = [];
  if (rows.length === 0) blockers.push("device_sessions_missing");
  if (!rows.some((row) => isLiveStatus(row.session_status))) blockers.push("live_device_session_missing");
  if (!rows.some((row) => row.pairing_status === "operator_paired")) blockers.push("operator_paired_session_missing");
  if (!rows.some((row) => row.hardware_acceptance_eligible === true)) blockers.push("hardware_acceptance_eligible_session_missing");
  if (!rows.some((row) => row.sdk_live_binding_ready)) blockers.push("sdk_live_binding_not_ready");
  if (!rows.some((row) => row.sdk_input_binding_ready)) blockers.push("sdk_input_binding_not_ready");
  if (!rows.some((row) => row.sdk_overlay_binding_ready)) blockers.push("sdk_overlay_binding_not_ready");
  if (!rows.some((row) => row.input_reported)) blockers.push("input_frame_not_reported");
  if (!rows.some((row) => row.ray_reported)) blockers.push("rkinput_ray_not_reported");
  if (!rows.some((row) => row.pointable_ui_focus)) blockers.push("pointable_ui_focus_missing");
  if (!rows.some((row) => row.focused_anchor_id)) blockers.push("focused_anchor_missing");
  if (!rows.some((row) => row.confirm_ready)) blockers.push("confirm_input_missing");
  if (rows.some((row) => row.operator_assist_input || row.fallback_input_visible || String(row.input_acceptance_mode || "").includes("rehearsal"))) blockers.push("operator_assist_rehearsal_not_hardware_ready");
  if (!rows.some((row) => row.real_input_frame_ready)) blockers.push("real_rkinput_pointable_confirm_missing");
  return [...new Set(blockers)];
}

async function main() {
  const generatedAt = new Date().toISOString();
  const sessionsResponse = await fetchJson("/api/device/sessions");
  const rows = list(sessionsResponse.body?.sessions).map(summarizeSession);
  const blockers = sessionsResponse.ok ? buildBlockers(rows) : ["device_sessions_api_unreachable"];
  const realInputFrameReady = sessionsResponse.ok && rows.some((row) => row.real_input_frame_ready);
  const realInputReady = realInputFrameReady && blockers.length === 0;
  const report = {
    schema: "innerworld-field-input-readiness/v1",
    generated_at: generatedAt,
    ok: realInputReady,
    api: {
      base_url_redacted: redactUrl(baseUrl),
      device_sessions_ok: sessionsResponse.ok,
      device_sessions_status: sessionsResponse.status
    },
    real_input_ready: realInputReady,
    real_input_frame_ready: realInputFrameReady,
    hardware_ready_claim_allowed: false,
    hardware_acceptance_evidence: false,
    blockers,
    summary: {
      session_count: rows.length,
      real_input_frame_count: rows.filter((row) => row.real_input_frame_ready).length,
      operator_assist_frame_count: rows.filter((row) => row.operator_assist_input || row.fallback_input_visible).length,
      pointable_focus_count: rows.filter((row) => row.pointable_ui_focus).length,
      confirm_ready_count: rows.filter((row) => row.confirm_ready).length
    },
    sessions: rows.slice(0, 10),
    privacy: {
      raw_session_ids_included: false,
      raw_device_ids_included: false,
      private_ips_included: false,
      raw_pose_or_ray_vectors_included: false,
      camera_frames_included: false
    }
  };

  await fs.mkdir(outputDir, { recursive: true });
  const stamp = generatedAt.replace(/\D/g, "").slice(0, 14);
  const jsonPath = path.join(outputDir, `field-input-readiness-${stamp}.json`);
  const latestPath = path.join(outputDir, "field-input-readiness-latest.json");
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (requireReady && !realInputReady) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});