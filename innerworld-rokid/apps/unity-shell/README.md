# Unity Shell

Unity Hub、Unity Editor `6000.3.19f1`、Android SDK/NDK/OpenJDK 和 Maven `3.9.16` 已安装。本目录预留给 Rokid AR Studio / Android / OpenXR 版本，当前先提供 Windows 与 Android fallback。

## Runtime Config

最终生效优先级：

1. 命令行：`--innerworld-api=http://<host>:5177`、`--innerworld-space=innerworld_campus_wall`
2. 环境变量：`INNERWORLD_API_BASE_URL`、`INNERWORLD_SPACE_ID`
3. 持久化配置：`Application.persistentDataPath\innerworld-config.json`
4. Windows/编辑器包内配置：`Assets\StreamingAssets\innerworld-config.json`
5. Android 兜底配置：`Assets\Resources\innerworld-config.json`
6. Inspector 默认值：`http://localhost:5177`

更新包内配置：

```powershell
npm run unity:config -- http://localhost:5177
npm run unity:config -- http://<Windows主控机IP>:5177
```

Windows fallback 运行在主控机上时可以用 `localhost`；Android/Rokid 真机必须使用 Windows 主控机局域网 IP，并让服务用 `npm run dev:lan` 启动。

Windows fallback 已做过可视验收：三锚点可见，HUD 显示 localhost 状态，键盘 `Space, Space, S, W, B, R` 可走完写回和 User B 读取闭环。运行时材质使用可用 shader 查找和默认材质兜底，避免 Player 中 `Shader.Find("Standard")` 为空导致粉墙或 Awake 中断。

## Runtime Service Layer

`Assets/Scripts/Runtime` 现在提供可被 `InnerWorldDemoController` 后续接入的薄运行时层，不引入 Rokid SDK，也不发起网络请求：

- `InnerWorldRuntimeConfig`：集中管理 `base_url`、`space_id`、`device_profile`、展示模式、轮询间隔、请求超时和离线 fallback。接入时可用 `FromSources(json, env, args)` 替换 controller 内部的 `ApplyRuntimeConfig`，仍保持命令行 > 环境变量 > JSON > 默认值的优先级。
- `InnerWorldMissionState`：保存 mission steps、`current_step_index`、`completed_steps` 和当前锚点选择。controller 后续从 `/api/spaces/{id}` 或 `/api/state` 同步 runtime 字段，再用 `MarkStepComplete`、`SelectAnchor`、`FocusAnchor` 驱动本地 HUD 和离线 fallback。
- `InnerWorldEvidenceModels`：对齐 `innerworld-evidence-chain/v1`、`innerworld-session-plan/v1`、`/api/evidence/chain`、`/api/session/plan` 的 DTO。当前只建模证据链、session plan、endpoint、release、hardware、writeback 等字段，真正请求仍应放在 Protocol/API 层。
- `RokidPresentationMode`：把 `rokid_glasses`、`on_site_display`、`desktop_fallback` 和 `auto` 解析成轻量策略。后续接 Rokid/AR Studio SDK 时，替换点是 `RokidInputAdapterKind.RokidSdk` 与 `RokidDisplayAdapterKind.RokidSdkOverlay`；Windows/Editor 继续走 `EditorRokidInputSource` 和桌面 HUD。

建议集成顺序：先让 controller 读 `InnerWorldRuntimeConfig` 创建 `SpaceApiClient`，再把后端 mission/runtime 映射到 `InnerWorldMissionState`，随后用 `RokidPresentationStrategy.Resolve` 决定输入源和 HUD renderer。证据链 DTO 可作为验收面板或 debug overlay 的只读模型，避免把 rehearsal/evidence 逻辑塞回 controller。

## Controller Runtime Wiring

`InnerWorldDemoController` now consumes the Runtime service layer directly:

- Config is loaded through `InnerWorldRuntimeConfig.FromCurrentProcess(...)`, with command line and environment overrides still taking priority over packaged JSON. Supported runtime fields include `base_url`, `space_id`, `device_profile`, `presentation_mode`, `nearby_radius_meters`, polling/health/request timeout values, `offline_fallback_enabled`, and `active_user`.
- `SpaceApiClient` is created from that config, including nearby radius and the evidence/session endpoints exposed by the backend contract.
- Device bootstrap client hints update request timing, and bootstrap runtime data updates the active user, mission state, completed steps, current step, and device beacon count.
- Space snapshots are mapped into `InnerWorldMissionState`; gaze focus and anchor selection update the runtime mission state used by the HUD.
- Evidence chain and session plan contracts are fetched as read-only runtime models for the HUD/debug surface. If the backend is unavailable, fallback behavior is controlled by `offline_fallback_enabled`.
- Rokid hardware replacement points are explicit: `RokidAdapterResolver.Resolve(...)` selects input/display adapters from `RokidPresentationStrategy`. `ROKID_UXR` is the only compile symbol allowed to expose future SDK references, while desktop/editor builds continue through `EditorRokidInputSource` and the fallback HUD.
- `RokidSdkBindingProbe` separates the four hardware-readiness states: `fallback_only`, `boundary_compiled`, `package_detected`, and `live_binding_ready`. Treat only `live_binding_ready` as proof that real Rokid SDK input and overlay adapters are active.

## A1 Spatial Entry Slice

`a1_spatial_entry_experience` is the first hardware-independent viewer-side slice for the real campus wall. In desktop/Android fallback, Space/Enter at A1 performs a deliberate entry confirmation in the 0.4m-0.5m window, records `entry_confirmation_status`, and drives the `开启空间层` transition in HUD and heartbeat text.

Fallback may report `a1_entry_lock_ready` after the deliberate confirmation so the operator can rehearse the flow, but it keeps `trusted_hardware_proof_ready=false` and `fallback_hardware_ready false`. Hardware acceptance still depends on the real Rokid/field evidence contracts.

## Unity Ledger Fallback

The Unity protocol layer is prepared for the backend mission ledger and service action ledger endpoints:

- `GET /api/ledger/events` returns an append-only event list for mission progress, write-back reviews, and service action status transitions.
- `GET /api/ledger/summary` returns the compact review state Unity can show in HUD/debug panels: mission state, completed step count, service action counts, and audit timestamps.
- `SpaceApiClient` exposes `LedgerEventsUrl`, `LedgerSummaryUrl`, and matching endpoint-map entries (`ledger_events`, `ledger_summary`) so bootstrap/session-plan responses can override paths without controller rewiring.

Fallback behavior should stay read-only. Windows/Android fallback can poll the summary for a lightweight HUD line during on-site review, and fetch events only when the debug surface is open or an auditor asks for the trail. If either ledger endpoint is unavailable, continue using the current mission/runtime snapshot and offline fallback; do not block gaze, write-back, or service-action rehearsal on ledger reads.

## Android Network

`Assets\Plugins\Android\InnerWorldNetwork.androidlib` 提供 Android manifest 合并项：

- `android.permission.INTERNET`
- `android:usesCleartextTraffic=true`
- `android:networkSecurityConfig=@xml/innerworld_network_security_config`

当前 APK 已用 `aapt` 验证这些字段存在。正式上公网服务时再切 HTTPS。

## Batchmode

验证场景：

```powershell
& "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe" `
  -batchmode -nographics -quit `
  -projectPath "C:\Users\33516\Documents\Rokid\innerworld-rokid\apps\unity-shell" `
  -executeMethod InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.ValidateScene `
  -logFile "C:\Users\33516\Documents\Rokid\innerworld-rokid\output\demo\unity-validate-scene.log"
```

构建 Windows fallback：

```powershell
& "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe" `
  -batchmode -nographics -quit `
  -projectPath "C:\Users\33516\Documents\Rokid\innerworld-rokid\apps\unity-shell" `
  -executeMethod InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.BuildWindowsFallback `
  -logFile "C:\Users\33516\Documents\Rokid\innerworld-rokid\output\demo\unity-build-windows.log"
```

输出：`C:\Users\33516\Documents\Rokid\innerworld-rokid\output\unity-windows\InnerWorldRokid.exe`

构建 Android fallback：

```powershell
$unity = "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe"
$args = @(
  "-batchmode", "-nographics", "-quit",
  "-projectPath", "C:\Users\33516\Documents\Rokid\innerworld-rokid\apps\unity-shell",
  "-executeMethod", "InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.BuildAndroidFallback",
  "-logFile", "C:\Users\33516\Documents\Rokid\innerworld-rokid\output\demo\unity-build-android.log"
)
$p = Start-Process -FilePath $unity -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
exit $p.ExitCode
```

输出：`C:\Users\33516\Documents\Rokid\innerworld-rokid\output\unity-android\InnerWorldRokid.apk`
