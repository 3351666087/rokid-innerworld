import { existsSync } from "node:fs";
import { beacons, normalizeMissionState } from "../../../../shared/innerworld-contract.js";
import { readJson, writeJsonAtomic } from "../lib/json-file.js";

export function createRuntimeStore({ spacePath, statePath, sqliteStore = null }) {
  let queue = Promise.resolve();

  async function loadSpace() {
    return readJson(spacePath);
  }

  async function buildDefaultState() {
    const space = await loadSpace();
    return {
      booted_at: new Date().toISOString(),
      active_user: "A",
      mission_state: "entered",
      current_step_index: 0,
      completed_steps: [],
      beacons: space.beacons,
      events: []
    };
  }

  async function saveState(state) {
    if (sqliteStore) {
      return sqliteStore.saveRuntimeState(state);
    }
    await writeJsonAtomic(statePath, state);
    return state;
  }

  async function resetState() {
    const state = await buildDefaultState();
    await saveState(state);
    return state;
  }

  async function loadState() {
    if (sqliteStore) {
      const stored = sqliteStore.loadRuntimeState();
      if (stored) return stored;
      return resetState();
    }
    if (!existsSync(statePath)) {
      return resetState();
    }
    return readJson(statePath);
  }

  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  async function updateState(mutator) {
    return enqueue(async () => {
      const space = await loadSpace();
      const state = await loadState();
      const result = await mutator(state, space);
      normalizeMissionState(space, state);
      await saveState(state);
      return { state, space, result };
    });
  }

  async function saveEvent(type, payload) {
    const event = {
      event_id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      payload,
      created_at: new Date().toISOString()
    };
    const updated = await updateState((state) => {
      state.events = Array.isArray(state.events) ? state.events : [];
      state.events.push(event);
      return event;
    });
    return { state: updated.state, event };
  }

  function summarize(state) {
    return {
      active_user: state?.active_user,
      mission_state: state?.mission_state,
      completed_steps: Array.isArray(state?.completed_steps) ? state.completed_steps.length : 0,
      beacon_count: beacons(state).length
    };
  }

  return {
    loadSpace,
    buildDefaultState,
    loadState,
    saveState,
    resetState,
    updateState,
    saveEvent,
    summarize
  };
}
