import {
  FIELD_SESSION_STAGE_IDS,
  SESSION_PLAN_SCHEMA,
  anchors,
  buildEndpointMap,
  buildStoryGraphMissionRuntimeContract,
  cleanPublicBaseUrl,
  completedSteps,
  missionSteps
} from "../../../../shared/innerworld-contract.js";

function findAnchor(space, predicate, fallbackId) {
  const list = anchors(space);
  return list.find(predicate) || list.find((anchor) => anchor.anchor_id === fallbackId) || null;
}

function currentStageId(state) {
  const done = new Set(completedSteps(state));
  if (state?.mission_state === "complete" || done.has("write_back")) return "handoff";
  if (done.has("service_action") || state?.mission_state === "writing") return "writeback";
  if (done.has("find_year") || state?.mission_state === "service_ready") return "service";
  if (done.has("read") || state?.mission_state === "reading" || state?.mission_state === "doing") return "read";
  return "opening";
}

function stageFrom({ stageId, label, anchor, step, intent, promptId, noteId, acceptance, fallback }) {
  return {
    stage_id: stageId,
    label,
    anchor_id: anchor?.anchor_id || null,
    mission_step_id: step?.step_id || null,
    intent,
    operator_prompt_id: promptId,
    device_handoff_note_id: noteId,
    acceptance_check_ids: acceptance,
    fallback_action_ids: fallback
  };
}

export function buildSessionPlan({
  baseUrl,
  space,
  state,
  aiSchema,
  generatedAt = new Date().toISOString()
}) {
  const publicBaseUrl = cleanPublicBaseUrl(baseUrl);
  const endpoints = buildEndpointMap(publicBaseUrl, space?.space_id);
  const storyGraph = buildStoryGraphMissionRuntimeContract({
    baseUrl: publicBaseUrl,
    space,
    state,
    endpoints
  });
  const steps = missionSteps(space);
  const entryAnchor = findAnchor(space, (anchor) => anchor.kind === "entry", "A1");
  const memoryAnchor = findAnchor(space, (anchor) => anchor.kind === "memory", "A2");
  const writeBackAnchor = findAnchor(space, (anchor) => anchor.kind === "write_back", "A3");
  const stepById = new Map(steps.map((step) => [step.step_id, step]));

  const operatorPrompts = [
    {
      id: "op_opening",
      stage_id: "opening",
      prompt: "Start at the real campus exhibition wall. Frame the Rokid glasses as a spatial memory layer over A1/A2/A3, not as a tour app, PPT, or phone page."
    },
    {
      id: "op_read",
      stage_id: "read",
      prompt: "Ask the participant to look at the memory beacon and read the three-line HUD summary before giving any verbal hint."
    },
    {
      id: "op_service",
      stage_id: "service",
      prompt: "Trigger the service action from the wall context so the audience sees a live spatial task, not a static information board."
    },
    {
      id: "op_writeback",
      stage_id: "writeback",
      prompt: "Let User A leave one place-related sentence at A3, then keep the text short enough for the glasses HUD."
    },
    {
      id: "op_handoff",
      stage_id: "handoff",
      prompt: "Switch to User B and verify the new time-capsule beacon appears in the same wall space without changing contracts."
    }
  ];

  const deviceHandoffNotes = [
    {
      id: "device_opening",
      stage_id: "opening",
      note: "Rokid/AR Studio should replace only input and display. The Space API, mission state, AI schema, and write-back contract stay shared."
    },
    {
      id: "device_read",
      stage_id: "read",
      note: `Use ${endpoints.ai_hud.path} for low-distraction HUD text; do not let device code invent separate prompt or schema fields.`
    },
    {
      id: "device_service",
      stage_id: "service",
      note: `Post service progress through ${endpoints.service_actions.path}; the action is part of the spatial wall task.`
    },
    {
      id: "device_writeback",
      stage_id: "writeback",
      note: `Write User A content through ${endpoints.write_back.path}; review visibility comes from ${aiSchema?.title || "the AI schema"}.`
    },
    {
      id: "device_handoff",
      stage_id: "handoff",
      note: "Reload state after write-back so User B sees the new beacon on the wall through Rokid, Unity fallback, or Web fallback."
    }
  ];

  const acceptanceChecks = [
    {
      id: "real_wall_context",
      stage_id: "opening",
      check: "A1 entry, A2 memory beacon, and A3 write-back point are explained as overlays on a real campus exhibition wall."
    },
    {
      id: "bootstrap_contract",
      stage_id: "opening",
      check: "Device bootstrap exposes shared endpoints for space, state, AI HUD, service action, and write-back."
    },
    {
      id: "read_memory",
      stage_id: "read",
      check: "A2 displays a concise HUD memory summary and advances read/find_year mission progress."
    },
    {
      id: "service_action",
      stage_id: "service",
      check: "The 14:30 service action can be recorded without leaving the spatial wall flow."
    },
    {
      id: "writeback_review",
      stage_id: "writeback",
      check: "A3 accepts one short place-related write-back and marks it as a time_capsule candidate."
    },
    {
      id: "user_b_visibility",
      stage_id: "handoff",
      check: "After handoff, User B can see beacon count increase and mission state remain complete."
    },
    {
      id: "evidence_chain",
      stage_id: "handoff",
      check: "Evidence chain endpoint returns ok, schema, evidence items, release status, and hardware summary."
    }
  ];

  const fallbackActions = [
    {
      id: "fallback_localhost",
      action: "Use localhost/LAN Web or Unity as the control surface while preserving the Rokid glasses spatial-memory framing."
    },
    {
      id: "fallback_manual_advance",
      action: "If tracking is unavailable, manually advance anchor focus through A1, A2, and A3 without changing endpoint contracts."
    },
    {
      id: "fallback_cached_json",
      action: "If network polling fails, reset to local JSON state, re-fetch bootstrap, and continue with no-store responses."
    },
    {
      id: "fallback_writeback_review",
      action: "If write-back text looks private or off-topic, keep it organizer-only and demonstrate the review status instead."
    }
  ];

  const stages = [
    stageFrom({
      stageId: "opening",
      label: "Opening",
      anchor: entryAnchor,
      step: stepById.get("read"),
      intent: "Open the wall as a live spatial memory layer through Rokid glasses.",
      promptId: "op_opening",
      noteId: "device_opening",
      acceptance: ["real_wall_context", "bootstrap_contract"],
      fallback: ["fallback_localhost", "fallback_manual_advance"]
    }),
    stageFrom({
      stageId: "read",
      label: "Read",
      anchor: memoryAnchor,
      step: stepById.get("find_year") || stepById.get("read"),
      intent: "Let the participant discover memory and mission progress from the wall overlay.",
      promptId: "op_read",
      noteId: "device_read",
      acceptance: ["read_memory"],
      fallback: ["fallback_cached_json", "fallback_manual_advance"]
    }),
    stageFrom({
      stageId: "service",
      label: "Service",
      anchor: entryAnchor,
      step: stepById.get("service_action"),
      intent: "Prove the wall layer can perform a live action instead of only displaying information.",
      promptId: "op_service",
      noteId: "device_service",
      acceptance: ["service_action"],
      fallback: ["fallback_localhost"]
    }),
    stageFrom({
      stageId: "writeback",
      label: "Writeback",
      anchor: writeBackAnchor,
      step: stepById.get("write_back"),
      intent: "Capture User A's short time-capsule sentence into the same spatial contract.",
      promptId: "op_writeback",
      noteId: "device_writeback",
      acceptance: ["writeback_review"],
      fallback: ["fallback_writeback_review", "fallback_cached_json"]
    }),
    stageFrom({
      stageId: "handoff",
      label: "Handoff",
      anchor: writeBackAnchor || memoryAnchor,
      step: stepById.get("write_back"),
      intent: "Switch to User B and verify the new memory is visible from the wall layer.",
      promptId: "op_handoff",
      noteId: "device_handoff",
      acceptance: ["user_b_visibility", "evidence_chain"],
      fallback: ["fallback_localhost", "fallback_cached_json"]
    })
  ];

  return {
    ok: true,
    schema: SESSION_PLAN_SCHEMA,
    generated_at: generatedAt,
    target: {
      name: "Campus Memory Wall spatial layer",
      primary_device: "Rokid glasses with AR Studio lane",
      guardrails: [
        "real campus exhibition wall first",
        "Rokid glasses spatial memory layer",
        "not a generic tour app",
        "not a PPT",
        "not a phone-first page"
      ]
    },
    space: {
      space_id: space?.space_id,
      mission_id: space?.mission?.mission_id,
      current_stage_id: currentStageId(state),
      stage_order: FIELD_SESSION_STAGE_IDS,
      story_graph_contract_id: storyGraph.contract_id,
      story_node_order: storyGraph.node_order
    },
    endpoints: {
      device_bootstrap: endpoints.device_bootstrap,
      evidence_chain: endpoints.evidence_chain,
      ai_hud: endpoints.ai_hud,
      service_actions: endpoints.service_actions,
      write_back: endpoints.write_back
    },
    story_graph: storyGraph,
    stages,
    operator_prompts: operatorPrompts,
    device_handoff_notes: deviceHandoffNotes,
    acceptance_checks: acceptanceChecks,
    fallback_actions: fallbackActions
  };
}
