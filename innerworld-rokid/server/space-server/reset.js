const base = process.env.BASE_URL || "http://localhost:5177";

async function main() {
  const res = await fetch(`${base}/api/reset`, { method: "POST" });
  const state = await res.json();
  console.log(JSON.stringify({
    ok: true,
    base,
    mission_state: state.mission_state,
    beacons: state.beacons.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
