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
  ".evidence-rail",
  ".delivery-timeline",
  ".risk-grid",
  ".ops-grid"
];

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

  const missingContainers = requiredContainers.filter((selector) => {
    const className = selector.startsWith(".") ? selector.slice(1) : selector;
    return !includesAny(sources.combined, [className]);
  });
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
    { name: "dynamic evidence chain rendering", ok: sources.js.includes("renderEvidenceChain") },
    { name: "dynamic delivery script rendering", ok: sources.js.includes("renderDeliveryScript") },
    { name: "dynamic risk guardrail rendering", ok: sources.js.includes("renderRiskGuardrails") },
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

async function browserSnapshot(page) {
  return page.evaluate(({ requiredModules, requiredContainers }) => {
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
    const containerResults = requiredContainers.map((selector) => {
      const nodes = [...document.querySelectorAll(selector)];
      const visible = nodes.some((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
      return { selector, count: nodes.length, visible };
    });
    const scrollingElement = document.scrollingElement || document.documentElement;
    const maxRight = Math.max(
      scrollingElement.scrollWidth,
      document.body?.scrollWidth || 0,
      document.documentElement.scrollWidth || 0
    );
    const panelSections = [...document.querySelectorAll(".operator-panel > .panel-section")].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        label: node.querySelector(".section-head p")?.textContent?.trim() || node.className,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    });
    const stageContainers = [".spatial-stage", ".operator-panel", ".hud-surface", ".spatial-stack"]
      .flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return {
          label: selector,
          visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none",
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        };
      }));
    return {
      title: document.title,
      moduleResults,
      containerResults,
      horizontalOverflowPx: Math.max(0, maxRight - window.innerWidth),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      panelSections,
      stageContainers
    };
  }, { requiredModules, requiredContainers });
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
  const visiblePanels = panelSections.map((rect) => ({ ...rect, visible: true }));
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

async function runBrowserGate(playwright) {
  let localServer = null;
  const baseUrl = process.env.BASE_URL || (localServer = await startLocalServer()).baseUrl;
  const browser = await playwright.chromium.launch({ headless: true });
  const viewportSummaries = [];
  const errors = [];

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
      const snapshot = await browserSnapshot(page);
      const missingModules = snapshot.moduleResults.filter((module) => !module.ok).map((module) => module.name);
      const missingContainers = snapshot.containerResults
        .filter((item) => item.count === 0 || !item.visible)
        .map((item) => item.selector);
      const panelOverlaps = findPanelOverlaps(snapshot.panelSections);
      const stageOverlaps = findStageOverlaps(snapshot.stageContainers, viewport.name);

      if (consoleErrors.length) errors.push(`${viewport.name} console errors: ${consoleErrors.join(" | ")}`);
      if (pageErrors.length) errors.push(`${viewport.name} page errors: ${pageErrors.join(" | ")}`);
      if (snapshot.horizontalOverflowPx > 2) errors.push(`${viewport.name} horizontal overflow: ${snapshot.horizontalOverflowPx}px`);
      if (missingModules.length) errors.push(`${viewport.name} missing modules: ${missingModules.join(", ")}`);
      if (missingContainers.length) errors.push(`${viewport.name} missing/hidden containers: ${missingContainers.join(", ")}`);
      if (panelOverlaps.length) errors.push(...panelOverlaps);
      if (stageOverlaps.length) errors.push(...stageOverlaps);

      viewportSummaries.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        console_errors: consoleErrors.length,
        page_errors: pageErrors.length,
        horizontal_overflow_px: snapshot.horizontalOverflowPx,
        missing_modules: missingModules,
        missing_containers: missingContainers,
        panel_overlaps: panelOverlaps,
        stage_overlaps: stageOverlaps
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
    css_checks: result.css_checks,
    js_checks: result.js_checks
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
