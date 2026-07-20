const base = process.env.BASE_URL || "http://localhost:5177";

async function main() {
  const [health, space, nearby, state] = await Promise.all([
    fetch(`${base}/api/health`).then((res) => res.json()),
    fetch(`${base}/api/spaces/innerworld_campus_wall`).then((res) => res.json()),
    fetch(`${base}/api/pins/nearby?radius=20`).then((res) => res.json()),
    fetch(`${base}/api/state`).then((res) => res.json())
  ]);

  if (!health.ok) throw new Error("health check failed");
  if (space.space_id !== "innerworld_campus_wall") throw new Error("space check failed");
  const pins = Array.isArray(nearby.pins) ? nearby.pins : [];
  const anchorPins = pins.filter((pin) => pin.pin_type === "anchor");
  const semanticPreviewPins = pins.filter((pin) => pin.pin_type === "semantic" && pin.controlled_demo === true && pin.open_ugc_allowed === false);
  if (nearby.p0_anchor_count !== 3 || anchorPins.length !== 3) throw new Error("nearby P0 anchor pins check failed");
  if (nearby.semantic_preview_count !== 1 || semanticPreviewPins.length !== 1) throw new Error("nearby controlled preview pins check failed");
  if (semanticPreviewPins.some((pin) => pin.hardware_acceptance_evidence !== false || pin.p0_required !== false)) throw new Error("nearby controlled preview acceptance guard failed");
  if (!Array.isArray(state.beacons)) throw new Error("state check failed");

  console.log(JSON.stringify({
    ok: true,
    base,
    pins: pins.length,
    p0_anchor_count: nearby.p0_anchor_count,
    semantic_preview_count: nearby.semantic_preview_count,
    beacons: state.beacons.length,
    mission_state: state.mission_state
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
