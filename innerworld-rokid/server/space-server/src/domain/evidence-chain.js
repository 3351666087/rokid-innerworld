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

function publicAnchor(anchor, fallbackId, fallbackRole) {
  return {
    anchor_id: anchor?.anchor_id || fallbackId,
    label: anchor?.label || fallbackRole,
    role: anchor?.kind || fallbackRole,
    has_pose: Boolean(anchor?.pose)
  };
}

function summarizeControlledPreviews(space) {
  const pins = Array.isArray(space?.semantic_pins) ? space.semantic_pins : [];
  const controlledPins = pins.filter((pin) => {
    return pin?.controlled_demo === true
      && pin?.open_ugc_allowed === false
      && pin?.hardware_acceptance_evidence === false
      && pin?.p0_required === false;
  });

  return {
    status: controlledPins.length > 0 ? "preview_only" : "none",
    count: controlledPins.length,
    hardware_acceptance_evidence: false,
    contributes_to_p0_acceptance: false,
    open_ugc_allowed: false,
    pins: controlledPins.map((pin) => ({
      pin_id: pin.pin_id || null,
      label: pin.label || pin.media?.title || "controlled preview pin",
      kind: pin.kind || "semantic_pin",
      demo_role: pin.demo_role || "controlled_extension_preview",
      moderation_state: pin.safety?.moderation_state || null,
      user_generated: pin.safety?.user_generated === true,
      merchant_or_marketplace: pin.safety?.merchant_or_marketplace === true,
      broad_route: pin.safety?.broad_route === true
    }))
  };
}

function buildEvidenceReplayJudgeMode({ spaceAnchors, steps, runtimeState, runtimeBeacons, endpoints, release, hardware, controlledPreviews }) {
  const done = completedSteps(runtimeState);
  const entryAnchor = spaceAnchors.find((anchor) => anchor.kind === "entry")
    || spaceAnchors.find((anchor) => anchor.anchor_id === "A1")
    || null;
  const memoryAnchor = spaceAnchors.find((anchor) => anchor.kind === "memory")
    || spaceAnchors.find((anchor) => anchor.anchor_id === "A2")
    || null;
  const writeBackAnchor = spaceAnchors.find((anchor) => anchor.kind === "write_back")
    || spaceAnchors.find((anchor) => anchor.anchor_id === "A3")
    || null;
  const writeBackBeacons = runtimeBeacons.filter((beacon) => {
    return beacon.anchor_id === writeBackAnchor?.anchor_id || beacon.layer === "time_capsule";
  });
  const activeUser = runtimeState.active_user || "A";
  const missionComplete = runtimeState.mission_state === "complete" || done.length >= steps.length;
  const userBReadbackReady = activeUser === "B" && missionComplete && writeBackBeacons.length > 0;

  const replaySteps = [
    {
      id: "a1_entry",
      title: "A1 entry",
      status: evidenceStatus(Boolean(entryAnchor)),
      expected_action: "Operator points to the real entry poster and starts the spatial layer.",
      public_evidence: publicAnchor(entryAnchor, "A1", "entry"),
      source: "data/space_demo.json anchors"
    },
    {
      id: "a2_memory",
      title: "A2 memory",
      status: evidenceStatus(Boolean(memoryAnchor && (done.includes("read") || done.includes("find_year") || missionComplete)), "pending"),
      expected_action: "User A reads the memory beacon and advances read/find-year mission steps.",
      public_evidence: {
        anchor: publicAnchor(memoryAnchor, "A2", "memory"),
        completed_steps: done.filter((stepId) => stepId === "read" || stepId === "find_year")
      },
      source: "SQLite runtime_state via Space API"
    },
    {
      id: "a3_writeback",
      title: "A3 writeback",
      status: evidenceStatus(Boolean(writeBackAnchor && writeBackBeacons.length > 0), "pending"),
      expected_action: "User A writes a public time-capsule beacon at the write-back anchor.",
      public_evidence: {
        anchor: publicAnchor(writeBackAnchor, "A3", "write_back"),
        write_back_count: writeBackBeacons.length
      },
      source: endpoints.write_back.path
    },
    {
      id: "user_b_readback",
      title: "User B readback",
      status: evidenceStatus(userBReadbackReady, "pending"),
      expected_action: "Switch to User B and show that the A3 write-back remains visible in the same space.",
      public_evidence: {
        active_user: activeUser,
        mission_state: runtimeState.mission_state || "unknown",
        completed_step_count: done.length,
        write_back_count: writeBackBeacons.length
      },
      source: "SQLite-backed Space API state"
    }
  ];

  const sourceEvidence = [
    {
      id: "sqlite_runtime",
      title: "SQLite runtime evidence",
      status: evidenceStatus(Boolean(runtimeState.mission_state)),
      source: "data/innerworld.sqlite via /api/state and /api/ledger/*",
      sanitized_fields: ["mission_state", "active_user", "completed_steps", "beacon counts"]
    },
    {
      id: "writeback_api",
      title: "Write-back evidence",
      status: evidenceStatus(writeBackBeacons.length > 0, "pending"),
      source: endpoints.write_back.path,
      sanitized_fields: ["anchor_id", "beacon counts", "public display text only"]
    },
    {
      id: "field_acceptance",
      title: "Field acceptance evidence",
      status: "review",
      source: endpoints.field_acceptance.path,
      sanitized_fields: ["gate ids", "status", "blocking item summaries"]
    },
    {
      id: "release_chain",
      title: "Release evidence",
      status: release.status === "dry_run_verified" ? "ready" : "pending",
      source: "ops status release summary",
      sanitized_fields: ["package file names", "sha256", "warning/error counts"]
    },
    {
      id: "controlled_preview",
      title: "Controlled Sky Pin preview",
      status: controlledPreviews.count > 0 ? "preview" : "none",
      source: "data/space_demo.json semantic_pins",
      sanitized_fields: ["pin_id", "label", "demo_role", "safety flags"],
      hardware_acceptance_evidence: false,
      contributes_to_p0_acceptance: false
    }
  ];

  return {
    schema: "innerworld-evidence-replay-judge-mode/v1",
    mode: "evidence_replay_judge_mode",
    purpose: "Prove the real campus wall loop A1 -> A2 -> A3 -> User B without exposing secrets or raw runtime data.",
    read_only: true,
    sequence: ["A1 entry", "A2 memory", "A3 writeback", "User B readback"],
    overall_status: replaySteps.every((step) => step.status === "ready") ? "ready" : "rehearsal",
    replay_steps: replaySteps,
    source_evidence: sourceEvidence,
    judge_checks: {
      anchors_bound: Boolean(entryAnchor && memoryAnchor && writeBackAnchor),
      writeback_visible: writeBackBeacons.length > 0,
      user_b_readback_visible: userBReadbackReady,
      sqlite_runtime_source: true,
      field_acceptance_source: endpoints.field_acceptance.path,
      release_source: release.status,
      hardware_fit: hardware.fit || "unknown",
      controlled_preview_only: controlledPreviews.hardware_acceptance_evidence === false
    },
    privacy: {
      includes_secrets: false,
      includes_raw_chat: false,
      includes_runtime_db_dump: false,
      includes_private_ids: false,
      note: "Only sanitized public anchor ids, counts, endpoint paths, package file names, and readiness states are exposed."
    }
  };
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
  const controlledPreviews = summarizeControlledPreviews(space);
  const aiReady = Boolean(aiSchema?.title && aiSchema?.properties?.write_back_review && endpoints.ai_schema && endpoints.ai_prompt);
  const writebackReady = Boolean(writeBackAnchor && endpoints.write_back && aiReady);
  const evidenceReplayJudgeMode = buildEvidenceReplayJudgeMode({
    spaceAnchors,
    steps,
    runtimeState,
    runtimeBeacons,
    endpoints,
    release,
    hardware,
    controlledPreviews
  });

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
    },
    {
      id: "controlled_sky_pin_preview",
      title: "Controlled Sky Pin preview",
      status: controlledPreviews.count > 0 ? "preview" : "none",
      summary: `${controlledPreviews.count} controlled semantic preview pins; hardware evidence=${controlledPreviews.hardware_acceptance_evidence}.`,
      source: "data/space_demo.json semantic_pins",
      contributes_to_p0_acceptance: false
    },
    {
      id: "evidence_replay_judge_mode",
      title: "Evidence replay judge mode",
      status: evidenceReplayJudgeMode.overall_status === "ready" ? "ready" : "warn",
      summary: `${evidenceReplayJudgeMode.sequence.join(" -> ")}; privacy sanitized=${evidenceReplayJudgeMode.privacy.includes_secrets === false}.`,
      source: "/api/evidence/chain"
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
    controlled_previews: controlledPreviews,
    evidence_replay_judge_mode: evidenceReplayJudgeMode,
    operations: {
      ops_status_ok: opsStatus?.ok === true,
      local_url: opsStatus?.local_url || null,
      device_bootstrap_url: opsStatus?.device_bootstrap_url || endpoints.device_bootstrap.url
    },
    evidence_items: items
  };
}
