import path from "node:path";
import { INNERWORLD_SERVICE_NAME, buildDemoStatus } from "../../../../shared/innerworld-contract.js";
import { readJsonIfExists } from "../lib/json-file.js";

function getProcessStatus(processId) {
  if (!processId) return false;
  try {
    process.kill(Number(processId), 0);
    return true;
  } catch {
    return false;
  }
}

function pickPackageSummary(releaseIndex) {
  return {
    main_package: releaseIndex?.main_package?.zip
      ? {
          path: releaseIndex.main_package.zip.path,
          sha256: releaseIndex.main_package.zip.sha256,
          exists: releaseIndex.main_package.zip.exists
        }
      : null,
    server_package: releaseIndex?.server_package?.zip
      ? {
          path: releaseIndex.server_package.zip.path,
          sha256: releaseIndex.server_package.zip.sha256,
          exists: releaseIndex.server_package.zip.exists
        }
      : null
  };
}

function summarizeHardwareManifest(manifest) {
  if (!manifest || manifest.ok === false) return null;
  const devices = Array.isArray(manifest.applied_hardware) ? manifest.applied_hardware : [];
  return {
    status: manifest.status || null,
    kit: manifest.kit_interpretation || null,
    borrow_deadline: manifest.loan_terms_summary?.borrow_deadline || null,
    fit: manifest.project_fit?.assessment || null,
    devices: devices.map((device) => ({
      product_name: device.product_name,
      model: device.model,
      quantity: device.quantity,
      role: device.role
    }))
  };
}

export function createOpsStatusService({ loadSpace, loadState, outputDir, hardwareManifestPath, host, port }) {
  return async function buildOpsStatus() {
    const [space, state, hardwareManifest, releaseIndex, deployDryRun, envDoctor, fieldPreflight, opsMonitor, opsProcess] = await Promise.all([
      loadSpace(),
      loadState(),
      readJsonIfExists(hardwareManifestPath),
      readJsonIfExists(path.join(outputDir, "release-index", "release-index-latest.json")),
      readJsonIfExists(path.join(outputDir, "server-release", "deploy-dry-run-latest.json")),
      readJsonIfExists(path.join(outputDir, "env-doctor", "env-doctor-latest.json")),
      readJsonIfExists(path.join(outputDir, "field-preflight", "field-preflight-latest.json")),
      readJsonIfExists(path.join(outputDir, "ops-monitor", "ops-monitor-latest.json")),
      readJsonIfExists(path.join(outputDir, "ops-monitor", "ops-monitor-process.json"))
    ]);
    const health = buildDemoStatus(space, state);
    return {
      ok: true,
      generated_at: new Date().toISOString(),
      service: INNERWORLD_SERVICE_NAME,
      local_url: `http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`,
      device_bootstrap_url: `http://${host === "0.0.0.0" ? "localhost" : host}:${port}/api/device/bootstrap`,
      host,
      port,
      health,
      hardware: summarizeHardwareManifest(hardwareManifest),
      packages: pickPackageSummary(releaseIndex),
      release_index: releaseIndex
        ? {
            ok: releaseIndex.ok,
            generated_at: releaseIndex.generated_at,
            warnings: releaseIndex.warnings || [],
            errors: releaseIndex.errors || []
          }
        : null,
      deploy_dry_run: deployDryRun
        ? {
            ok: deployDryRun.ok,
            generated_at: deployDryRun.generated_at,
            zip_path: deployDryRun.zip_path,
            zip_sha256: deployDryRun.zip_sha256,
            warnings: deployDryRun.warnings || [],
            errors: deployDryRun.errors || []
          }
        : null,
      env_doctor: envDoctor
        ? {
            ok: envDoctor.ok,
            generated_at: envDoctor.generated_at,
            warnings: envDoctor.warnings || [],
            errors: envDoctor.errors || []
          }
        : null,
      field_preflight: fieldPreflight
        ? {
            generated_at: fieldPreflight.generated_at,
            lan_url: fieldPreflight.lan_url,
            lan_health_ok: Boolean(fieldPreflight.lan_health?.ok),
            unity_config_updated: fieldPreflight.unity_config_updated,
            pdf_rendered: fieldPreflight.pdf_rendered
          }
        : null,
      ops_monitor: opsMonitor
        ? {
            ok: opsMonitor.ok,
            generated_at: opsMonitor.generated_at,
            c_free_gb_after: opsMonitor.c_free_gb_after,
            cleanup_applied: opsMonitor.cleanup_applied
          }
        : null,
      ops_monitor_process: opsProcess
        ? {
            process_id: opsProcess.process_id,
            running: getProcessStatus(opsProcess.process_id),
            started_at: opsProcess.started_at
          }
        : null
    };
  };
}
