import {
  EVIDENCE_CHAIN_SCHEMA,
  aiDisplayTextMaxLength,
  anchors,
  beacons,
  buildEndpointMap,
  cleanPublicBaseUrl,
  completedSteps,
  missionSteps,
  normalizeMissionState
} from "../../../../shared/innerworld-contract.js";

function countBy(items, field) {
  return items.reduce((result, item) => {
    const key = item?.[field] || "unknown";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

function fileNameOnly(value) {
  if (!value) return null;
  return String(value).split(/[\\/]/).filter(Boolean).at(-1) || null;
}

function countIssues(items) {
  return Array.isArray(items) ? items.length : 0;
}

function packageStatus(summary) {
  if (!summary) {
    return {
      exists: false,
      file: null,
      sha256: null
    };
  }

  return {
    exists: Boolean(summary.exists),
    file: fileNameOnly(summary.path),
    sha256: summary.sha256 || null
  };
}

function summarizeHardware(hardware) {
  if (!hardware) {
    return {
      status: "missing",
      kit: null,
      fit: null,
      borrow_deadline: null,
      devices: [],
      privacy: "Private loan-image identifiers are omitted from this endpoint."
    };
  }

  const devices = Array.isArray(hardware.devices) ? hardware.devices : [];
  return {
    status: hardware.status || "unknown",
    kit: hardware.kit || null,
    fit: hardware.fit || null,
    borrow_deadline: hardware.borrow_deadline || null,
    devices: devices.map((device) => ({
      product_name: device.product_name,
      model: device.model,
      quantity: device.quantity,
      role: device.role
    })),
    privacy: "Private loan-image identifiers are omitted from this endpoint."
  };
}

function summarizeRelease(opsStatus) {
  const deployDryRunOk = opsStatus?.deploy_dry_run?.ok === true;
  const releaseIndexOk = opsStatus?.release_index?.ok === true;

  return {
    status: deployDryRunOk ? "dry_run_verified" : releaseIndexOk ? "release_index_ready" : "pending",
    packages: {
      main_package: packageStatus(opsStatus?.packages?.main_package),
      server_package: packageStatus(opsStatus?.packages?.server_package)
    },
    release_index: opsStatus?.release_index
      ? {
          ok: Boolean(opsStatus.release_index.ok),
          generated_at: opsStatus.release_index.generated_at || null,
          warning_count: countIssues(opsStatus.release_index.warnings),
          error_count: countIssues(opsStatus.release_index.errors)
        }
      : null,
    deploy_dry_run: opsStatus?.deploy_dry_run
      ? {
          ok: Boolean(opsStatus.deploy_dry_run.ok),
          generated_at: opsStatus.deploy_dry_run.generated_at || null,
          zip_file: fileNameOnly(opsStatus.deploy_dry_run.zip_path),
          zip_sha256: opsStatus.deploy_dry_run.zip_sha256 || null,
          warning_count: countIssues(opsStatus.deploy_dry_run.warnings),
          error_count: countIssues(opsStatus.deploy_dry_run.errors)
        }
      : null
  };
}

function evidenceStatus(condition, fallback = "warn") {
  return condition ? "ready" : fallback;
}

export function buildEvidenceChain({
  baseUrl,
  space,
  state,
  aiSchema,
  opsStatus,
  generatedAt = new Date().toISOString()
}) {
  const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
  const spaceId = space?.space_id;
  const endpoints = buildEndpointMap(publicBaseUrl, spaceId);
  const runtimeState = state && typeof state === "object"
    ? {
        ...state,
        completed_steps: completedSteps(state).slice(),
        beacons: beacons(state).slice()
      }
    : {};
  normalizeMissionState(space, runtimeState);

  const spaceAnchors = anchors(space);
  const steps = missionSteps(space);
  const runtimeBeacons = beacons(runtimeState);
  const done = completedSteps(runtimeState);
  const writeBackAnchor = spaceAnchors.find((anchor) => anchor.kind === "write_back")
    || spaceAnchors.find((anchor) => anchor.anchor_id === "A3")
    || null;
  const writeBackStep = steps.find((step) => step.step_id === "write_back") || null;
  const writeBackBeacons = runtimeBeacons.filter((beacon) => {
    return beacon.anchor_id === writeBackAnchor?.anchor_id || beacon.layer === "time_capsule";
  });
  const release = summarizeRelease(opsStatus);
  const hardware = summarizeHardware(opsStatus?.hardware);
  const aiReady = Boolean(aiSchema?.title && aiSchema?.properties?.write_back_review && endpoints.ai_schema && endpoints.ai_prompt);
  const writebackReady = Boolean(writeBackAnchor && endpoints.write_back && aiReady);

  const items = [
    {
      id: "space_contract",
      title: "Space contract",
      status: evidenceStatus(Boolean(spaceId && spaceAnchors.length > 0 && steps.length > 0)),
      summary: `${spaceId || "unknown"} has ${spaceAnchors.length} anchors and ${steps.length} mission steps.`,
      source: "data/space_demo.json"
    },
    {
      id: "mission_runtime",
      title: "Mission runtime",
      status: evidenceStatus(Boolean(runtimeState.mission_state && steps.length > 0)),
      summary: `${runtimeState.mission_state || "unknown"} with ${done.length}/${steps.length} completed steps.`,
      source: "data/innerworld.sqlite runtime_state"
    },
    {
      id: "beacon_counts",
      title: "Beacon counts",
      status: evidenceStatus(runtimeBeacons.length >= 2),
      summary: `${runtimeBeacons.length} runtime beacons across ${Object.keys(countBy(runtimeBeacons, "anchor_id")).length} anchors.`,
      source: "runtime state"
    },
    {
      id: "writeback_loop",
      title: "Write-back readiness",
      status: evidenceStatus(writebackReady),
      summary: `${writeBackAnchor?.anchor_id || "A3"} is ${writebackReady ? "ready" : "not ready"}; ${writeBackBeacons.length} time-capsule beacons are present.`,
      source: endpoints.write_back.path
    },
    {
      id: "ai_contract",
      title: "AI HUD contract",
      status: evidenceStatus(aiReady),
      summary: `${aiSchema?.title || "missing schema"} via schema and prompt endpoints.`,
      source: endpoints.ai_schema.path
    },
    {
      id: "hardware_lane",
      title: "Rokid hardware lane",
      status: evidenceStatus(hardware.fit === "fit", "pending"),
      summary: `${hardware.devices.length} device entries; fit=${hardware.fit || "unknown"}.`,
      source: "ops status hardware summary"
    },
    {
      id: "release_chain",
      title: "Release and dry-run",
      status: release.status === "dry_run_verified" ? "ready" : release.status === "release_index_ready" ? "warn" : "pending",
      summary: `release=${release.status}; server package exists=${release.packages.server_package.exists}.`,
      source: "ops status release summary"
    }
  ];

  return {
    ok: true,
    schema: EVIDENCE_CHAIN_SCHEMA,
    generated_at: generatedAt,
    base_url: publicBaseUrl,
    space: {
      space_id: spaceId,
      name: space?.name,
      version: space?.version,
      anchor_count: spaceAnchors.length,
      grid: space?.grid,
      layers: Array.isArray(space?.layers) ? space.layers : []
    },
    mission: {
      mission_id: space?.mission?.mission_id,
      title: space?.mission?.title,
      state: runtimeState.mission_state || space?.mission?.state || "unknown",
      current_step_index: runtimeState.current_step_index ?? 0,
      step_count: steps.length,
      completed_step_count: done.length,
      step_ids: steps.map((step) => step.step_id)
    },
    anchors: spaceAnchors.map((anchor) => ({
      anchor_id: anchor.anchor_id,
      label: anchor.label,
      kind: anchor.kind,
      default_state: anchor.default_state,
      grid_pos: anchor.grid_pos,
      has_pose: Boolean(anchor.pose)
    })),
    beacons: {
      total: runtimeBeacons.length,
      by_anchor: countBy(runtimeBeacons, "anchor_id"),
      by_layer: countBy(runtimeBeacons, "layer"),
      write_back_anchor_id: writeBackAnchor?.anchor_id || "A3",
      write_back_count: writeBackBeacons.length
    },
    writeback: {
      ready: writebackReady,
      anchor_id: writeBackAnchor?.anchor_id || "A3",
      step_id: writeBackStep?.step_id || "write_back",
      endpoint: endpoints.write_back,
      review_visibility: aiSchema?.properties?.write_back_review?.properties?.visibility?.enum || []
    },
    ai: {
      schema_title: aiSchema?.title || null,
      schema_endpoint: endpoints.ai_schema,
      prompt_endpoint: endpoints.ai_prompt,
      hud_endpoint: endpoints.ai_hud,
      display_text_max_length: aiDisplayTextMaxLength(aiSchema),
      write_back_review_required: aiSchema?.properties?.write_back_review?.required || []
    },
    hardware,
    release,
    operations: {
      ops_status_ok: opsStatus?.ok === true,
      local_url: opsStatus?.local_url || null,
      device_bootstrap_url: opsStatus?.device_bootstrap_url || endpoints.device_bootstrap.url
    },
    evidence_items: items
  };
}
