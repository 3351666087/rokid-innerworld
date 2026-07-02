import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEndpointMap, INNERWORLD_SPACE_ID } from "../shared/innerworld-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..");
const outputDir = path.join(projectRoot, "output", "context");
const latestMarkdownPath = path.join(outputDir, "latest-context.md");
const latestJsonPath = path.join(outputDir, "latest-context.json");

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function readText(file, maxChars = 18000) {
  if (!existsSync(file)) return "";
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]` : text;
}

function readJson(file) {
  const text = readText(file, 8_000_000);
  return text ? JSON.parse(text) : null;
}

function runGit(args) {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    return `git ${args.join(" ")} failed: ${error.message}`;
  }
}

function findFinalDecisionArtifacts() {
  const extractedRoot = path.join(repoRoot, "analysis", "extracted_attachments");
  if (!existsSync(extractedRoot)) return [];
  const decisionDir = readdirSync(extractedRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.startsWith("147_"));
  if (!decisionDir) return [];

  const dir = path.join(extractedRoot, decisionDir.name);
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && [".csv", ".txt", ".json"].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const file = path.join(dir, entry.name);
      return {
        name: entry.name,
        path: path.relative(repoRoot, file).replace(/\\/g, "/"),
        excerpt: readText(file, 3200)
      };
    });
}

function hardwareSummary(manifest) {
  const devices = Array.isArray(manifest?.applied_hardware) ? manifest.applied_hardware : [];
  return {
    status: manifest?.status || null,
    updated_at: manifest?.updated_at || null,
    fit: manifest?.project_fit?.assessment || null,
    borrow_deadline: manifest?.loan_terms_summary?.borrow_deadline || null,
    devices: devices.map((device) => ({
      product_name: device.product_name,
      model: device.model,
      quantity: device.quantity,
      role: device.role
    })),
    privacy_note: "Recipient, phone, address, serial numbers, tokens, and raw loan-image details are intentionally omitted."
  };
}

function spaceSummary(space) {
  return {
    space_id: space?.space_id || INNERWORLD_SPACE_ID,
    name: space?.name || null,
    version: space?.version || null,
    anchors: (space?.anchors || []).map((anchor) => ({
      anchor_id: anchor.anchor_id,
      kind: anchor.kind,
      label: anchor.label,
      grid_pos: anchor.grid_pos
    })),
    mission: {
      mission_id: space?.mission?.mission_id || null,
      title: space?.mission?.title || null,
      steps: (space?.mission?.steps || []).map((step) => ({
        step_id: step.step_id,
        anchor_id: step.anchor_id,
        label: step.label
      }))
    }
  };
}

function buildSnapshot(generatedAt) {
  const space = readJson(path.join(projectRoot, "data", "space_demo.json"));
  const hardware = readJson(path.join(projectRoot, "data", "hardware_manifest.json"));
  const endpoints = buildEndpointMap("http://localhost:5177", space?.space_id || INNERWORLD_SPACE_ID);
  const endpointList = Object.fromEntries(
    Object.entries(endpoints).map(([key, value]) => [key, {
      method: value.method,
      path: value.path
    }])
  );

  return {
    schema: "innerworld-context-export/v1",
    generated_at: generatedAt.toISOString(),
    project_root: projectRoot,
    repo_root: repoRoot,
    objective_source: "docs/active-goal.md",
    active_goal: readText(path.join(projectRoot, "docs", "active-goal.md"), 12000),
    status_doc: readText(path.join(projectRoot, "docs", "status.md"), 8000),
    hardware: hardwareSummary(hardware),
    space: spaceSummary(space),
    endpoints: endpointList,
    ai_contract: {
      schema_excerpt: readText(path.join(projectRoot, "ai", "schema.json"), 8000),
      prompt_excerpt: readText(path.join(projectRoot, "ai", "prompt.md"), 8000)
    },
    final_decision_artifacts: findFinalDecisionArtifacts(),
    git: {
      branch: runGit(["branch", "--show-current"]),
      status: runGit(["status", "--short", "--branch"]),
      head: runGit(["rev-parse", "--short", "HEAD"]),
      remote: runGit(["remote", "-v"])
    },
    runbook: {
      local: "npm run dev",
      lan: "npm run dev:lan",
      checks: [
        "npm run check",
        "npm run check:mainline",
        "npm run check:contract",
        "npm run check:device",
        "npm run check:store",
        "npm run check:web",
        "npm run check:unity",
        "npm run check:security"
      ],
      cleanup: [
        "npm run cache:report",
        "npm run cache:clean",
        "npm run ops:monitor:clean:once"
      ]
    }
  };
}

function mdCode(value) {
  return `\`\`\`\n${String(value || "").trim() || "n/a"}\n\`\`\``;
}

function renderMarkdown(snapshot) {
  const decisionList = snapshot.final_decision_artifacts
    .map((artifact) => `- ${artifact.path}\n${mdCode(artifact.excerpt)}`)
    .join("\n");
  const endpointRows = Object.entries(snapshot.endpoints)
    .map(([key, endpoint]) => `| ${key} | ${endpoint.method} | ${endpoint.path} |`)
    .join("\n");

  return [
    "# InnerWorld Context Export",
    "",
    `Generated: ${snapshot.generated_at}`,
    "",
    "## Goal",
    "",
    snapshot.active_goal,
    "",
    "## Hardware",
    "",
    mdCode(JSON.stringify(snapshot.hardware, null, 2)),
    "",
    "## Space Contract",
    "",
    mdCode(JSON.stringify(snapshot.space, null, 2)),
    "",
    "## API Endpoints",
    "",
    "| Key | Method | Path |",
    "| --- | --- | --- |",
    endpointRows,
    "",
    "## Final Decision Artifacts",
    "",
    decisionList || "No final decision artifacts found.",
    "",
    "## Git",
    "",
    mdCode(JSON.stringify(snapshot.git, null, 2)),
    "",
    "## Runbook",
    "",
    mdCode(JSON.stringify(snapshot.runbook, null, 2)),
    "",
    "## Privacy Boundary",
    "",
    "This export records project direction, sanitized hardware facts, API contracts, and final decision excerpts. It does not copy raw private chat messages, recipient details, phone numbers, addresses, serial numbers, tokens, .env files, SQLite runtime files, or vendor SDK payloads."
  ].join("\n");
}

function main() {
  const generatedAt = new Date();
  const stamp = nowStamp(generatedAt);
  const snapshot = buildSnapshot(generatedAt);
  mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `context-${stamp}.json`);
  const mdPath = path.join(outputDir, `context-${stamp}.md`);
  const markdown = renderMarkdown(snapshot);
  writeFileSync(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  writeFileSync(mdPath, `${markdown}\n`, "utf8");
  writeFileSync(latestJsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  writeFileSync(latestMarkdownPath, `${markdown}\n`, "utf8");

  console.log(JSON.stringify({
    ok: true,
    schema: snapshot.schema,
    generated_at: snapshot.generated_at,
    markdown: mdPath,
    json: jsonPath,
    latest_markdown: latestMarkdownPath,
    latest_json: latestJsonPath,
    final_decision_artifacts: snapshot.final_decision_artifacts.length
  }, null, 2));
}

main();
