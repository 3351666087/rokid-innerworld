import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const unityProject = path.join(root, "apps", "unity-shell");
const outputRoot = path.join(root, "output", "uxr-readiness");

function readText(file) {
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function readJson(file) {
  const text = readText(file);
  if (!text) return null;
  return JSON.parse(text);
}

function shaPrefix(value, length = 12) {
  // Avoid importing crypto for this small privacy marker by using a stable non-secret fingerprint.
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, length);
}

function fileSha256(file) {
  if (!existsSync(file)) return null;
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const EXPECTED_ROKID_TARGET_INDEX_MAP = [
  { index: 1, anchor_id: "A1", guid: "innerworld-a1-qr-entry-v1", tracking_mode: "qr", physical_width_m: 0.15, physical_height_m: 0.1 },
  { index: 2, anchor_id: "A2", guid: "innerworld-a2-memory-beacon-v1", tracking_mode: "image_tracking", physical_width_m: 0.15, physical_height_m: 0.1 },
  { index: 3, anchor_id: "A3", guid: "innerworld-a3-writeback-v1", tracking_mode: "image_tracking", physical_width_m: 0.15, physical_height_m: 0.1 }
];

function listZipEntriesFromBuffer(buffer) {
  const eocdSignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const searchStart = Math.max(0, buffer.length - 0xffff - 22);
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) return [];
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;
  const end = Math.min(buffer.length, centralDirectoryOffset + centralDirectorySize);
  while (offset + 46 <= end && buffer.readUInt32LE(offset) === centralDirectorySignature) {
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = buffer.toString("utf8", nameStart, nameEnd);
    entries.push({
      path: name,
      compressed_size: compressedSize,
      size_bytes: uncompressedSize,
      compression_method: buffer.readUInt16LE(offset + 10),
      local_header_offset: buffer.readUInt32LE(offset + 42)
    });
    offset = nameEnd + extraLength + commentLength;
  }
  return entries;
}

function listZipEntries(file) {
  if (!existsSync(file)) return [];
  return listZipEntriesFromBuffer(readFileSync(file));
}

function extractZipEntryBuffer(buffer, entry) {
  const localFileHeaderSignature = 0x04034b50;
  const offset = Number(entry?.local_header_offset);
  if (!Number.isFinite(offset) || offset < 0 || offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== localFileHeaderSignature) {
    throw new Error("zip_local_header_missing");
  }
  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + Number(entry.compressed_size || 0);
  if (dataStart < 0 || dataEnd > buffer.length || dataEnd < dataStart) {
    throw new Error("zip_entry_bounds_invalid");
  }
  const compressed = buffer.subarray(dataStart, dataEnd);
  if (entry.compression_method === 0) return Buffer.from(compressed);
  if (entry.compression_method === 8) return inflateRawSync(compressed);
  throw new Error(`zip_compression_method_unsupported_${entry.compression_method}`);
}

function inferTargetAnchorId(guid) {
  const expected = EXPECTED_ROKID_TARGET_INDEX_MAP.find((item) => item.guid === guid);
  return expected ? expected.anchor_id : null;
}

function buildRokidTargetIndexMap(rows = [], issues = []) {
  const actual = rows.map((row) => {
    const index = Number(row?.index ?? NaN);
    const guid = String(row?.guid || "");
    return {
      index: Number.isFinite(index) ? index : null,
      anchor_id: inferTargetAnchorId(guid),
      guid,
      image_name: row?.imageName || null,
      physical_width_m: Number.isFinite(Number(row?.physicalWidth)) ? Number(row.physicalWidth) : null,
      physical_height_m: Number.isFinite(Number(row?.physicalHeight)) ? Number(row.physicalHeight) : null
    };
  });
  const expectedIndexes = new Set(EXPECTED_ROKID_TARGET_INDEX_MAP.map((item) => item.index));
  const exactMap = actual.length === 3
    && actual.map((item) => `${item.index}:${item.anchor_id}`).join(",") === "1:A1,2:A2,3:A3";
  const missingAnchorIds = EXPECTED_ROKID_TARGET_INDEX_MAP
    .filter((expected) => !actual.some((item) => item.index === expected.index && item.guid === expected.guid))
    .map((item) => item.anchor_id);
  const unexpectedIndexes = actual
    .filter((item) => !expectedIndexes.has(item.index) || !item.anchor_id)
    .map((item) => item.index)
    .filter((item) => Number.isFinite(item));
  const indexCounts = new Map();
  for (const item of actual) {
    indexCounts.set(item.index, (indexCounts.get(item.index) || 0) + 1);
  }
  const duplicateIndexes = [...indexCounts.entries()]
    .filter(([index, count]) => Number.isFinite(index) && count > 1)
    .map(([index]) => index);
  const cleanIssues = [
    ...issues.filter(Boolean),
    ...(missingAnchorIds.length ? ["target_index_map_missing_expected_a1_a2_a3"] : []),
    ...(unexpectedIndexes.length ? ["target_index_map_contains_unexpected_targets"] : []),
    ...(duplicateIndexes.length ? ["target_index_map_duplicate_indexes"] : []),
    ...(!exactMap ? ["target_index_map_not_exact_a1_a2_a3"] : [])
  ];
  return {
    schema: "innerworld-rokid-target-index-map/v1",
    required_for_trusted_image_tracking: true,
    ready: cleanIssues.length === 0,
    expected: EXPECTED_ROKID_TARGET_INDEX_MAP,
    actual,
    missing_anchor_ids: missingAnchorIds,
    unexpected_indexes: [...new Set(unexpectedIndexes)],
    duplicate_indexes: duplicateIndexes,
    exact_a1_a2_a3_map: exactMap,
    issues: [...new Set(cleanIssues)],
    boundary: "This verifies the APK-packaged RKImage.db target index map only; it does not prove physical target observation or hardware acceptance."
  };
}

function inspectRokidImageDatabase(apkPath) {
  const expectedPath = "assets/RKImage.db";
  const base = {
    found: false,
    expected_path: expectedPath,
    path: null,
    size_bytes: 0,
    streaming_assets_candidate: false,
    zip_entries: [],
    contains_image_db_core: false,
    contains_data_json: false,
    image_db_core_bytes: 0,
    target_index_map: buildRokidTargetIndexMap([], ["rkimage_db_missing"]),
    required_for_trusted_image_tracking: true
  };
  if (!existsSync(apkPath)) {
    return {
      ...base,
      target_index_map: buildRokidTargetIndexMap([], ["apk_not_found"]),
      missing_reason: "apk_not_found"
    };
  }
  const apkBuffer = readFileSync(apkPath);
  const matches = listZipEntriesFromBuffer(apkBuffer)
    .filter((entry) => /(^|\/)RKImage\.db$/i.test(entry.path))
    .sort((left, right) => {
      const rank = (entry) => {
        if (entry.path === expectedPath) return 0;
        if (entry.path.startsWith("assets/")) return 1;
        return 2;
      };
      return rank(left) - rank(right) || left.path.localeCompare(right.path);
    });
  if (matches.length === 0) {
    return {
      ...base,
      missing_reason: "RKImage.db not found in APK assets"
    };
  }
  const entry = matches[0];
  let zipEntries = [];
  let containsImageDbCore = false;
  let containsDataJson = false;
  let imageDbCoreBytes = 0;
  let targetRows = [];
  const targetMapIssues = [];
  try {
    const rkImageDbBuffer = extractZipEntryBuffer(apkBuffer, entry);
    zipEntries = listZipEntriesFromBuffer(rkImageDbBuffer);
    const coreEntry = zipEntries.find((item) => item.path === "ImageDB.core");
    const dataEntry = zipEntries.find((item) => item.path === "Data.json");
    containsImageDbCore = Boolean(coreEntry);
    containsDataJson = Boolean(dataEntry);
    imageDbCoreBytes = Number(coreEntry?.size_bytes || 0);
    if (dataEntry) {
      try {
        const dataJson = extractZipEntryBuffer(rkImageDbBuffer, dataEntry).toString("utf8").replace(/^\uFEFF/, "");
        const parsed = JSON.parse(dataJson);
        targetRows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        targetMapIssues.push("rkimage_db_data_json_parse_failed");
      }
    } else {
      targetMapIssues.push("rkimage_db_data_json_missing");
    }
  } catch {
    targetMapIssues.push("rkimage_db_zip_parse_failed");
  }
  return {
    found: true,
    expected_path: expectedPath,
    path: entry.path,
    size_bytes: entry.size_bytes,
    streaming_assets_candidate: entry.path.startsWith("assets/"),
    zip_entries: zipEntries.map((item) => item.path),
    contains_image_db_core: containsImageDbCore,
    contains_data_json: containsDataJson,
    image_db_core_bytes: imageDbCoreBytes,
    target_index_map: buildRokidTargetIndexMap(targetRows, targetMapIssues),
    required_for_trusted_image_tracking: true,
    missing_reason: null
  };
}

function inspectCurrentApk() {
  const apkPath = path.join(root, "output", "unity-android", "InnerWorldRokid.apk");
  if (!existsSync(apkPath)) {
    return {
      exists: false,
      path: path.relative(root, apkPath).replace(/\\/g, "/"),
      size_bytes: 0,
      sha256: null,
      sha256_prefix: null,
      last_write_time: null,
      rokid_image_db: inspectRokidImageDatabase(apkPath)
    };
  }
  const stat = statSync(apkPath);
  const sha256 = fileSha256(apkPath);
  return {
    exists: true,
    path: path.relative(root, apkPath).replace(/\\/g, "/"),
    size_bytes: stat.size,
    sha256,
    sha256_prefix: sha256?.slice(0, 12) || null,
    last_write_time: stat.mtime.toISOString(),
    rokid_image_db: inspectRokidImageDatabase(apkPath)
  };
}

function packagePresent(manifest, packageName) {
  return Boolean(manifest?.dependencies?.[packageName]);
}

function packageLocked(lock, packageName) {
  return Boolean(lock?.dependencies?.[packageName]);
}

function listScopedRegistries(manifest) {
  const registries = Array.isArray(manifest?.scopedRegistries) ? manifest.scopedRegistries : [];
  return registries.map((registry) => ({
    name: registry.name || null,
    url_redacted: registry.url ? registry.url.replace(/:\/\/[^/@]+@/, "://<credentials-redacted>@") : null,
    scopes: Array.isArray(registry.scopes) ? registry.scopes : []
  }));
}

function findFiles(dir, predicate, max = 2000) {
  const results = [];
  const stack = [dir];
  const ignored = new Set(["Library", "Temp", "Obj", "Build", "Logs", "UserSettings", ".git"]);
  while (stack.length && results.length < max) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) stack.push(full);
      } else if (predicate(full, entry.name)) {
        results.push(full);
      }
    }
  }
  return results;
}

function inspectUnityPackages() {
  const manifestPath = path.join(unityProject, "Packages", "manifest.json");
  const lockPath = path.join(unityProject, "Packages", "packages-lock.json");
  const manifest = readJson(manifestPath);
  const lock = readJson(lockPath);

  const requiredPackages = {
    rokid_uxr: "com.rokid.xr.unity",
    rokid_openxr: "com.rokid.openxr",
    unity_xr_management: "com.unity.xr.management"
  };

  const packages = Object.fromEntries(Object.entries(requiredPackages).map(([key, packageName]) => [key, {
    package: packageName,
    in_manifest: packagePresent(manifest, packageName),
    manifest_version: manifest?.dependencies?.[packageName] || null,
    in_lock: packageLocked(lock, packageName),
    lock_version: lock?.dependencies?.[packageName]?.version || null,
    source: lock?.dependencies?.[packageName]?.source || null
  }]));

  return {
    manifest_path: path.relative(root, manifestPath).replace(/\\/g, "/"),
    lock_path: existsSync(lockPath) ? path.relative(root, lockPath).replace(/\\/g, "/") : null,
    scoped_registries: listScopedRegistries(manifest),
    packages
  };
}

function inspectProjectSettings() {
  const projectSettingsPath = path.join(unityProject, "ProjectSettings", "ProjectSettings.asset");
  const projectSettingsText = readText(projectSettingsPath);
  const xrSettingsFiles = findFiles(path.join(unityProject, "ProjectSettings"), (full, name) => {
    return /XR|OpenXR|PackageSettings|XRGeneralSettings/i.test(name) || /XR|OpenXR|XRGeneralSettings/i.test(readText(full).slice(0, 2000));
  }, 100);

  const defineLine = (projectSettingsText.match(/scriptingDefineSymbols:\s*(.*)/) || [])[1] || "";
  const hasRokidUxrDefine = /ROKID_UXR/.test(projectSettingsText);

  return {
    project_settings_path: path.relative(root, projectSettingsPath).replace(/\\/g, "/"),
    android_application_id: (projectSettingsText.match(/Android:\s*([a-zA-Z0-9_.]+)/) || [])[1] || null,
    android_min_sdk_version: Number((projectSettingsText.match(/AndroidMinSdkVersion:\s*(\d+)/) || [])[1] || 0),
    android_target_architectures_value: Number((projectSettingsText.match(/AndroidTargetArchitectures:\s*(-?\d+)/) || [])[1] || 0),
    android_resizeable_activity_value: Number((projectSettingsText.match(/androidResizeableActivity:\s*(\d+)/) || [])[1] || 0),
    android_application_entry_value: Number((projectSettingsText.match(/androidApplicationEntry:\s*(\d+)/) || [])[1] || 0),
    rokid_uxr_define_present: hasRokidUxrDefine,
    scripting_define_line: defineLine.trim() || "{}",
    xr_settings_files: xrSettingsFiles.map((file) => path.relative(root, file).replace(/\\/g, "/"))
  };
}

function inspectAndroidManifest() {
  const manifestPath = path.join(unityProject, "Assets", "Plugins", "Android", "InnerWorldNetwork.androidlib", "AndroidManifest.xml");
  const text = readText(manifestPath);
  const has = (needle) => text.includes(needle);
  return {
    manifest_path: path.relative(root, manifestPath).replace(/\\/g, "/"),
    exists: existsSync(manifestPath),
    permissions: {
      internet: has("android.permission.INTERNET"),
      camera: has("android.permission.CAMERA"),
      record_audio: has("android.permission.RECORD_AUDIO")
    },
    queries: {
      openxr_runtime: has("com.rokid.openxr.runtime"),
      uxr_launcher: has("com.rokid.uxr.launcher")
    },
    metadata: {
      rokid_uxr_sdk: has('android:name="rokid_uxr_sdk"'),
      rokid_sdk_uxr: has('android:name="com.rokid.sdk"') && has('android:value="uxr"'),
      rokid_uxr_application_mode_3d: has('android:name="com.rokid.uxr.application.mode"') && has('android:value="3d"'),
      allow_multiple_resumed_activities: has("android.allow_multiple_resumed_activities")
    }
  };
}

function inspectAdapterBoundary() {
  const scriptsDir = path.join(unityProject, "Assets", "Scripts", "Rokid");
  const sourceFiles = findFiles(scriptsDir, (full, name) => name.endsWith(".cs"), 200);
  const combined = sourceFiles.map((file) => readText(file)).join("\n");
  return {
    source_count: sourceFiles.length,
    files: sourceFiles.map((file) => path.relative(root, file).replace(/\\/g, "/")),
    has_compile_boundary: combined.includes("#if ROKID_UXR"),
    has_adapter_resolver: combined.includes("RokidAdapterResolver"),
    has_sdk_binding_probe: combined.includes("RokidSdkBindingProbe"),
    has_input_source_stub: combined.includes("RokidUxrInputSource"),
    has_overlay_renderer_stub: combined.includes("RokidUxrOverlayRenderer")
  };
}

function inspectSmokeEvidence() {
  const smokeDir = path.join(root, "output", "station-pro-apk-smoke");
  const legacyLatestPath = path.join(smokeDir, "station-pro-apk-smoke-latest.json");
  const latestInspectPath = path.join(smokeDir, "station-pro-apk-smoke-latest-inspect.json");
  const latestMutatingPath = path.join(smokeDir, "station-pro-apk-smoke-latest-mutating-launch.json");
  const legacyLatest = readJson(legacyLatestPath);
  const latestInspect =
    readJson(latestInspectPath) ||
    (legacyLatest?.install_and_launch === false ? legacyLatest : null);
  let latestMutating = null;
  const explicitLatestMutating = readJson(latestMutatingPath);
  if (explicitLatestMutating?.install_and_launch === true) {
    latestMutating = { file: latestMutatingPath, report: explicitLatestMutating };
  }
  if (existsSync(smokeDir)) {
    const candidates = readdirSync(smokeDir)
      .filter((name) => /^station-pro-apk-smoke-\d+.*\.json$/.test(name))
      .map((name) => path.join(smokeDir, name))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (!latestMutating) {
      for (const file of candidates) {
        const report = readJson(file);
        if (report?.install_and_launch === true) {
          latestMutating = { file, report };
          break;
        }
      }
    }
  }

  const summarize = (entry) => {
    if (!entry?.report) return null;
    const report = entry.report;
    return {
      path: path.relative(root, entry.file).replace(/\\/g, "/"),
      ok: report.ok,
      install_and_launch: report.install_and_launch,
      install_ok: report.actions?.install?.ok ?? false,
      launch_ok: report.actions?.launch?.ok ?? false,
      process_observed: report.readiness?.process_observed ?? false,
      is_uxr_app: report.diagnostics?.launch?.is_uxr_app ?? null,
      can_launch_by_default: report.diagnostics?.launch?.can_launch_by_default ?? null,
      launch_error_code: report.diagnostics?.launch?.launch_error_code ?? null,
      apk_size_bytes: report.apk?.size_bytes ?? null,
      apk_sha256: report.apk?.sha256 || null,
      apk_sha256_prefix: report.apk?.sha256?.slice(0, 12) || null
    };
  };

  const currentApk = inspectCurrentApk();

  return {
    current_apk: currentApk,
    latest_pointer: legacyLatest ? {
      path: path.relative(root, legacyLatestPath).replace(/\\/g, "/"),
      evidence_kind: legacyLatest.evidence_kind || (legacyLatest.install_and_launch ? "mutating_launch" : "inspect_only"),
      install_and_launch: legacyLatest.install_and_launch,
      generated_at: legacyLatest.generated_at || null
    } : null,
    latest_inspect: latestInspect ? {
      path: existsSync(latestInspectPath)
        ? path.relative(root, latestInspectPath).replace(/\\/g, "/")
        : path.relative(root, legacyLatestPath).replace(/\\/g, "/"),
      ok: latestInspect.ok,
      evidence_kind: latestInspect.evidence_kind || "inspect_only",
      install_and_launch: latestInspect.install_and_launch,
      network_ready_for_device: latestInspect.readiness?.network_ready_for_device ?? false,
      uxr_manifest_ready: latestInspect.apk?.manifest?.uxr_manifest_ready ?? false,
      apk_size_bytes: latestInspect.apk?.size_bytes ?? null,
      apk_sha256: latestInspect.apk?.sha256 || null,
      apk_sha256_prefix: latestInspect.apk?.sha256?.slice(0, 12) || null,
      rokid_image_db: latestInspect.apk?.rokid_image_db || null
    } : null,
    latest_mutating_launch: summarize(latestMutating)
  };
}

function buildFindings(unityPackages, projectSettings, androidManifest, adapterBoundary, smoke) {
  const blockers = [];
  const warnings = [];

  if (!unityPackages.packages.rokid_uxr.in_manifest) blockers.push("official_rokid_uxr_package_missing");
  if (!unityPackages.packages.rokid_openxr.in_manifest) blockers.push("rokid_openxr_provider_package_missing");
  if (!unityPackages.packages.unity_xr_management.in_manifest) blockers.push("unity_xr_management_package_missing");
  if (unityPackages.scoped_registries.length === 0) warnings.push("no_scoped_registry_configured");
  if (projectSettings.xr_settings_files.length === 0) blockers.push("xr_project_settings_missing");
  if (!projectSettings.rokid_uxr_define_present) blockers.push("rokid_uxr_define_missing");
  if (!androidManifest.metadata.rokid_sdk_uxr || !androidManifest.metadata.rokid_uxr_application_mode_3d) {
    blockers.push("android_rokid_uxr_manifest_markers_missing");
  }
  if (!androidManifest.queries.openxr_runtime || !androidManifest.queries.uxr_launcher) {
    blockers.push("android_uxr_runtime_queries_missing");
  }
  const currentApkSha = smoke.current_apk?.sha256 || null;
  const latestInspectSha = smoke.latest_inspect?.apk_sha256 || null;
  const latestInspectMatchesCurrentApk = Boolean(currentApkSha && latestInspectSha && currentApkSha === latestInspectSha);
  const currentImageDb = smoke.current_apk?.rokid_image_db || null;
  const inspectedImageDb = latestInspectMatchesCurrentApk ? smoke.latest_inspect?.rokid_image_db : null;

  if (!currentImageDb?.found) {
    blockers.push("rokid_image_db_missing_for_a2_a3_image_tracking");
  } else if (!currentImageDb.streaming_assets_candidate) {
    blockers.push("rokid_image_db_not_packaged_under_streaming_assets");
  } else if (currentImageDb.contains_image_db_core === false || inspectedImageDb?.contains_image_db_core === false) {
    blockers.push("rokid_image_db_core_missing_for_a2_a3_image_tracking");
  } else if ((currentImageDb.contains_image_db_core === true && Number(currentImageDb.image_db_core_bytes || 0) < 1024)
    || (inspectedImageDb?.contains_image_db_core === true && Number(inspectedImageDb.image_db_core_bytes || 0) < 1024)) {
    blockers.push("rokid_image_db_core_too_small_for_a2_a3_image_tracking");
  } else if (currentImageDb.target_index_map?.ready !== true) {
    blockers.push("rokid_image_db_target_index_map_invalid_for_a1_a2_a3");
  }
  if (!adapterBoundary.has_compile_boundary || !adapterBoundary.has_adapter_resolver || !adapterBoundary.has_sdk_binding_probe) {
    blockers.push("compile_safe_adapter_boundary_incomplete");
  }
  if (smoke.latest_mutating_launch?.launch_ok === false && smoke.latest_mutating_launch?.launch_error_code === "102") {
    blockers.push("station_pro_launch_error_102_non_uxr_app");
  }
  const latestMutatingSha = smoke.latest_mutating_launch?.apk_sha256 || null;
  const latestMutatingLaunchMatchesCurrentApk = Boolean(currentApkSha && latestMutatingSha && currentApkSha === latestMutatingSha);
  if (currentApkSha && latestInspectSha && currentApkSha !== latestInspectSha) {
    warnings.push("latest_inspect_apk_sha_mismatch_current_apk");
  }
  if (currentApkSha && latestMutatingSha && currentApkSha !== latestMutatingSha) {
    warnings.push("latest_mutating_launch_apk_sha_mismatch_current_apk");
  }

  const minimalUxrProjectReady = blockers.length === 0;
  return {
    blockers,
    warnings,
    minimal_uxr_project_ready: minimalUxrProjectReady,
    hardware_ready_claim_allowed: false,
    next_required_proof: minimalUxrProjectReady
      ? (latestMutatingLaunchMatchesCurrentApk
        ? "operator_paired_live_sdk_binding_and_trusted_a1_a2_a3_observations"
        : "user_confirmed_current_apk_station_pro_install_launch_smoke")
      : "official_rokid_uxr_rokid_openxr_provider_import_and_project_validation"
  };
}

function renderMarkdown(report) {
  const lines = [
    "# UXR Readiness Doctor",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Verdict",
    "",
    `- Minimal UXR project ready: ${report.readiness.minimal_uxr_project_ready}`,
    `- Hardware-ready claim allowed: ${report.readiness.hardware_ready_claim_allowed}`,
    `- Next required proof: ${report.readiness.next_required_proof}`,
    "",
    "## Blockers",
    "",
    ...(report.readiness.blockers.length ? report.readiness.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Package State",
    "",
    ...Object.entries(report.unity_packages.packages).map(([key, pkg]) => `- ${key}/${pkg.package}: manifest=${pkg.in_manifest} lock=${pkg.in_lock} version=${pkg.manifest_version || pkg.lock_version || "missing"}`),
    "",
    "## Project State",
    "",
    `- ROKID_UXR define present: ${report.project_settings.rokid_uxr_define_present}`,
    `- XR settings files: ${report.project_settings.xr_settings_files.length}`,
    `- Android application id: ${report.project_settings.android_application_id}`,
    "",
    "## Android Manifest",
    "",
    `- Rokid SDK marker: ${report.android_manifest.metadata.rokid_sdk_uxr}`,
    `- UXR application mode 3D: ${report.android_manifest.metadata.rokid_uxr_application_mode_3d}`,
    `- OpenXR runtime query: ${report.android_manifest.queries.openxr_runtime}`,
    `- UXR launcher query: ${report.android_manifest.queries.uxr_launcher}`,
    "",
    "## Station Pro Evidence",
    "",
    `- Current APK: exists=${report.station_pro_evidence.current_apk?.exists ?? false} size=${report.station_pro_evidence.current_apk?.size_bytes ?? 0} sha=${report.station_pro_evidence.current_apk?.sha256_prefix ?? "n/a"}`,
    `- RKImage.db packaged: ${report.station_pro_evidence.current_apk?.rokid_image_db?.found ?? false}`,
    `- RKImage.db path: ${report.station_pro_evidence.current_apk?.rokid_image_db?.path ?? "missing"}`,
    `- RKImage.db target index map ready: ${report.station_pro_evidence.current_apk?.rokid_image_db?.target_index_map?.ready ?? false}`,
    `- Latest inspect network-ready: ${report.station_pro_evidence.latest_inspect?.network_ready_for_device ?? false}`,
    `- Latest inspect APK sha: ${report.station_pro_evidence.latest_inspect?.apk_sha256_prefix ?? "n/a"}`,
    `- Latest mutating launch OK: ${report.station_pro_evidence.latest_mutating_launch?.launch_ok ?? "n/a"}`,
    `- Latest mutating launch APK sha: ${report.station_pro_evidence.latest_mutating_launch?.apk_sha256_prefix ?? "n/a"}`,
    `- Latest mutating launch error: ${report.station_pro_evidence.latest_mutating_launch?.launch_error_code ?? "n/a"}`,
    "",
    "## Warnings",
    "",
    ...(report.readiness.warnings.length ? report.readiness.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Boundary",
    "",
    "This doctor is non-mutating. It does not install SDK packages, open Unity, install APKs, launch Station Pro apps, or claim hardware readiness."
  ];
  return `${lines.join("\n")}\n`;
}

function main() {
  const generatedAt = new Date();
  const stamp = generatedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  mkdirSync(outputRoot, { recursive: true });

  const unityPackages = inspectUnityPackages();
  const projectSettings = inspectProjectSettings();
  const androidManifest = inspectAndroidManifest();
  const adapterBoundary = inspectAdapterBoundary();
  const stationProEvidence = inspectSmokeEvidence();
  const readiness = buildFindings(unityPackages, projectSettings, androidManifest, adapterBoundary, stationProEvidence);

  const report = {
    schema: "innerworld-uxr-readiness/v1",
    generated_at: generatedAt.toISOString(),
    ok: true,
    privacy: {
      full_serials_included: false,
      private_ips_included: false,
      mac_addresses_included: false,
      raw_pairing_codes_included: false,
      note: "Only package/project status and sanitized smoke summaries are reported."
    },
    project: {
      unity_project: path.relative(root, unityProject).replace(/\\/g, "/"),
      project_hash_prefix: shaPrefix(unityProject)
    },
    unity_packages: unityPackages,
    project_settings: projectSettings,
    android_manifest: androidManifest,
    adapter_boundary: adapterBoundary,
    station_pro_evidence: stationProEvidence,
    readiness
  };

  const jsonPath = path.join(outputRoot, `uxr-readiness-${stamp}.json`);
  const mdPath = path.join(outputRoot, `uxr-readiness-${stamp}.md`);
  const latestJsonPath = path.join(outputRoot, "uxr-readiness-latest.json");
  const latestMdPath = path.join(outputRoot, "uxr-readiness-latest.md");
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);

  writeFileSync(jsonPath, json, "utf8");
  writeFileSync(mdPath, markdown, "utf8");
  writeFileSync(latestJsonPath, json, "utf8");
  writeFileSync(latestMdPath, markdown, "utf8");

  console.log(JSON.stringify({
    ok: true,
    schema: report.schema,
    minimal_uxr_project_ready: report.readiness.minimal_uxr_project_ready,
    hardware_ready_claim_allowed: report.readiness.hardware_ready_claim_allowed,
    blockers: report.readiness.blockers,
    latest_json: latestJsonPath,
    latest_markdown: latestMdPath
  }, null, 2));
}

main();
