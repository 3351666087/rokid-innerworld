const base = process.env.BASE_URL || "http://localhost:5177";

async function main() {
  const health = await fetch(`${base}/api/health`).then((res) => res.json());
  const space = await fetch(`${base}/api/spaces/innerworld_campus_wall`).then((res) => res.json());
  const write = await fetch(`${base}/api/spaces/innerworld_campus_wall/beacons`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user_id: "CHECK",
      anchor_id: "A3",
      text: "自动检查写回：后来者能在这里看到新内容。"
    })
  }).then((res) => res.json());
  const state = await fetch(`${base}/api/state`).then((res) => res.json());

  if (!health.ok) throw new Error("health check failed");
  if (space.space_id !== "innerworld_campus_wall") throw new Error("space check failed");
  if (!write.ok) throw new Error("write-back check failed");
  if (!state.beacons.some((item) => item.source === "CHECK")) throw new Error("state check failed");

  console.log(JSON.stringify({
    ok: true,
    base,
    beacons: state.beacons.length,
    mission_state: state.mission_state
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
