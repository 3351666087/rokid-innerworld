const SPACE_ID = "innerworld_campus_wall";
const WRITE_BACK_DEFAULT = "后来的人，别忘了抬头看这里。";

const api = {
  async getSpace() {
    return requestJson(`/api/spaces/${SPACE_ID}`, {}, "读取空间数据失败");
  },
  async getOpsStatus() {
    return requestJson("/api/ops/status", {}, "读取现场状态失败");
  },
  async getDeviceBootstrap() {
    return requestJson("/api/device/bootstrap?profile=rokid-ar", { cache: "no-store" }, "读取设备 bootstrap 失败");
  },
  async getDeviceManifest() {
    return requestJson("/api/device/manifest", { cache: "no-store" }, "读取设备 manifest 失败");
  },
  async registerDevice(payload) {
    return requestJson("/api/device/register", jsonPost(payload), "注册模拟设备失败");
  },
  async sendDeviceHeartbeat(payload) {
    return requestJson("/api/device/heartbeat", jsonPost(payload), "发送设备心跳失败");
  },
  async getDeviceSessions() {
    return requestJson("/api/device/sessions", { cache: "no-store" }, "读取设备会话失败");
  },
  async getStoreStatus() {
    return requestJson("/api/store/status", { cache: "no-store" }, "读取数据库状态失败");
  },
  async getDatasetCatalog() {
    return requestJson("/api/datasets/catalog", { cache: "no-store" }, "读取数据集目录失败");
  },
  async generateHud(payload) {
    return requestJson("/api/ai/hud", jsonPost(payload), "生成 HUD 失败");
  },
  async reset() {
    return requestJson("/api/reset", { method: "POST" }, "重置演示失败");
  },
  async interact(payload) {
    return requestJson("/api/interactions", jsonPost(payload), "推进任务失败");
  },
  async serviceAction(payload) {
    return requestJson("/api/service-actions", jsonPost(payload), "服务动作失败");
  },
  async writeBack(payload) {
    return requestJson(`/api/spaces/${SPACE_ID}/beacons`, jsonPost(payload), "写回失败");
  }
};

const model = {
  space: null,
  runtime: null,
  ops: null,
  bootstrap: null,
  store: null,
  datasetCatalog: null,
  deviceManifest: null,
  deviceSessions: null,
  deviceSession: null,
  deviceLastHeartbeat: null,
  activeUser: "A",
  currentAnchor: null,
  hudByAnchor: new Map(),
  hudErrors: new Map(),
  hudRequestId: 0,
  busy: false,
  autoRunning: false,
  panelCollapsed: false,
  panelAnimation: {
    frame: 0,
    width: 460,
    velocity: 0
  }
};

const els = {
  anchorLayer: document.querySelector("#anchorLayer"),
  autoBtn: document.querySelector("#autoBtn"),
  connectionPill: document.querySelector("#connectionPill"),
  hudAnchor: document.querySelector("#hudAnchor"),
  hudBody: document.querySelector("#hudBody"),
  hudHintLevel: document.querySelector("#hudHintLevel"),
  hudMeta: document.querySelector("#hudMeta"),
  hudTitle: document.querySelector("#hudTitle"),
  hardwareGrid: document.querySelector("#hardwareGrid"),
  deliveryTimeline: document.querySelector("#deliveryTimeline"),
  evidenceRail: document.querySelector("#evidenceRail"),
  agentQueue: document.querySelector("#agentQueue"),
  lensGrid: document.querySelector("#lensGrid"),
  lensState: document.querySelector("#lensState"),
  log: document.querySelector("#log"),
  missionState: document.querySelector("#missionState"),
  opsGrid: document.querySelector("#opsGrid"),
  panelToggleBtn: document.querySelector("#panelToggleBtn"),
  productGrid: document.querySelector("#productGrid"),
  progress: document.querySelector("#progress"),
  riskGrid: document.querySelector("#riskGrid"),
  routeGrid: document.querySelector("#routeGrid"),
  showcaseGrid: document.querySelector("#showcaseGrid"),
  spaceName: document.querySelector("#spaceName"),
  stageMetrics: document.querySelector("#stageMetrics"),
  stepper: document.querySelector("#stepper"),
  userBadge: document.querySelector("#userBadge"),
  writeText: document.querySelector("#writeText")
};

function jsonPost(payload) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {})
  };
}

async function requestJson(url, options, fallbackMessage) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body;
}

function runAction(action) {
  return async () => {
    if (model.busy) return;
    model.busy = true;
    document.body.classList.add("is-busy");
    try {
      await action();
    } catch (error) {
      renderOffline(error);
    } finally {
      model.busy = false;
      document.body.classList.remove("is-busy");
    }
  };
}

function setPanelCollapsed(collapsed) {
  const shell = document.querySelector(".app-shell");
  if (!shell || !els.panelToggleBtn) return;
  model.panelCollapsed = Boolean(collapsed);
  shell.classList.toggle("panel-collapsed", model.panelCollapsed);
  els.panelToggleBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
  els.panelToggleBtn.setAttribute("aria-label", collapsed ? "展开控制台" : "收起控制台");
  els.panelToggleBtn.title = collapsed ? "展开控制台" : "收起控制台";
  animatePanelWidth(shell, model.panelCollapsed ? 0 : panelOpenWidth());
}

function panelOpenWidth() {
  const width = Math.round(Math.min(Math.max(window.innerWidth * 0.28, 400), 480));
  return Number.isFinite(width) ? width : 460;
}

function animatePanelWidth(shell, targetWidth) {
  const animation = model.panelAnimation;
  window.cancelAnimationFrame(animation.frame);

  const stiffness = 0.16;
  const damping = 0.62;
  const tick = () => {
    const previousWidth = animation.width;
    const delta = targetWidth - animation.width;
    animation.velocity = (animation.velocity + delta * stiffness) * damping;
    animation.width += animation.velocity;

    const crossedOpeningTarget = targetWidth >= previousWidth && animation.width > targetWidth;
    const crossedClosingTarget = targetWidth <= previousWidth && animation.width < targetWidth;
    if (crossedOpeningTarget || crossedClosingTarget) {
      animation.width = targetWidth;
      animation.velocity = 0;
    }

    if (Math.abs(delta) < 0.35 && Math.abs(animation.velocity) < 0.35) {
      animation.width = targetWidth;
      animation.velocity = 0;
      shell.style.setProperty("--panel-current-width", `${targetWidth.toFixed(1)}px`);
      return;
    }

    shell.style.setProperty("--panel-current-width", `${Math.max(0, animation.width).toFixed(1)}px`);
    animation.frame = window.requestAnimationFrame(tick);
  };

  animation.frame = window.requestAnimationFrame(tick);
}

function anchors() {
  return Array.isArray(model.space?.anchors) ? model.space.anchors : [];
}

function missionSteps() {
  return Array.isArray(model.space?.mission?.steps) ? model.space.mission.steps : [];
}

function completedSteps() {
  return new Set(Array.isArray(model.runtime?.completed_steps) ? model.runtime.completed_steps : []);
}

function activeStep() {
  const steps = missionSteps();
  const index = Number.isFinite(Number(model.runtime?.current_step_index)) ? Number(model.runtime.current_step_index) : 0;
  return steps[Math.min(Math.max(0, index), Math.max(0, steps.length - 1))] || null;
}

function anchorById(anchorId) {
  return anchors().find((anchor) => anchor.anchor_id === anchorId) || null;
}

function anchorByKind(kind, fallback) {
  return anchors().find((anchor) => anchor.kind === kind)?.anchor_id || fallback;
}

function entryAnchorId() {
  return anchorByKind("entry", "A1");
}

function memoryAnchorId() {
  return anchorByKind("memory", "A2");
}

function writeAnchorId() {
  return anchorByKind("write_back", "A3");
}

function normalizeAnchorId(anchorId) {
  if (anchorById(anchorId)) return anchorId;
  if (anchorById(activeStep()?.anchor_id)) return activeStep().anchor_id;
  return anchors()[0]?.anchor_id || entryAnchorId();
}

function setCurrentAnchor(anchorId, options = {}) {
  model.currentAnchor = normalizeAnchorId(anchorId);
  renderAnchors();
  renderHud();
  if (!options.skipAi) {
    requestAiHud(model.currentAnchor);
  }
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round(clamp(value / total, 0, 1) * 100);
}

function missionProgress() {
  const total = missionSteps().length;
  return {
    done: completedSteps().size,
    total,
    value: percent(completedSteps().size, total)
  };
}

function shortHash(value) {
  return value ? String(value).slice(0, 10) : "";
}

function fileName(value) {
  if (!value) return "n/a";
  return String(value).split(/[\\/]/).at(-1) || String(value);
}

function endpointUrl(endpoint) {
  if (!endpoint) return "n/a";
  return typeof endpoint === "string" ? endpoint : endpoint.url || endpoint.path || "n/a";
}

function isLoopback(value) {
  try {
    const url = new URL(value, window.location.origin);
    return url.hostname === "localhost" || url.hostname === "::1" || url.hostname.startsWith("127.");
  } catch {
    return false;
  }
}

function requiredCapabilityIds() {
  return (model.deviceManifest?.required_capabilities || []).map((capability) => capability.id).filter(Boolean);
}

function simulatedDevicePayload() {
  return {
    profile: "rokid-ar",
    device_id: "RA202 operator simulator",
    client_version: "web-operator-0.1.0",
    capabilities: requiredCapabilityIds(),
    network: {
      online: true,
      transport: isLoopback(model.bootstrap?.base_url || window.location.origin) ? "localhost" : "wifi",
      rtt_ms: 28,
      lan_reachable: true,
      http_cleartext_allowed: true
    }
  };
}

function simulatedHeartbeatPayload() {
  return {
    session_id: model.deviceSession?.session_id,
    device_id: model.deviceSession?.device_id,
    battery: {
      level_percent: 78,
      charging: false,
      temperature_c: 32
    },
    network: {
      online: true,
      transport: isLoopback(model.bootstrap?.base_url || window.location.origin) ? "localhost" : "wifi",
      rtt_ms: 32,
      lan_reachable: true,
      http_cleartext_allowed: true
    },
    pose: {
      confidence: 0.92,
      position: { x: 0, y: 1.55, z: 2.8 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    },
    active_anchor: model.currentAnchor || entryAnchorId(),
    current_user: model.activeUser
  };
}

function stableAnchorSeed(anchor, index) {
  const numeric = String(anchor?.anchor_id || "").match(/\d+/)?.[0];
  if (numeric) return Number(numeric) - 1;
  return [...String(anchor?.anchor_id || index)].reduce((sum, char) => sum + char.charCodeAt(0), index);
}

function anchorPosition(anchor, index) {
  const grid = model.space?.grid || {};
  const widthUnits = Math.max(1, Number(grid.width_units) || 12);
  const heightUnits = Math.max(1, Number(grid.height_units) || 6);
  const seed = stableAnchorSeed(anchor, index);
  const gridX = Number(anchor?.grid_pos?.x) || 1 + (seed % widthUnits);
  const gridY = Number(anchor?.grid_pos?.y) || 1 + (Math.floor(seed / widthUnits) % heightUnits);
  const mobileOffset = anchor?.kind === "write_back" ? 5 : 0;

  return {
    left: clamp(6 + (gridX / widthUnits) * 81, 10, 78),
    top: clamp(61 - (gridY / heightUnits) * 43 + mobileOffset, 18, 68)
  };
}

function beaconsForAnchor(anchorId) {
  return (model.space?.beacons || []).filter((beacon) => beacon.anchor_id === anchorId);
}

function renderAnchors() {
  if (!els.anchorLayer || !model.space) return;
  els.anchorLayer.innerHTML = "";

  anchors().forEach((anchor, index) => {
    const position = anchorPosition(anchor, index);
    const button = document.createElement("button");
    const label = anchor.label || anchor.anchor_id || "空间锚点";
    const beaconCount = beaconsForAnchor(anchor.anchor_id).length;
    const kind = String(anchor.kind || "anchor").replace(/_/g, "-");
    const isActive = anchor.anchor_id === model.currentAnchor;

    button.type = "button";
    button.className = `anchor anchor-kind-${kind}${isActive ? " active" : ""}`;
    button.dataset.anchor = anchor.anchor_id;
    button.dataset.anchorId = anchor.anchor_id;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.style.setProperty("--anchor-left", `${position.left.toFixed(2)}%`);
    button.style.setProperty("--anchor-top", `${position.top.toFixed(2)}%`);

    const dot = document.createElement("span");
    dot.className = "anchor-dot";
    dot.textContent = anchor.anchor_id || String(index + 1);

    const title = document.createElement("span");
    title.className = "anchor-label";
    title.textContent = label;

    const subline = document.createElement("span");
    subline.className = "anchor-subline";
    subline.textContent = `${anchor.kind || "anchor"} · ${beaconCount} beacon`;

    button.append(dot, title, subline);
    els.anchorLayer.append(button);
  });
}

function fallbackHud() {
  const anchor = anchorById(model.currentAnchor);
  const topBeacon = beaconsForAnchor(model.currentAnchor).at(-1);
  const step = activeStep();
  const writeAnchor = model.currentAnchor === writeAnchorId();

  if (writeAnchor && topBeacon?.layer === "time_capsule") {
    return {
      title: "时间胶囊已挂墙",
      body: topBeacon.display_text || topBeacon.body,
      hintLevel: "none"
    };
  }

  if (topBeacon) {
    return {
      title: topBeacon.display_text || topBeacon.title,
      body: topBeacon.body || step?.hint || "空间信标已读取。",
      hintLevel: "none"
    };
  }

  return {
    title: step?.label || "空间层待命",
    body: step?.hint || "看向锚点，读取下一步。",
    hintLevel: "weak"
  };
}

function hintLabel(level) {
  return {
    none: "hint none",
    weak: "weak hint",
    strong: "strong hint",
    answer: "answer"
  }[level] || "hint";
}

function reviewLabel(review) {
  if (!review) return null;
  const status = {
    approved: "写回通过",
    needs_review: "等待复核",
    rejected: "写回拒绝"
  }[review.status] || review.status;
  const visibility = {
    public_after_demo: "演示后公开",
    private: "私密",
    organizer_only: "仅组织者"
  }[review.visibility] || review.visibility;
  return [status, visibility, compact(review.summary)].filter(Boolean).join(" · ");
}

function actionLabel(action) {
  if (!action) return null;
  return `服务动作 · ${action.label || action.action_id}`;
}

function renderMetaPill(value) {
  if (!value) return;
  const pill = document.createElement("span");
  pill.textContent = value;
  els.hudMeta.append(pill);
}

function renderHud() {
  if (!model.space || !model.currentAnchor) return;
  const anchor = anchorById(model.currentAnchor);
  const aiHud = model.hudByAnchor.get(model.currentAnchor);
  const aiError = model.hudErrors.get(model.currentAnchor);
  const fallback = fallbackHud();
  const missionState = aiHud?.mission_state || model.runtime?.mission_state || model.space?.mission?.state || "entered";
  const hintLevel = aiHud?.hint_level || fallback.hintLevel || "none";

  els.hudAnchor.textContent = `${anchor?.anchor_id || model.currentAnchor} ${anchor?.label || "空间锚点"}`;
  els.hudHintLevel.textContent = hintLabel(hintLevel);
  els.hudTitle.textContent = compact(aiHud?.display_text) || fallback.title || "空间层待命";
  els.hudBody.textContent = compact(actionLabel(aiHud?.service_action) || reviewLabel(aiHud?.write_back_review)) || fallback.body || "等待下一次视线选择。";
  els.missionState.textContent = missionState;
  els.userBadge.textContent = `User ${model.activeUser}`;

  els.hudMeta.innerHTML = "";
  renderMetaPill(anchor?.kind ? `layer ${anchor.kind}` : null);
  renderMetaPill(`${beaconsForAnchor(model.currentAnchor).length} beacons`);
  renderMetaPill(aiHud ? "AI HUD online" : "local fallback");
  renderMetaPill(aiError ? "AI route fallback" : null);

  renderAgentQueue();
  renderStageMetrics();
  renderDeliveryScript();
  renderLog();
}

function buildHudPayload(anchorId) {
  const payload = {
    anchor_id: anchorId,
    user_id: model.activeUser,
    user_action: "select_anchor",
    mission_state: model.runtime?.mission_state || "entered",
    mission_step: activeStep()?.step_id || null
  };
  if (anchorId === writeAnchorId()) {
    payload.write_back_text = els.writeText?.value || "";
  }
  return payload;
}

async function requestAiHud(anchorId) {
  if (!anchorId || !model.space) return;
  const requestId = ++model.hudRequestId;

  try {
    const hud = await api.generateHud(buildHudPayload(anchorId));
    if (requestId !== model.hudRequestId || anchorId !== model.currentAnchor) return;
    model.hudByAnchor.set(anchorId, hud);
    model.hudErrors.delete(anchorId);
  } catch (error) {
    if (requestId !== model.hudRequestId || anchorId !== model.currentAnchor) return;
    model.hudByAnchor.delete(anchorId);
    model.hudErrors.set(anchorId, error);
  }

  renderHud();
}

function renderSteps() {
  if (!model.space) return;
  const completed = completedSteps();
  els.stepper.innerHTML = "";
  els.progress.innerHTML = "";

  missionSteps().forEach((step, index) => {
    const isDone = completed.has(step.step_id);
    const isActive = index === (Number(model.runtime?.current_step_index) || 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `step${isDone ? " done" : ""}${isActive ? " active" : ""}`;
    button.dataset.anchor = step.anchor_id;

    const indexNode = document.createElement("span");
    indexNode.className = "step-index";
    indexNode.textContent = String(index + 1);

    const copy = document.createElement("span");
    copy.className = "step-copy";
    const title = document.createElement("strong");
    title.textContent = step.label || step.step_id;
    const hint = document.createElement("span");
    hint.textContent = step.hint || "";
    copy.append(title, hint);

    const state = document.createElement("span");
    state.className = "step-state";
    state.textContent = isDone ? "done" : isActive ? "now" : "next";

    button.append(indexNode, copy, state);
    button.addEventListener("click", () => setCurrentAnchor(step.anchor_id));
    els.stepper.append(button);

    const bar = document.createElement("span");
    bar.className = isDone ? "done" : "";
    els.progress.append(bar);
  });

  renderRouteMap();
  renderDeliveryScript();
}

function renderOpsItem(label, value, tone = "neutral", options = {}) {
  const item = document.createElement("div");
  item.className = ["ops-item", tone, options.wide ? "wide" : ""].filter(Boolean).join(" ");
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const valueNode = document.createElement("strong");
  valueNode.textContent = value === undefined || value === null || value === "" ? "n/a" : String(value);
  item.append(labelNode, valueNode);
  return item;
}

function renderInfoCard(className, label, title, body, options = {}) {
  const card = document.createElement("div");
  card.className = [className, options.wide ? "wide" : ""].filter(Boolean).join(" ");
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  const titleNode = document.createElement("strong");
  titleNode.textContent = title;
  const bodyNode = document.createElement("p");
  bodyNode.textContent = body;
  card.append(labelNode, titleNode, bodyNode);
  return card;
}

function renderRouteMap() {
  if (!els.routeGrid || !model.space) return;
  const completed = completedSteps();
  els.routeGrid.innerHTML = "";

  anchors().forEach((anchor, index) => {
    const step = missionSteps().find((item) => item.anchor_id === anchor.anchor_id);
    const isActive = anchor.anchor_id === model.currentAnchor;
    const isDone = step ? completed.has(step.step_id) : index === 0;
    const node = document.createElement("button");
    node.type = "button";
    node.className = ["route-node", isActive ? "active" : "", isDone ? "done" : ""].filter(Boolean).join(" ");
    node.dataset.anchor = anchor.anchor_id;

    const marker = document.createElement("span");
    marker.className = "route-marker";
    marker.textContent = anchor.anchor_id || String(index + 1);

    const copy = document.createElement("span");
    copy.className = "route-copy";
    const title = document.createElement("strong");
    title.textContent = anchor.label || anchor.anchor_id;
    const body = document.createElement("span");
    body.textContent = `${anchor.kind || "anchor"} · ${beaconsForAnchor(anchor.anchor_id).length} beacons`;
    copy.append(title, body);

    const state = document.createElement("span");
    state.className = "route-state";
    state.textContent = isActive ? "live" : isDone ? "seen" : "queued";

    node.append(marker, copy, state);
    node.addEventListener("click", () => setCurrentAnchor(anchor.anchor_id));
    els.routeGrid.append(node);
  });
}

function renderStageMetrics() {
  if (!els.stageMetrics) return;
  const progress = missionProgress();
  const anchor = anchorById(model.currentAnchor);
  const hardwareFit = model.ops?.hardware?.fit === "fit";
  const aiOnline = model.hudByAnchor.has(model.currentAnchor);
  const baseUrl = model.bootstrap?.base_url || window.location.origin;
  const metrics = [
    ["Anchor", model.currentAnchor || "A1", anchor?.kind || "entry"],
    ["Mission", `${progress.value}%`, `${progress.done}/${progress.total}`],
    ["AI HUD", aiOnline ? "online" : "fallback", aiOnline ? "schema" : "rules"],
    ["Device", hardwareFit ? "fit" : "sim", isLoopback(baseUrl) ? "localhost" : "lan"]
  ];

  els.stageMetrics.innerHTML = "";
  metrics.forEach(([label, value, meta]) => {
    const item = document.createElement("div");
    item.className = "stage-metric";
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.textContent = value;
    const metaNode = document.createElement("small");
    metaNode.textContent = meta;
    item.append(labelNode, valueNode, metaNode);
    els.stageMetrics.append(item);
  });

  if (els.lensState) {
    els.lensState.textContent = hardwareFit ? "AR Studio Ready" : "Localhost Lens";
  }
}

function renderLensPanel() {
  if (!els.lensGrid) return;
  const baseUrl = model.bootstrap?.base_url || window.location.origin;
  const anchor = anchorById(model.currentAnchor);
  const endpoints = model.bootstrap?.endpoints || {};
  const hardware = summarizeHardware(model.ops?.hardware);
  const pose = anchor?.pose
    ? `x ${anchor.pose.x}, y ${anchor.pose.y}, z ${anchor.pose.z}`
    : "pose pending";

  els.lensGrid.innerHTML = "";
  els.lensGrid.append(
    renderInfoCard("lens-card", "View", anchor?.label || "入口海报", pose),
    renderInfoCard("lens-card", "Runtime", isLoopback(baseUrl) ? "Localhost" : "LAN", baseUrl),
    renderInfoCard("lens-card", "Hardware", model.ops?.hardware?.fit === "fit" ? "AR Studio Kit" : "Fallback", hardware, { wide: true }),
    renderInfoCard("lens-card", "HUD Endpoint", endpointUrl(endpoints.ai_hud || "/api/ai/hud"), "AI 输出只换文案与动作建议，不改空间契约。", { wide: true })
  );
}

function renderEvidenceChain() {
  if (!els.evidenceRail) return;
  const packages = model.ops?.packages || {};
  const releaseOk = model.ops?.release_index?.ok;
  const dryRunOk = model.ops?.deploy_dry_run?.ok;
  const schemaTitle = model.bootstrap?.ai?.output_schema_title || "InnerWorld HUD AI Output";
  const items = [
    ["01", "WeChat Evidence", "群聊、PDF、附件和时间线留在本地证据区，不进公开仓库。", "locked"],
    ["02", "Space Contract", `${anchors().length} anchors · ${model.space?.beacons?.length || 0} beacons · stable JSON`, "ready"],
    ["03", "AI HUD Schema", schemaTitle, model.bootstrap?.endpoints?.ai_hud ? "ready" : "fallback"],
    ["04", "Release Package", packages.main_package?.exists ? shortHash(packages.main_package.sha256) : "pending", packages.main_package?.exists ? "ready" : "warn"],
    ["05", "Deploy Dry Run", dryRunOk ? "server zip verified" : releaseOk ? "release indexed" : "pending", dryRunOk ? "ready" : "warn"]
  ];

  els.evidenceRail.innerHTML = "";
  items.forEach(([badge, title, body, state]) => {
    const item = document.createElement("div");
    item.className = `evidence-item ${state}`;
    const badgeNode = document.createElement("span");
    badgeNode.className = "evidence-badge";
    badgeNode.textContent = badge;
    const copy = document.createElement("div");
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    const bodyNode = document.createElement("p");
    bodyNode.textContent = body;
    copy.append(titleNode, bodyNode);
    const stateNode = document.createElement("span");
    stateNode.className = "evidence-state";
    stateNode.textContent = state;
    item.append(badgeNode, copy, stateNode);
    els.evidenceRail.append(item);
  });
}

function renderDeliveryScript() {
  if (!els.deliveryTimeline) return;
  const progress = missionProgress();
  const current = activeStep()?.step_id || "read";
  const rows = [
    ["00:00", "开场", "观众看到真实展墙，眼镜端叠出第一层记忆。", current === "read"],
    ["00:20", "读取", "A2 汇总前人留言，HUD 只给低噪音三行摘要。", current === "read" || current === "find_year"],
    ["00:45", "服务", "加入 14:30 体验活动，证明不是静态导览页。", current === "service_action"],
    ["01:10", "写回", "A3 写入时间胶囊，下一位用户立即能看到状态变化。", current === "write_back"],
    ["01:30", "收束", `任务进度 ${progress.done}/${progress.total}，输出包和部署 dry-run 可复验。`, progress.value === 100]
  ];

  els.deliveryTimeline.innerHTML = "";
  rows.forEach(([time, title, body, active]) => {
    const item = document.createElement("div");
    item.className = `delivery-step${active ? " active" : ""}`;
    const timeNode = document.createElement("span");
    timeNode.textContent = time;
    const copy = document.createElement("div");
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    const bodyNode = document.createElement("p");
    bodyNode.textContent = body;
    copy.append(titleNode, bodyNode);
    item.append(timeNode, copy);
    els.deliveryTimeline.append(item);
  });
}

function renderRiskGuardrails() {
  if (!els.riskGrid) return;
  const warnings = [
    ...(model.ops?.release_index?.warnings || []),
    ...(model.ops?.env_doctor?.warnings || [])
  ];
  const cFree = Number(model.ops?.ops_monitor?.c_free_gb_after);
  const cDriveTone = Number.isFinite(cFree) ? (cFree < 8 ? "bad" : cFree < 25 ? "warn" : "good") : "warn";
  const rows = [
    ["Secrets", "Env only", "Qwen/API keys 只读环境变量和 ignored local 文件。", "good"],
    ["Raw Evidence", "Private", "群聊、截图、导出附件和运行态不推 GitHub。", "good"],
    ["C Drive", Number.isFinite(cFree) ? `${cFree.toFixed(1)}GB` : "watching", "缓存清理由 ops 脚本频繁执行，低于阈值直接报警。", cDriveTone],
    ["LAN", isLoopback(model.bootstrap?.base_url || window.location.origin) ? "localhost" : "ready", "硬件到场前本机闭环，现场切 LAN URL。", "good"],
    ["Warnings", String(warnings.length), warnings.at(0) || "No active release warning.", warnings.length ? "warn" : "good"]
  ];

  els.riskGrid.innerHTML = "";
  rows.forEach(([label, title, body, tone]) => {
    els.riskGrid.append(renderInfoCard(`risk-card ${tone}`, label, title, body));
  });
}

function renderHardwareRuntime() {
  if (!els.hardwareGrid) return;
  const endpoints = model.bootstrap?.endpoints || {};
  const hardware = model.ops?.hardware;
  const baseUrl = model.bootstrap?.base_url || window.location.origin;
  const devices = Array.isArray(hardware?.devices) ? hardware.devices : [];
  const endpointCount = Object.keys(endpoints).length;
  const deviceManifestReady = Boolean(endpoints.device_manifest);
  const storeReady = model.store?.engine === "sqlite";
  const datasetCount = model.datasetCatalog?.datasets?.length ?? 0;
  const sessions = Array.isArray(model.deviceSessions?.sessions) ? model.deviceSessions.sessions : [];
  const latestSession = sessions[0] || model.deviceSession;
  const smoke = model.deviceSessions?.smoke_test_summary;
  const sessionStatus = latestSession?.session_status || model.deviceLastHeartbeat?.runtime?.session_status || "no session";
  const heartbeatCount = latestSession?.heartbeat_count ?? model.deviceLastHeartbeat?.heartbeat_count ?? 0;

  els.hardwareGrid.innerHTML = "";
  els.hardwareGrid.append(
    renderInfoCard("hardware-card good", "Kit", "Rokid AR Studio", devices.map((device) => `${device.model} x${device.quantity || 1}`).join(" + ") || "RA202 + RAS201"),
    renderInfoCard("hardware-card good", "Network", isLoopback(baseUrl) ? "Localhost now" : "LAN ready", isLoopback(baseUrl) ? "硬件到场后切 dev:lan 和 Windows 主控机 IP。" : baseUrl),
    renderInfoCard(storeReady ? "hardware-card good" : "hardware-card warn", "SQLite Store", storeReady ? "authoritative" : "checking", `${datasetCount} safe datasets · ${model.store?.device_sessions ?? 0} device sessions`),
    renderInfoCard("hardware-card", "Runtime API", `${endpointCount} endpoints`, "bootstrap / AI HUD / evidence / session plan / dataset call / device runtime 同一套契约。"),
    renderInfoCard("hardware-card", "Device Session", sessionStatus, latestSession ? `${latestSession.device_id} · heartbeat ${heartbeatCount}` : "点击注册模拟设备，硬件到场后替换为 RA202/RAS201。"),
    renderInfoCard("hardware-card", "Adapter Slots", "Input + Display", "UXR2.0 到场后只替换 gaze/gesture/overlay adapter，不改任务与证据链。"),
    renderInfoCard("hardware-card wide", "Readiness", deviceManifestReady && storeReady ? "SQLite + device runtime ready" : deviceManifestReady ? "Device manifest ready" : "runtime expanding", endpointUrl(endpoints.device_manifest || endpoints.dataset_catalog || "/api/device/bootstrap")),
    renderInfoCard("hardware-card wide", "Smoke", smoke?.ok ? "live session ok" : "waiting", smoke ? `${smoke.sessions_online || 0} online · ${smoke.sessions_stale || 0} stale · ${smoke.sessions_expired || 0} expired` : "注册并发送心跳后生成 smoke 摘要。")
  );

  const actions = document.createElement("div");
  actions.className = "hardware-actions";
  const registerBtn = document.createElement("button");
  registerBtn.type = "button";
  registerBtn.textContent = model.deviceSession ? "重新注册模拟设备" : "注册模拟设备";
  registerBtn.addEventListener("click", runAction(registerSimulatedDevice));
  const heartbeatBtn = document.createElement("button");
  heartbeatBtn.type = "button";
  heartbeatBtn.textContent = "发送心跳";
  heartbeatBtn.disabled = !model.deviceSession;
  heartbeatBtn.addEventListener("click", runAction(sendSimulatedHeartbeat));
  const refreshBtn = document.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.textContent = "刷新运行库";
  refreshBtn.addEventListener("click", runAction(refreshOps));
  actions.append(registerBtn, heartbeatBtn, refreshBtn);
  els.hardwareGrid.append(actions);
}

function renderProductModules() {
  if (!els.productGrid) return;
  const anchorCount = anchors().length;
  const beaconCount = model.space?.beacons?.length || 0;
  const writeBacks = (model.space?.beacons || []).filter((beacon) => beacon.layer === "time_capsule").length;
  const hardwareFit = model.ops?.hardware?.fit === "fit";

  els.productGrid.innerHTML = "";
  els.productGrid.append(
    renderInfoCard("product-card", "Spatial OS", `${anchorCount} Anchors`, "实体展墙被抽象成可寻址空间层，Rokid 端只替换输入和显示。"),
    renderInfoCard("product-card", "Memory Graph", `${beaconCount} Beacons`, `官方、公域和时间胶囊分层展示；当前写回 ${writeBacks} 条。`),
    renderInfoCard("product-card", "Hardware Lane", hardwareFit ? "AR Studio Ready" : "Localhost First", "Max Pro + Station Pro 到场后接入同一套 Space API。", { wide: true })
  );
}

function renderAgentQueue() {
  if (!els.agentQueue) return;
  const hud = model.hudByAnchor.get(model.currentAnchor);
  const review = hud?.write_back_review;
  const rows = [
    ["01", "Space Router", model.bootstrap?.endpoints?.ai_hud ? "ready" : "fallback", "把 A1/A2/A3 锚点映射到统一设备端点。"],
    ["02", "HUD Compiler", hud ? "online" : "local", compact(hud?.display_text) || "本地规则兜底，保证演示不中断。"],
    ["03", "Review Gate", review?.status || "waiting", reviewLabel(review) || "写回内容只进入演示级审核。"]
  ];

  els.agentQueue.innerHTML = "";
  rows.forEach(([badge, title, state, body]) => {
    const row = document.createElement("div");
    row.className = "agent-row";
    const badgeNode = document.createElement("div");
    badgeNode.className = "agent-badge";
    badgeNode.textContent = badge;
    const copy = document.createElement("div");
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    const bodyNode = document.createElement("p");
    bodyNode.textContent = body;
    copy.append(titleNode, bodyNode);
    const stateNode = document.createElement("div");
    stateNode.className = "agent-state";
    stateNode.textContent = state;
    row.append(badgeNode, copy, stateNode);
    els.agentQueue.append(row);
  });
}

function renderShowcase() {
  if (!els.showcaseGrid) return;
  const baseUrl = model.bootstrap?.base_url || window.location.origin;
  const device = summarizeHardware(model.ops?.hardware);
  els.showcaseGrid.innerHTML = "";
  els.showcaseGrid.append(
    renderInfoCard("showcase-card", "Device", "现场设备", device),
    renderInfoCard("showcase-card", "Display", "眼镜端 HUD", "观众看展墙，操作者在右侧控制台推进。"),
    renderInfoCard("showcase-card", "Network", isLoopback(baseUrl) ? "Localhost" : "LAN Ready", baseUrl, { wide: true }),
    renderInfoCard("showcase-card", "Narrative", "90 秒闭环", "读取记忆、寻找年份、触发服务动作、写回时间胶囊。", { wide: true })
  );
}

function summarizeHardware(hardware) {
  const devices = Array.isArray(hardware?.devices) ? hardware.devices : [];
  if (!devices.length) return "未记录";
  return devices.map((device) => `${device.product_name || device.model} x${device.quantity || 1}`).join(" + ");
}

function summarizeAcceptance(acceptance) {
  if (!acceptance) return "n/a";
  return `${acceptance.initial_state || "entered"} / ${acceptance.initial_beacons ?? "?"} beacons -> ${acceptance.completed_state || "complete"} / ${acceptance.completed_steps ?? "?"} steps`;
}

function renderOps(status = model.ops, bootstrap = model.bootstrap, errors = {}) {
  if (!els.opsGrid) return;
  els.opsGrid.innerHTML = "";

  const health = status?.health || {};
  const packages = status?.packages || {};
  const mainPackage = packages.main_package;
  const serverPackage = packages.server_package;
  const monitor = status?.ops_monitor;
  const process = status?.ops_monitor_process;
  const hardware = status?.hardware;
  const warnings = [
    ...(status?.release_index?.warnings || []),
    ...(status?.env_doctor?.warnings || [])
  ];
  const baseUrl = bootstrap?.base_url || window.location.origin;
  const lanTone = isLoopback(baseUrl) ? "warn" : "good";
  const ai = bootstrap?.ai || {};

  const cards = [
    renderOpsItem("API", health.demo_ready ? "online" : errors.ops ? errors.ops.message : "checking", health.demo_ready ? "good" : errors.ops ? "bad" : "warn"),
    renderOpsItem("Mission", `${health.mission_state || model.runtime?.mission_state || "n/a"} · ${health.beacon_count ?? model.space?.beacons?.length ?? 0} beacons`, health.demo_ready ? "good" : "warn"),
    renderOpsItem("Hardware", `${hardware?.fit === "fit" ? "fit" : "pending"} · ${summarizeHardware(hardware)}`, hardware?.fit === "fit" ? "good" : "warn", { wide: true }),
    renderOpsItem("Borrow Deadline", hardware?.borrow_deadline || "n/a", hardware?.borrow_deadline ? "neutral" : "warn"),
    renderOpsItem("Base URL", baseUrl, lanTone),
    renderOpsItem("AI Contract", `${ai.output_schema_title || "InnerWorld HUD AI Output"}\n${endpointUrl(ai.output_schema_url || "/api/ai/schema")}`, ai.output_schema_title ? "good" : "warn", { wide: true }),
    renderOpsItem("HUD Route", endpointUrl(bootstrap?.endpoints?.ai_hud || "/api/ai/hud"), bootstrap?.endpoints?.ai_hud ? "good" : "warn", { wide: true }),
    renderOpsItem("Acceptance", summarizeAcceptance(bootstrap?.acceptance), bootstrap?.acceptance ? "good" : "warn", { wide: true }),
    renderOpsItem("Main Package", `${fileName(mainPackage?.path)} ${shortHash(mainPackage?.sha256)}`, mainPackage?.exists ? "good" : "warn"),
    renderOpsItem("Server Package", `${fileName(serverPackage?.path)} ${shortHash(serverPackage?.sha256)}`, serverPackage?.exists ? "good" : "warn"),
    renderOpsItem("Deploy Dry Run", status?.deploy_dry_run?.ok ? "passed" : "pending", status?.deploy_dry_run?.ok ? "good" : "warn"),
    renderOpsItem("Ops Guard", monitor?.ok ? `C ${monitor.c_free_gb_after ?? "n/a"}GB` : process?.running ? `PID ${process.process_id}` : "not running", monitor?.ok || process?.running ? "good" : "warn"),
    renderOpsItem("Warnings", String(warnings.length), warnings.length ? "warn" : "good")
  ];

  if (errors.bootstrap) {
    cards.push(renderOpsItem("Bootstrap Error", errors.bootstrap.message, "bad", { wide: true }));
  }

  els.opsGrid.append(...cards);
  els.connectionPill.textContent = health.demo_ready ? "Space Server online" : "Local fallback";
  els.connectionPill.className = `status-pill ${health.demo_ready ? "good" : "warn"}`;
  renderStageMetrics();
  renderLensPanel();
  renderProductModules();
  renderEvidenceChain();
  renderShowcase();
  renderRiskGuardrails();
  renderHardwareRuntime();
}

async function refreshDeviceRuntime() {
  const [manifestResult, sessionsResult, storeResult, catalogResult] = await Promise.allSettled([
    api.getDeviceManifest(),
    api.getDeviceSessions(),
    api.getStoreStatus(),
    api.getDatasetCatalog()
  ]);

  if (manifestResult.status === "fulfilled") model.deviceManifest = manifestResult.value;
  if (sessionsResult.status === "fulfilled") model.deviceSessions = sessionsResult.value;
  if (storeResult.status === "fulfilled") model.store = storeResult.value;
  if (catalogResult.status === "fulfilled") model.datasetCatalog = catalogResult.value;
  renderHardwareRuntime();
  renderLog();
}

async function registerSimulatedDevice() {
  if (!model.deviceManifest) {
    model.deviceManifest = await api.getDeviceManifest();
  }
  model.deviceSession = await api.registerDevice(simulatedDevicePayload());
  await refreshDeviceRuntime();
}

async function sendSimulatedHeartbeat() {
  if (!model.deviceSession?.session_id) {
    await registerSimulatedDevice();
  }
  model.deviceLastHeartbeat = await api.sendDeviceHeartbeat(simulatedHeartbeatPayload());
  await refreshDeviceRuntime();
}

async function refreshOps() {
  const [opsResult, bootstrapResult, manifestResult, sessionsResult, storeResult, catalogResult] = await Promise.allSettled([
    api.getOpsStatus(),
    api.getDeviceBootstrap(),
    api.getDeviceManifest(),
    api.getDeviceSessions(),
    api.getStoreStatus(),
    api.getDatasetCatalog()
  ]);

  model.ops = opsResult.status === "fulfilled" ? opsResult.value : null;
  model.bootstrap = bootstrapResult.status === "fulfilled" ? bootstrapResult.value : null;
  model.deviceManifest = manifestResult.status === "fulfilled" ? manifestResult.value : model.deviceManifest;
  model.deviceSessions = sessionsResult.status === "fulfilled" ? sessionsResult.value : model.deviceSessions;
  model.store = storeResult.status === "fulfilled" ? storeResult.value : model.store;
  model.datasetCatalog = catalogResult.status === "fulfilled" ? catalogResult.value : model.datasetCatalog;
  renderOps(model.ops, model.bootstrap, {
    ops: opsResult.status === "rejected" ? opsResult.reason : null,
    bootstrap: bootstrapResult.status === "rejected" ? bootstrapResult.reason : null
  });
}

function renderLog() {
  if (!els.log) return;
  const payload = {
    active_user: model.activeUser,
    selected_anchor: model.currentAnchor,
    mission_state: model.runtime?.mission_state,
    current_step: activeStep()?.step_id || null,
    beacons: model.space?.beacons?.length || 0,
    ai_hud: model.hudByAnchor.get(model.currentAnchor) || null,
    hardware: model.ops?.hardware ? {
      fit: model.ops.hardware.fit,
      borrow_deadline: model.ops.hardware.borrow_deadline
    } : null,
    store: model.store ? {
      engine: model.store.engine,
      datasets: model.store.datasets,
      device_sessions: model.store.device_sessions
    } : null,
    device_runtime: model.deviceSessions ? {
      storage: model.deviceSessions.storage,
      total: model.deviceSessions.total,
      smoke: model.deviceSessions.smoke_test_summary
    } : null
  };
  els.log.textContent = JSON.stringify(payload, null, 2);
}

function resetHudCache() {
  model.hudRequestId += 1;
  model.hudByAnchor.clear();
  model.hudErrors.clear();
}

async function refresh(options = {}) {
  model.space = await api.getSpace();
  model.runtime = model.space.runtime || model.runtime || {};
  model.activeUser = model.runtime.active_user || model.activeUser;
  model.currentAnchor = normalizeAnchorId(options.anchorId || model.currentAnchor || entryAnchorId());

  if (els.spaceName) {
    els.spaceName.textContent = model.space.name || "校园记忆展墙";
  }

  if (options.resetHud !== false) {
    resetHudCache();
  }

  renderAnchors();
  renderSteps();
  renderHud();
  renderRouteMap();
  renderStageMetrics();
  renderLensPanel();
  renderProductModules();
  renderAgentQueue();
  renderEvidenceChain();
  renderShowcase();
  renderDeliveryScript();
  renderRiskGuardrails();
  renderHardwareRuntime();
  await refreshOps();
  requestAiHud(model.currentAnchor);
}

function renderOffline(error) {
  const message = error?.message || "Space Server 未连接";
  els.connectionPill.textContent = "offline";
  els.connectionPill.className = "status-pill warn";
  els.hudAnchor.textContent = "连接异常";
  els.hudHintLevel.textContent = "operator action";
  els.hudTitle.textContent = "本地服务未就绪";
  els.hudBody.textContent = message;
  els.hudMeta.innerHTML = "";
  renderMetaPill("run npm run dev");
  els.log.textContent = JSON.stringify({ ok: false, error: message }, null, 2);
  renderOps(null, null, { ops: error, bootstrap: error });
}

async function completeCurrentStep() {
  const step = activeStep();
  if (!step) return;
  setCurrentAnchor(step.anchor_id, { skipAi: true });
  await api.interact({
    user_id: model.activeUser,
    step_id: step.step_id,
    mission_state: step.step_id === "write_back" ? "writing" : "doing"
  });
  await refresh({ anchorId: step.anchor_id });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function autoRun() {
  if (model.autoRunning) return;
  model.autoRunning = true;
  els.autoBtn.textContent = "彩排中";
  try {
    await api.reset();
    model.activeUser = "A";
    await refresh({ anchorId: entryAnchorId() });
    await sleep(550);

    setCurrentAnchor(memoryAnchorId());
    await sleep(650);
    await api.interact({ user_id: "A", step_id: "read", mission_state: "reading" });
    await refresh({ anchorId: memoryAnchorId() });
    await sleep(650);

    await api.interact({ user_id: "A", step_id: "find_year", mission_state: "doing" });
    await refresh({ anchorId: memoryAnchorId() });
    await sleep(650);

    await api.serviceAction({ user_id: "A", action_id: "JOIN_EVENT_1430", label: "加入 14:30 体验活动" });
    await refresh({ anchorId: entryAnchorId() });
    await sleep(650);

    await api.writeBack({
      user_id: "A",
      anchor_id: writeAnchorId(),
      title: "后来者留言",
      text: els.writeText.value || WRITE_BACK_DEFAULT
    });
    await refresh({ anchorId: writeAnchorId() });
    await sleep(650);

    model.activeUser = "B";
    await api.interact({ user_id: "B", mission_state: "complete" });
    await refresh({ anchorId: writeAnchorId() });
  } finally {
    model.autoRunning = false;
    els.autoBtn.textContent = "90 秒彩排";
  }
}

els.anchorLayer?.addEventListener("click", (event) => {
  const button = event.target.closest(".anchor");
  if (!button || !els.anchorLayer.contains(button)) return;
  setCurrentAnchor(button.dataset.anchor);
});

document.querySelector("#nextBtn")?.addEventListener("click", runAction(completeCurrentStep));
document.querySelector("#autoBtn")?.addEventListener("click", runAction(autoRun));
document.querySelector("#opsRefreshBtn")?.addEventListener("click", runAction(refreshOps));
els.panelToggleBtn?.addEventListener("click", () => {
  const shell = document.querySelector(".app-shell");
  setPanelCollapsed(!shell?.classList.contains("panel-collapsed"));
});

document.querySelector("#serviceBtn")?.addEventListener("click", runAction(async () => {
  await api.serviceAction({ user_id: model.activeUser, action_id: "JOIN_EVENT_1430", label: "加入 14:30 体验活动" });
  await refresh({ anchorId: entryAnchorId() });
}));

document.querySelector("#writeBtn")?.addEventListener("click", runAction(async () => {
  await api.writeBack({
    user_id: model.activeUser,
    anchor_id: writeAnchorId(),
    title: "后来者留言",
    text: els.writeText.value || WRITE_BACK_DEFAULT
  });
  await refresh({ anchorId: writeAnchorId() });
}));

document.querySelector("#switchUserBtn")?.addEventListener("click", runAction(async () => {
  model.activeUser = model.activeUser === "A" ? "B" : "A";
  await api.interact({ user_id: model.activeUser, mission_state: model.runtime?.mission_state || "entered" });
  await refresh({ anchorId: model.currentAnchor, resetHud: true });
}));

document.querySelector("#resetBtn")?.addEventListener("click", runAction(async () => {
  await api.reset();
  model.activeUser = "A";
  await refresh({ anchorId: entryAnchorId() });
}));

els.writeText?.addEventListener("input", () => {
  if (model.currentAnchor === writeAnchorId()) {
    requestAiHud(model.currentAnchor);
  }
});

window.addEventListener("resize", () => {
  const shell = document.querySelector(".app-shell");
  if (!shell || model.panelCollapsed) return;
  const width = panelOpenWidth();
  model.panelAnimation.width = width;
  model.panelAnimation.velocity = 0;
  shell.style.setProperty("--panel-current-width", `${width.toFixed(1)}px`);
});

try {
  const shell = document.querySelector(".app-shell");
  if (shell) {
    model.panelAnimation.width = panelOpenWidth();
    shell.style.setProperty("--panel-current-width", `${model.panelAnimation.width.toFixed(1)}px`);
  }
  await refresh({ anchorId: entryAnchorId() });
  window.setInterval(refreshOps, 15000);
} catch (error) {
  renderOffline(error);
}
