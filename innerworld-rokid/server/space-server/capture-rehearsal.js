import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const base = process.env.BASE_URL || "http://localhost:5177";
const spaceId = "innerworld_campus_wall";
const resetAfter = process.argv.includes("--reset-after");
const outputDirArg = process.argv.find((arg) => arg.startsWith("--output-dir="));
const outputDir = outputDirArg
  ? path.resolve(outputDirArg.slice("--output-dir=".length))
  : path.join(root, "output", "demo");

const writebackText = "后来的人，别忘了抬头看这里。";
const requiredSteps = ["read", "find_year", "service_action", "write_back"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function requestJson(label, route, options = {}) {
  const startedAt = Date.now();
  const res = await fetch(`${base}${route}`, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.headers || {})
    }
  });
  const contentType = res.headers.get("content-type") || "";
  const cacheControl = res.headers.get("cache-control") || "";
  const body = await res.json();
  return {
    label,
    route,
    status: res.status,
    ok: res.ok,
    duration_ms: Date.now() - startedAt,
    content_type: contentType,
    cache_control: cacheControl,
    body
  };
}

function pickStateSnapshot(state) {
  return {
    booted_at: state.booted_at,
    active_user: state.active_user,
    mission_state: state.mission_state,
    current_step_index: state.current_step_index,
    completed_steps: state.completed_steps,
    beacon_count: Array.isArray(state.beacons) ? state.beacons.length : 0,
    latest_beacon: Array.isArray(state.beacons) ? state.beacons.at(-1) : null,
    event_count: Array.isArray(state.events) ? state.events.length : 0
  };
}

function validateFinalState(finalState, finalHealth, seedBeaconCount) {
  assert(finalState.active_user === "B", "final active_user should be B");
  assert(finalState.mission_state === "complete", "final mission_state should be complete");
  assert(finalState.current_step_index === 3, "final current_step_index should be 3");
  for (const step of requiredSteps) {
    assert(finalState.completed_steps?.includes(step), `final completed_steps missing ${step}`);
  }
  assert(finalState.beacons?.length === seedBeaconCount + 1, "final beacon count should add one writeback");
  const latest = finalState.beacons.at(-1);
  assert(latest.anchor_id === "A3", "latest beacon should be anchored at A3");
  assert(latest.source === "A", "latest beacon should come from User A");
  assert(latest.body === writebackText, "latest beacon body should match rehearsal writeback");
  assert(finalHealth.demo_ready === true, "final health demo_ready should be true");
  assert(finalHealth.mission_state === "complete", "final health mission_state should be complete");
  assert(finalHealth.completed_step_count === requiredSteps.length, "final health completed step count should be 4");
  assert(finalHealth.beacon_count === seedBeaconCount + 1, "final health beacon_count should add one writeback");
}

function buildMarkdown(evidence) {
  const final = evidence.final_state;
  const latest = final.latest_beacon;
  return `# InnerWorld Rehearsal Evidence

- Generated: ${evidence.generated_at}
- Base URL: ${evidence.base_url}
- Result: ${evidence.ok ? "PASS" : "FAIL"}
- Active user: ${final.active_user}
- Mission state: ${final.mission_state}
- Completed steps: ${final.completed_steps.join(", ")}
- Beacon count: ${final.beacon_count}
- Latest beacon: ${latest?.beacon_id || "n/a"} at ${latest?.anchor_id || "n/a"}
- Latest writeback time: ${latest?.created_at || "n/a"}
- Reset after capture: ${evidence.reset_after}

## Sequence

${evidence.steps.map((step, index) => `${index + 1}. ${step.label} ${step.status} ${step.ok ? "ok" : "failed"} in ${step.duration_ms}ms`).join("\n")}

## Acceptance

- User B sees the completed state.
- A3 contains the new time-capsule writeback.
- Space health reports demo readiness, 4 completed steps, and 3 beacons.
`;
}

async function main() {
  const generatedAt = new Date();
  const steps = [];

  const resetBefore = await requestJson("reset-before", "/api/reset", { method: "POST" });
  steps.push(resetBefore);
  assert(resetBefore.ok, "reset-before failed");
  assert(resetBefore.body.mission_state === "entered", "reset-before mission_state should be entered");
  const seedBeaconCount = resetBefore.body.beacons.length;

  const initialHealth = await requestJson("initial-health", "/api/health");
  steps.push(initialHealth);
  assert(initialHealth.body.demo_ready === true, "initial health demo_ready should be true");
  assert(initialHealth.body.mission_state === "entered", "initial health mission_state should be entered");

  const space = await requestJson("space-load", `/api/spaces/${spaceId}`);
  steps.push(space);
  assert(space.body.space_id === spaceId, "space id mismatch");
  assert(space.body.anchors?.length === 3, "space should have three anchors");

  steps.push(await requestJson("step-read", "/api/interactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user_id: "A", step_id: "read", mission_state: "reading" })
  }));

  steps.push(await requestJson("step-find-year", "/api/interactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user_id: "A", step_id: "find_year", mission_state: "doing" })
  }));

  steps.push(await requestJson("service-action", "/api/service-actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user_id: "A",
      action_id: "JOIN_EVENT_1430",
      label: "加入 14:30 体验活动"
    })
  }));

  steps.push(await requestJson("write-back", `/api/spaces/${spaceId}/beacons`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user_id: "A",
      anchor_id: "A3",
      title: "后来者留言",
      text: writebackText
    })
  }));

  steps.push(await requestJson("switch-user-b", "/api/interactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user_id: "B", mission_state: "complete" })
  }));

  const finalStateResponse = await requestJson("final-state", "/api/state");
  steps.push(finalStateResponse);
  const finalHealth = await requestJson("final-health", "/api/health");
  steps.push(finalHealth);

  validateFinalState(finalStateResponse.body, finalHealth.body, seedBeaconCount);

  let resetAfterSnapshot = null;
  if (resetAfter) {
    const resetAfterResponse = await requestJson("reset-after", "/api/reset", { method: "POST" });
    steps.push(resetAfterResponse);
    assert(resetAfterResponse.body.mission_state === "entered", "reset-after mission_state should be entered");
    resetAfterSnapshot = pickStateSnapshot(resetAfterResponse.body);
  }

  const evidence = {
    ok: true,
    generated_at: generatedAt.toISOString(),
    base_url: base,
    space_id: spaceId,
    reset_after: resetAfter,
    seed_beacon_count: seedBeaconCount,
    final_state: pickStateSnapshot(finalStateResponse.body),
    final_health: finalHealth.body,
    reset_after_state: resetAfterSnapshot,
    steps: steps.map((step) => ({
      label: step.label,
      route: step.route,
      status: step.status,
      ok: step.ok,
      duration_ms: step.duration_ms,
      content_type: step.content_type,
      cache_control: step.cache_control
    }))
  };

  await mkdir(outputDir, { recursive: true });
  const stamp = stampForFile(generatedAt);
  const jsonPath = path.join(outputDir, `rehearsal-evidence-${stamp}.json`);
  const mdPath = path.join(outputDir, `rehearsal-evidence-${stamp}.md`);
  const latestJsonPath = path.join(outputDir, "rehearsal-evidence-latest.json");
  const latestMdPath = path.join(outputDir, "rehearsal-evidence-latest.md");

  await writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(latestJsonPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  const markdown = buildMarkdown(evidence);
  await writeFile(mdPath, markdown, "utf8");
  await writeFile(latestMdPath, markdown, "utf8");

  console.log(JSON.stringify({
    ok: true,
    base,
    json: jsonPath,
    markdown: mdPath,
    active_user: evidence.final_state.active_user,
    mission_state: evidence.final_state.mission_state,
    completed_steps: evidence.final_state.completed_steps.length,
    beacons: evidence.final_state.beacon_count,
    reset_after: resetAfter
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
