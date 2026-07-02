import { aiDisplayTextMaxLength, anchors, beacons, missionSteps } from "../../../../shared/innerworld-contract.js";

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clipText(value, maxLength) {
  const clean = compact(value);
  return clean.length > maxLength ? clean.slice(0, Math.max(0, maxLength - 1)) + "…" : clean;
}

function findAnchor(space, anchorId) {
  return anchors(space).find((anchor) => anchor.anchor_id === anchorId) || anchors(space)[0] || null;
}

function findActiveStep(space, state, anchorId) {
  const steps = missionSteps(space);
  const stateIndex = Number.isFinite(Number(state?.current_step_index)) ? Number(state.current_step_index) : 0;
  const currentStep = steps[Math.min(Math.max(0, stateIndex), Math.max(0, steps.length - 1))] || null;
  return (currentStep && (!anchorId || currentStep.anchor_id === anchorId) ? currentStep : null)
    || steps.find((step) => step.anchor_id === anchorId)
    || currentStep
    || null;
}

function findTopBeacon(state, anchorId) {
  return beacons(state).filter((beacon) => beacon.anchor_id === anchorId).at(-1) || null;
}

function inferHintLevel(step, state) {
  const completed = new Set(Array.isArray(state?.completed_steps) ? state.completed_steps : []);
  if (!step || completed.has(step.step_id)) return "none";
  if (step.step_id === "find_year") return "weak";
  if (step.step_id === "write_back") return "strong";
  return "weak";
}

function reviewWriteBack(text) {
  const clean = compact(text);
  if (!clean) {
    return {
      status: "needs_review",
      tag: "time_capsule",
      summary: "等待写回内容",
      visibility: "organizer_only"
    };
  }

  const blocked = /(\d{6,}|电话|手机号|身份证|住址|地址|傻|滚|死)/.test(clean);
  if (blocked) {
    return {
      status: "needs_review",
      tag: "time_capsule",
      summary: "包含隐私或不当表达",
      visibility: "organizer_only"
    };
  }

  return {
    status: "approved",
    tag: "time_capsule",
    summary: clipText(clean, 36),
    visibility: "public_after_demo"
  };
}

function serviceActionForStep(space, step) {
  if (step?.step_id !== "service_action") return null;
  const action = Array.isArray(space?.service_actions) ? space.service_actions[0] : null;
  return action
    ? {
        action_id: action.action_id,
        label: action.label
      }
    : null;
}

export function generateHudOutput({ space, state, aiSchema, body = {} }) {
  const maxLength = aiDisplayTextMaxLength(aiSchema);
  const requestedAnchorId = body.anchor_id || body.anchorId || body.current_anchor_id;
  const anchor = findAnchor(space, requestedAnchorId);
  const anchorId = anchor?.anchor_id || requestedAnchorId || "A1";
  const step = findActiveStep(space, state, anchorId);
  const topBeacon = findTopBeacon(state, anchorId);
  const missionState = body.mission_state || state?.mission_state || step?.state || "entered";
  const writeBackText = body.write_back_text || body.text || "";
  const review = reviewWriteBack(writeBackText);

  let displayText = "";
  if (writeBackText) {
    displayText = review.status === "approved"
      ? `已生成时间胶囊\n${review.summary}`
      : "这句先交给组织者复核";
  } else if (topBeacon?.display_text || topBeacon?.body) {
    displayText = topBeacon.display_text || topBeacon.body;
  } else if (step?.hint) {
    displayText = step.hint;
  } else if (anchor?.label) {
    displayText = `${anchor.label} 已就绪`;
  } else {
    displayText = "校园记忆层已打开";
  }

  return {
    mission_state: missionState,
    display_text: clipText(displayText, maxLength),
    hint_level: inferHintLevel(step, state),
    service_action: serviceActionForStep(space, step),
    write_back_review: review
  };
}
