import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const webDir = path.join(rootDir, "apps", "web-demo");
const files = {
  html: path.join(webDir, "index.html"),
  css: path.join(webDir, "styles.css"),
  js: path.join(webDir, "app.js")
};

const viewports = [
  { name: "desktop", width: 1440, height: 980 },
  { name: "mobile", width: 390, height: 844 }
];

const requiredModules = [
  {
    name: "Spatial Stage",
    needles: ["Spatial Stage", "spatial-stage", "stage-frame", "wall-scene"]
  },
  {
    name: "Operator Console",
    needles: ["Operator Console", "operator-panel", "command-center"]
  },
  {
    name: "Mission Flow",
    needles: ["Mission Flow", "workflow-section", "stepper"]
  },
  {
    name: "Product System",
    needles: ["Product System", "product-section", "productGrid", "product-grid"]
  },
  {
    name: "Agent Runtime",
    needles: ["Agent Runtime", "agent-section", "agentQueue", "agent-queue"]
  },
  {
    name: "Show Mode",
    needles: ["Show Mode", "showcase-section", "showcaseGrid", "showcase-grid"]
  },
  {
    name: "Device / Release",
    needles: ["Device / Release", "ops-section", "opsGrid", "ops-grid"]
  },
  {
    name: "Agent Trace",
    needles: ["Agent Trace", "telemetry-section", "id=\"log\"", "#log"]
  },
  {
    name: "Spatial Navigation",
    needles: [
      "Spatial Navigation",
      "space navigation",
      "spatial-nav",
      "Spatial Route",
      "routeGrid",
      "route-grid",
      "route-rail",
      "anchor-layer",
      "\u7a7a\u95f4\u5bfc\u822a"
    ]
  },
  {
    name: "Lens / Camera Status",
    needles: [
      "Lens Status",
      "Camera Status",
      "camera-state",
      "lens-state",
      "Rokid Lens",
      "lensGrid",
      "lens-grid",
      "stageMetrics",
      "stage-telemetry",
      "hud-surface",
      "hudHintLevel",
      "\u955c\u5934\u72b6\u6001"
    ]
  },
  {
    name: "Evidence Chain",
    needles: [
      "Evidence Chain",
      "evidence-chain",
      "evidenceRail",
      "evidence-rail",
      "telemetry-section",
      "Agent Trace",
      "ai_hud",
      "\u8bc1\u636e\u94fe"
    ]
  },
  {
    name: "Delivery Script",
    needles: [
      "Delivery Script",
      "delivery-script",
      "deliveryTimeline",
      "delivery-timeline",
      "handoff-script",
      "runbook",
      "Narrative",
      "showcase-section",
      "\u4ea4\u4ed8\u5267\u672c"
    ]
  },
  {
    name: "Risk Guardrails",
    needles: [
      "Risk Guardrail",
      "Risk Guardrails",
      "risk-guardrail",
      "riskGrid",
      "risk-grid",
      "guardrail",
      "Review Gate",
      "writeback-section",
      "write_back_review",
      "\u98ce\u9669\u62a4\u680f"
    ]
  },
  {
    name: "Hardware Runtime",
    needles: [
      "Hardware Runtime",
      "hardwareGrid",
      "hardware-grid",
      "device_manifest",
      "\u786c\u4ef6\u63a5\u5165"
    ]
  },
  {
    name: "Mission Ledger",
    needles: [
      "Mission Ledger",
      "Ledger / Audit",
      "ledgerGrid",
      "ledger-grid",
      "renderLedgerAudit",
      "/api/ledger/summary",
      "/api/ledger/events"
    ]
  }
];

const requiredControls = [
  "#nextBtn",
  "#autoBtn",
  "#serviceBtn",
  "#writeBtn",
  "#switchUserBtn",
  "#resetBtn",
  "#opsRefreshBtn"
];

const requiredContainers = [
  ".app-shell",
  ".spatial-stage",
  ".stage-frame",
  ".wall-scene",
  ".hud-surface",
  ".operator-panel",
  ".panel-section",
  ".product-grid",
  ".agent-queue",
  ".showcase-grid",
  ".route-grid",
  ".lens-grid",
  ".ledger-grid",
  ".hardware-grid",
  ".evidence-rail",
  ".delivery-timeline",
  ".risk-grid",
  ".ops-grid"
];

const requiredContainerGroups = [
  { name: ".app-shell", selectors: [".app-shell"] },
  { name: ".spatial-stage", selectors: [".spatial-stage"] },
  { name: ".stage-frame", selectors: [".stage-frame"] },
  { name: ".wall-scene", selectors: [".wall-scene"] },
  { name: ".hud-surface", selectors: [".hud-surface"] },
  {
    name: ".operator-panel",
    selectors: [
      ".operator-panel",
      ".operator-dock",
      ".operator-sidebar",
      ".control-dock",
      ".control-sidebar",
      ".demo-sidebar",
      ".side-panel",
      ".sidebar"
    ]
  },
  {
    name: ".panel-section",
    selectors: [
      ".panel-section",
      ".operator-section",
      ".dock-section",
      ".sidebar-section",
      ".console-section"
    ]
  },
  { name: ".product-grid", selectors: [".product-grid"] },
  { name: ".agent-queue", selectors: [".agent-queue"] },
  { name: ".showcase-grid", selectors: [".showcase-grid"] },
  { name: ".route-grid", selectors: [".route-grid"] },
  { name: ".lens-grid", selectors: [".lens-grid"] },
  { name: ".ledger-grid", selectors: [".ledger-grid"] },
  { name: ".evidence-rail", selectors: [".evidence-rail"] },
  { name: ".delivery-timeline", selectors: [".delivery-timeline"] },
  { name: ".risk-grid", selectors: [".risk-grid"] },
  { name: ".ops-grid", selectors: [".ops-grid"] }
];

const stageAnchorBlockerSelectors = [".hud-surface", ".stage-telemetry", ".spatial-stack"];

function assert(condition, message, detail = {}) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ");
}

function includesAny(haystack, needles) {
  const text = normalize(haystack).toLowerCase();
  return needles.some((needle) => text.includes(String(needle).toLowerCase()));
}

function selectorNeedle(selector) {
  if (selector.startsWith(".")) return `class="${selector.slice(1)}`;
  if (selector.startsWith("#")) return `id="${selector.slice(1)}"`;
  return selector;
}

function asSummary(ok, payload = {}) {
  return {
    ok,
    check: "web-demo",
    ...payload
  };
}

async function readSources() {
  const [html, css, js] = await Promise.all([
    readFile(files.html, "utf8"),
    readFile(files.css, "utf8"),
    readFile(files.js, "utf8")
  ]);
  return { html, css, js, combined: `${html}\n${css}\n${js}` };
}

function checkModules(combined) {
  return requiredModules.map((module) => {
    const matched = module.needles.find((needle) => includesAny(combined, [needle]));
    return {
      name: module.name,
      ok: Boolean(matched),
      matched: matched || null
    };
  });
}

function checkStaticSources(sources) {
  const errors = [];
  const moduleResults = checkModules(sources.combined);
  const missingModules = moduleResults.filter((module) => !module.ok).map((module) => module.name);

  if (missingModules.length) {
    errors.push(`Missing required web modules: ${missingModules.join(", ")}`);
  }

  const missingControls = requiredControls.filter((selector) => !includesAny(sources.html, [selectorNeedle(selector)]));
  if (missingControls.length) {
    errors.push(`Missing required operator controls: ${missingControls.join(", ")}`);
  }

  const containerResults = requiredContainerGroups.map((group) => {
    const matched = group.selectors.find((selector) => {
      const className = selector.startsWith(".") ? selector.slice(1) : selector;
      return includesAny(sources.combined, [className]);
    });
    return {
      name: group.name,
      ok: Boolean(matched),
      matched: matched || null,
      selectors: group.selectors
    };
  });
  const missingContainers = containerResults.filter((group) => !group.ok).map((group) => group.name);
  if (missingContainers.length) {
    errors.push(`Missing required layout containers: ${missingContainers.join(", ")}`);
  }

  const cssChecks = [
    {
      name: "global border-box sizing",
      ok: /\*\s*\{[\s\S]*box-sizing\s*:\s*border-box/i.test(sources.css)
    },
    {
      name: "320px minimum viewport support",
      ok: /min-width\s*:\s*320px/i.test(sources.css)
    },
    {
      name: "responsive desktop-to-single-column breakpoint",
      ok: /@media\s*\([^)]*max-width\s*:\s*(?:9[0-9]{2}|10[0-9]{2})px[^)]*\)[\s\S]*\.app-shell\s*\{[\s\S]*grid-template-columns\s*:\s*1fr/i.test(sources.css)
    },
    {
      name: "mobile breakpoint",
      ok: /@media\s*\([^)]*max-width\s*:\s*(?:6[0-9]{2}|7[0-9]{2}|8[0-9]{2})px[^)]*\)/i.test(sources.css)
    },
    {
      name: "grid/flex layout primitives",
      ok: /display\s*:\s*grid/i.test(sources.css) && /display\s*:\s*flex/i.test(sources.css)
    },
    {
      name: "overflow-safe text wrapping",
      ok: /overflow-wrap\s*:\s*(?:anywhere|break-word)/i.test(sources.css) || /word-break\s*:\s*break-word/i.test(sources.css)
    },
    {
      name: "narrow column overflow guard",
      ok: /minmax\(0,\s*1fr\)/i.test(sources.css) || /min-width\s*:\s*0/i.test(sources.css)
    },
    {
      name: "operator panel scroll containment",
      ok: /\.operator-panel\s*\{[\s\S]*overflow-y\s*:\s*auto/i.test(sources.css) || /\.operator-panel\s*\{[\s\S]*overflow\s*:\s*(?:auto|visible)/i.test(sources.css)
    }
  ];

  const failedCssChecks = cssChecks.filter((check) => !check.ok).map((check) => check.name);
  if (failedCssChecks.length) {
    errors.push(`Missing responsive/layout CSS safeguards: ${failedCssChecks.join(", ")}`);
  }

  const jsChecks = [
    { name: "space API load", ok: sources.js.includes("/api/spaces/") },
    { name: "AI HUD route", ok: sources.js.includes("/api/ai/hud") },
    { name: "ops status route", ok: sources.js.includes("/api/ops/status") },
    { name: "dynamic product module rendering", ok: sources.js.includes("renderProductModules") },
    { name: "dynamic route map rendering", ok: sources.js.includes("renderRouteMap") },
    { name: "dynamic lens panel rendering", ok: sources.js.includes("renderLensPanel") },
    { name: "dynamic ledger audit rendering", ok: sources.js.includes("renderLedgerAudit") },
    { name: "ledger summary route", ok: sources.js.includes("/api/ledger/summary") },
    { name: "ledger events route", ok: sources.js.includes("/api/ledger/events") },
    { name: "dynamic evidence chain rendering", ok: sources.js.includes("renderEvidenceChain") },
    { name: "dynamic delivery script rendering", ok: sources.js.includes("renderDeliveryScript") },
    { name: "dynamic risk guardrail rendering", ok: sources.js.includes("renderRiskGuardrails") },
    { name: "dynamic hardware runtime rendering", ok: sources.js.includes("renderHardwareRuntime") },
    { name: "dynamic agent trace/log rendering", ok: sources.js.includes("renderLog") }
  ];

  const failedJsChecks = jsChecks.filter((check) => !check.ok).map((check) => check.name);
  if (failedJsChecks.length) {
    errors.push(`Missing app runtime hooks: ${failedJsChecks.join(", ")}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    modules: moduleResults,
    controls: requiredControls,
    containers: requiredContainers,
    container_groups: containerResults,
    css_checks: cssChecks,
    js_checks: jsChecks
  };
}

async function findOpenPort(startPort) {
  for (let port = startPort; port < startPort + 40; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error(`No open port found from ${startPort} to ${startPort + 39}`);
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForUrl(url, timeoutMs = 12000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

async function startLocalServer() {
  const port = await findOpenPort(Number(process.env.PORT || 5177));
  const child = spawn(process.execPath, [path.join(rootDir, "server", "space-server", "index.js")], {
    cwd: rootDir,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stderr = [];
  const stdout = [];
  child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
  const baseUrl = `http://127.0.0.1:${port}/`;

  try {
    await waitForUrl(baseUrl);
  } catch (error) {
    child.kill();
    error.detail = {
      stdout: stdout.join("").trim(),
      stderr: stderr.join("").trim()
    };
    throw error;
  }

  return {
    baseUrl,
    close: () => {
      if (!child.killed) child.kill();
    }
  };
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    try {
      return await import("playwright-core");
    } catch {
      return null;
    }
  }
}

function rectsOverlap(a, b, tolerance = 2) {
  return a.left < b.right - tolerance &&
    a.right > b.left + tolerance &&
    a.top < b.bottom - tolerance &&
    a.bottom > b.top + tolerance;
}

function overlapMetrics(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return {
    width: Math.round(width),
    height: Math.round(height),
    area: Math.round(width * height)
  };
}

async function browserSnapshot(page) {
  return page.evaluate(({ requiredModules, requiredContainerGroups, stageAnchorBlockerSelectors }) => {
    window.scrollTo(0, 0);

    const isVisible = (node, rect = node.getBoundingClientRect()) => {
      const style = window.getComputedStyle(node);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        style.opacity !== "0";
    };
    const rectFor = (node, label, extra = {}) => {
      const rect = node.getBoundingClientRect();
      return {
        label,
        visible: isVisible(node, rect),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        ...extra
      };
    };
    const queryMany = (selectors) => {
      const seen = new Set();
      const matches = [];
      for (const selector of selectors) {
        for (const node of document.querySelectorAll(selector)) {
          if (seen.has(node)) continue;
          seen.add(node);
          matches.push({ selector, node });
        }
      }
      return matches;
    };
    const allText = document.body?.innerText || "";
    const allStructure = [...document.querySelectorAll("[id], [class], [aria-label]")]
      .map((node) => `${node.id || ""} ${node.className || ""} ${node.getAttribute("aria-label") || ""}`)
      .join(" ");
    const combined = `${allText} ${allStructure}`;
    const lower = combined.toLowerCase();
    const moduleResults = requiredModules.map((module) => {
      const matched = module.needles.find((needle) => lower.includes(String(needle).toLowerCase()));
      return { name: module.name, ok: Boolean(matched), matched: matched || null };
    });
    const containerResults = requiredContainerGroups.map((group) => {
      const nodes = queryMany(group.selectors);
      const visibleSelectors = nodes
        .filter(({ node }) => isVisible(node))
        .map(({ selector }) => selector);
      return {
        name: group.name,
        selectors: group.selectors,
        count: nodes.length,
        visible: visibleSelectors.length > 0,
        matched_selectors: [...new Set(nodes.map(({ selector }) => selector))],
        visible_selectors: [...new Set(visibleSelectors)]
      };
    });
    const scrollingElement = document.scrollingElement || document.documentElement;
    const maxRight = Math.max(
      scrollingElement.scrollWidth,
      document.body?.scrollWidth || 0,
      document.documentElement.scrollWidth || 0
    );
    const visibleRects = [...document.body.querySelectorAll("*")]
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const maxElementRight = Math.max(window.innerWidth, ...visibleRects.map((rect) => rect.right));
    const minElementLeft = Math.min(0, ...visibleRects.map((rect) => rect.left));
    const operatorContainers = queryMany([
      ".operator-panel",
      ".operator-dock",
      ".operator-sidebar",
      ".control-dock",
      ".control-sidebar",
      ".demo-sidebar",
      ".side-panel",
      ".sidebar"
    ]);
    const operatorSectionSelector = [
      ".panel-section",
      ".operator-section",
      ".dock-section",
      ".sidebar-section",
      ".console-section"
    ].join(", ");
    const panelSections = operatorContainers.flatMap(({ selector: containerSelector, node: container }, containerIndex) => {
      return [...container.querySelectorAll(operatorSectionSelector)].map((node, sectionIndex) => {
        return rectFor(
          node,
          node.querySelector(".section-head p, h2, h3, [data-section-title]")?.textContent?.trim() ||
            `${containerSelector} section ${sectionIndex + 1}`,
          {
            container: containerSelector,
            container_index: containerIndex
          }
        );
      });
    });
    const stageContainers = [".spatial-stage", ".operator-panel", ".hud-surface", ".spatial-stack", ".stage-telemetry"]
      .flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => rectFor(node, selector)));
    const stageAnchorBlockers = stageAnchorBlockerSelectors
      .flatMap((selector) => [...document.querySelectorAll(selector)].map((node, index) => {
        return rectFor(node, selector, { selector, index });
      }));
    const stageAnchors = [...document.querySelectorAll(".anchor")].map((node, index) => {
      const anchorId = node.getAttribute("data-anchor-id") || node.getAttribute("data-anchor") || node.textContent?.trim() || "";
      return rectFor(node, `.anchor${anchorId ? `[${anchorId}]` : `:${index + 1}`}`, {
        selector: ".anchor",
        index,
        anchor_id: anchorId || null
      });
    });
    return {
      title: document.title,
      moduleResults,
      containerResults,
      horizontalOverflowPx: Math.ceil(Math.max(0, maxRight - window.innerWidth, maxElementRight - window.innerWidth, -minElementLeft)),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      panelSections,
      stageContainers,
      stageAnchorBlockers,
      stageAnchors
    };
  }, { requiredModules, requiredContainerGroups, stageAnchorBlockerSelectors });
}

function findOverlaps(rects, label) {
  const overlaps = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      if (a.visible === false || b.visible === false) continue;
      if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) continue;
      if (rectsOverlap(a, b)) {
        overlaps.push(`${label}: ${a.label} overlaps ${b.label}`);
      }
    }
  }
  return overlaps;
}

function findPanelOverlaps(panelSections) {
  const visiblePanels = panelSections.filter((rect) => rect.visible);
  return findOverlaps(visiblePanels, "operator-panel sections");
}

function findStageOverlaps(stageContainers, viewportName) {
  const visible = stageContainers.filter((rect) => rect.visible);
  const pairs = [];
  const stage = visible.find((rect) => rect.label === ".spatial-stage");
  const panel = visible.find((rect) => rect.label === ".operator-panel");
  const hud = visible.find((rect) => rect.label === ".hud-surface");
  const stack = visible.find((rect) => rect.label === ".spatial-stack");

  if (stage && panel && rectsOverlap(stage, panel)) {
    pairs.push(`${viewportName}: .spatial-stage overlaps .operator-panel`);
  }
  if (hud && stack && rectsOverlap(hud, stack)) {
    pairs.push(`${viewportName}: .hud-surface overlaps .spatial-stack`);
  }
  return pairs;
}

function findStageAnchorOverlaps(stageAnchorBlockers, stageAnchors, viewportName, scenarioName) {
  const overlaps = [];
  const visibleBlockers = stageAnchorBlockers.filter((rect) => rect.visible);
  const visibleAnchors = stageAnchors.filter((rect) => rect.visible);

  for (const blocker of visibleBlockers) {
    for (const anchor of visibleAnchors) {
      if (!rectsOverlap(blocker, anchor)) continue;
      const overlap = overlapMetrics(blocker, anchor);
      overlaps.push({
        viewport: viewportName,
        scenario: scenarioName,
        blocker: blocker.label,
        blocker_index: blocker.index,
        anchor: anchor.label,
        anchor_id: anchor.anchor_id,
        overlap_px: overlap
      });
    }
  }

  return overlaps;
}

function formatStageAnchorOverlap(overlap) {
  return `${overlap.viewport} ${overlap.scenario}: ${overlap.blocker} overlaps ${overlap.anchor} (${overlap.overlap_px.width}x${overlap.overlap_px.height}px)`;
}

async function runBrowserGate(playwright) {
  let localServer = null;
  const baseUrl = process.env.BASE_URL || (localServer = await startLocalServer()).baseUrl;
  const browser = await playwright.chromium.launch({ headless: true });
  const viewportSummaries = [];
  const errors = [];
  const reportedErrors = new Set();
  const stageAnchorOverlaps = [];
  const addError = (message) => {
    if (!reportedErrors.has(message)) {
      reportedErrors.add(message);
      errors.push(message);
    }
  };

  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(250);
      const scenarioSummaries = [];

      const recordScenario = async (scenarioName) => {
        const snapshot = await browserSnapshot(page);
        const missingModules = snapshot.moduleResults.filter((module) => !module.ok).map((module) => module.name);
        const missingContainers = snapshot.containerResults
          .filter((item) => item.count === 0 || !item.visible)
          .map((item) => item.name);
        const panelOverlaps = findPanelOverlaps(snapshot.panelSections)
          .map((message) => `${viewport.name} ${scenarioName}: ${message}`);
        const stageOverlaps = findStageOverlaps(snapshot.stageContainers, `${viewport.name} ${scenarioName}`);
        const currentStageAnchorOverlaps = findStageAnchorOverlaps(
          snapshot.stageAnchorBlockers,
          snapshot.stageAnchors,
          viewport.name,
          scenarioName
        );

        if (snapshot.horizontalOverflowPx > 2) addError(`${viewport.name} ${scenarioName} horizontal overflow: ${snapshot.horizontalOverflowPx}px`);
        if (missingModules.length) addError(`${viewport.name} ${scenarioName} missing modules: ${missingModules.join(", ")}`);
        if (missingContainers.length) addError(`${viewport.name} ${scenarioName} missing/hidden containers: ${missingContainers.join(", ")}`);
        for (const message of panelOverlaps) addError(message);
        for (const message of stageOverlaps) addError(message);
        for (const overlap of currentStageAnchorOverlaps) addError(formatStageAnchorOverlap(overlap));

        stageAnchorOverlaps.push(...currentStageAnchorOverlaps);
        scenarioSummaries.push({
          name: scenarioName,
          horizontal_overflow_px: snapshot.horizontalOverflowPx,
          missing_modules: missingModules,
          missing_containers: missingContainers,
          panel_overlaps: panelOverlaps,
          stage_overlaps: stageOverlaps,
          stage_anchor_overlaps: currentStageAnchorOverlaps
        });
      };

      await recordScenario("initial");
      const writeButton = await page.$("#writeBtn");
      if (writeButton) {
        try {
          await writeButton.evaluate((button) => button.click());
          await page.waitForTimeout(750);
          await recordScenario("write-back");
        } catch (error) {
          addError(`${viewport.name} write-back scenario failed: ${error.message}`);
        }
      }

      if (consoleErrors.length) addError(`${viewport.name} console errors: ${consoleErrors.join(" | ")}`);
      if (pageErrors.length) addError(`${viewport.name} page errors: ${pageErrors.join(" | ")}`);

      viewportSummaries.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        console_errors: consoleErrors.length,
        page_errors: pageErrors.length,
        scenarios: scenarioSummaries,
        stage_anchor_overlaps: scenarioSummaries.flatMap((scenario) => scenario.stage_anchor_overlaps)
      });
      await page.close();
    }
  } finally {
    await browser.close();
    if (localServer) localServer.close();
  }

  return {
    ok: errors.length === 0,
    mode: "browser",
    base: baseUrl,
    errors,
    viewports: viewportSummaries,
    stage_anchor_overlaps: stageAnchorOverlaps,
    modules: requiredModules.map((module) => module.name)
  };
}

async function runStaticGate() {
  const sources = await readSources();
  const result = checkStaticSources(sources);
  return {
    ok: result.ok,
    mode: "static",
    reason: "Playwright is not installed or not resolvable in this workspace",
    errors: result.errors,
    modules: result.modules,
    controls: result.controls,
    containers: result.containers,
    container_groups: result.container_groups,
    css_checks: result.css_checks,
    js_checks: result.js_checks,
    stage_anchor_overlaps: []
  };
}

async function main() {
  await Promise.all(Object.values(files).map((file) => access(file)));

  const playwright = await loadPlaywright();
  let result;
  if (playwright?.chromium) {
    result = await runBrowserGate(playwright);
  } else {
    result = await runStaticGate();
  }

  const summary = asSummary(result.ok, result);
  if (!result.ok) {
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify(asSummary(false, {
    mode: "setup",
    errors: [error.message],
    detail: error.detail || null
  }), null, 2));
  process.exit(1);
});
