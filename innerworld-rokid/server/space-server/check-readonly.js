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
  if (!Array.isArray(nearby.pins) || nearby.pins.length !== 3) throw new Error("nearby pins check failed");
  if (!Array.isArray(state.beacons)) throw new Error("state check failed");

  console.log(JSON.stringify({
    ok: true,
    base,
    pins: nearby.pins.length,
    beacons: state.beacons.length,
    mission_state: state.mission_state
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
