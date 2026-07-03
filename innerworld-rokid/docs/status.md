# Status

## 2026-07-03

- Kepler final-reviewed the teammate-docs bus checkpoint and cleared it for commit/push. The remaining P0 instruction is to keep driving `station_pro_trusted_hardware_session`: UXR3.0 validation, APK install/run, live heartbeat, then operator-paired trusted A1/A2/A3 observations and `/api/field/acceptance`.
- Kepler re-reviewed teammate commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` for real-device adoption. The result is now recorded in `docs/teammate-docs-bus.md`: P0 merges UXR3.0 validation, RKCameraRig, RKInput 3DoF ray, PointableUI, A2/A3 image target library, SLAM/head tracking heartbeat, operator-paired live SDK proof, and trusted calibration observations; P1 keeps near/far layout, bounded gestures, controlled audio, and controlled TimeMark authoring; P2/reference keeps institution backend, social/platform features, broad routes, spatial drawing, and dashboards out of the current hardware lane.
- The 13-page teammate PDF is treated as evidence for Campus Hidden Layer / Spatial URL / fixed-place TimeMark / AI semantic compression / one-place demo, not as permission to pivot into account/social/platform scope during P0.
- Real-device phase started. The Windows development machine now sees a connected Rokid Station Pro over USB ADB as model `RG-stationPro` / device `stationPro`, Android 12, with an ADB interface and `device` state.
- Full serial numbers, USB instance ids, MAC addresses, private IPs, and pairing codes are treated as private hardware identifiers. They must not be committed to docs, release evidence, public JSON, screenshots, or GitHub.
- `station_pro_trusted_hardware_session` is the new P0 checkpoint. The immediate path is: sanitized device/toolchain probe -> operator pairing -> install/run Unity or AR Studio APK on Station Pro -> live heartbeat -> trusted A1/A2/A3 observations -> field acceptance and evidence replay.
- A second connected glasses line identified as Rokid x Bolon remains a secondary research lane. It does not replace the Max Pro + Station Pro AR Studio mainline unless it proves the same UXR/RKCameraRig/RKInput/image target/SLAM development path.
- Current evidence is enough to begin true hardware integration work, but it is not yet hardware-ready acceptance. Simulator/manual/fallback evidence still remains rehearsal only.

## 2026-07-02

- 长期目标保持 active：在 `C:\Users\33516\Documents\Rokid` 内用本机完整权限持续推进 Rokid「镜见 InnerWorld / 校园记忆展墙」。
- Windows 开发环境可用：Unity Hub、Unity Editor `6000.3.19f1`、Android SDK/NDK/OpenJDK、Node、Maven `3.9.16` 已安装。
- 本地服务统一为 `http://localhost:5177`；LAN 模式用 `npm run dev:lan` 绑定 `0.0.0.0`，供 Rokid/手机访问 Windows 主控机 IP。
- Web demo 已通过 Chrome 插件完成可视彩排，并在本轮重新验证：点击「快速彩排」后最终状态为 `User B`、`complete`、写回点显示「后来者看见了新信标」，log 中 `current_step` 为 `write_back`。
- 2026-07-02 11:24 Chrome 插件复验结果：`/api/state` 显示 `active_user=B`、`mission_state=complete`、`current_step_index=3`、`completed_steps=[read, find_year, service_action, write_back]`、`beacons=3`；最新写回信标为 `B_WRITE_1782962678108`，锚点 `A3`，写回时间 `2026-07-02T03:24:38.108Z`。
- Space Server 已支持 CORS、`OPTIONS` preflight、`/api/health`、no-store JSON，并通过 `npm run check:unity`。
- Unity shell 支持可配置 API 地址：命令行 `--innerworld-api=...`、环境变量 `INNERWORLD_API_BASE_URL`、持久化配置、`StreamingAssets`、`Resources` 包内配置都可用。
- Windows fallback 已重建：`output\unity-windows\InnerWorldRokid.exe`，并复制 `InnerWorldRokid_Data\StreamingAssets\innerworld-config.json`。
- Windows Unity fallback 已用 Windows 应用控制实机窗口验收：HUD 显示 `LOCALHOST LIVE`，A1/A2/A3 三锚点可见，热键提示可读；按 `Space, Space, S, W, B, R` 后窗口和 API 都进入 `active_user=B`、`mission_state=complete`、`completed_steps=4`、`beacon_count=3`。
- 修复 Unity Player 粉墙/黑场问题：不再用 `Shader.Find("Standard")` 直接创建运行时材质，改为跨 Built-in/URP 的可用 shader 查找和 renderer 现有材质兜底；Player.log 已无材质空引用异常。
- 修复 Space Server 完成态归一：所有任务完成或包含 `write_back` 时强制 `mission_state=complete`，避免客户端切 User B 时把状态降回 `entered`。
- Android fallback APK 已重建：`output\unity-android\InnerWorldRokid.apk`，生成时间 `2026-07-02 11:19:30`，SHA256 `D507E209A245CB663FF775E85B098AF159DE977E642B45606DA1F8BE35285574`。
- Android APK 已用 `aapt` 验证：manifest 中包含 `android.permission.INTERNET`、`android:usesCleartextTraffic=true`、`android:networkSecurityConfig=@xml/...`。
- Android 配置兜底已验证：APK 内包含 `assets/innerworld-config.json`，Unity `Resources` 配置也被打入 `assets/bin/Data/cb7d38ef34a54f68b7f0196e2b07d22a`。
- `tools/set-unity-config.ps1` 会同时更新 `Assets\StreamingAssets\innerworld-config.json` 和 `Assets\Resources\innerworld-config.json`，避免 LAN IP 配置分叉。
- 交付包已重新生成并验包：包含 Android 插件、Resources 配置、StreamingAssets 配置、Windows fallback、Android APK、文档和缓存报告，禁入目录计数为 0。
- 新增 `npm run evidence:rehearsal`：自动走完 reset、读取、寻找年份、加入活动、写回、切 User B，并把 JSON/Markdown 验收证据写入 `output/demo`。带 `-- --reset-after` 时保存证据后恢复初始态。
- `npm run evidence:rehearsal -- --reset-after` 已验证通过，最新证据写入 `output\demo\rehearsal-evidence-latest.json` / `.md`：最终态为 `active_user=B`、`mission_state=complete`、`completed_steps=4`、`beacon_count=3`，随后 reset 回 `entered`、2 个信标、0 个完成步骤。
- 打包脚本已排除 `data/runtime_state.json`，避免把 Chrome/Unity 彩排后的 `complete` 运行态带进交付包；解包运行烟测已验证：包内 server 首次启动会自动生成运行态，`/api/health` 返回 `entered`、2 个信标、0 个完成步骤。
- 新增并验证 `npm run pdf:fieldkit`：通过 sibling `pdf-renderer` 的 Java/OpenHTMLToPDF 渲染可打印现场包 `output\pdf\rokid_innerworld_field_kit.pdf`，内容包含入口 QR、设备页、90 秒流程、A1/A2/A3 锚点牌、操作员清单和自动彩排证据摘要。`pdfinfo` 显示 7 页 A4；已用 Poppler 渲染 PNG 目检封面、启动页、锚点牌和操作员页，无文字重叠或中文缺字。
- 新增 `npm run server:package` 和 `docs\server-deploy.md`：生成轻量 Space Server 发布包，包含 Node server、Web demo、`space_demo.json`、AI schema/prompt、文档和 Windows/Linux 启动脚本；明确排除 `data/runtime_state.json`、Unity 输出、`node_modules`、`.git` 和缓存，用于先本地解包烟测，再上传小主机。
- 新增 `npm run server:smoke`、`npm run package:audit`、`npm run verify:release`：把 server-only 解包烟测、主包/内嵌 server release SHA 校验、必需文件检查和禁入目录检查固化为脚本，减少现场前手工验包失误。
- 新增 `npm run server:deploy-plan`：根据最新 server-only zip/manifest 生成 `output\server-release\deploy-plan-latest.md` / `.json`，包含上传路径、Linux 启动、systemd、Caddy 和 Nginx 反代示例；只写本地计划，不连接服务器。
- 新增 `npm run env:doctor`：汇总 Node/npm/Java/Maven/Unity/Android 模块、磁盘、端口、API health、Windows EXE、Android APK、PDF、最新主包和 server-only 包，证据写入 `output\env-doctor`，并接入 `verify:release` 和主包审计。
- 新增 `npm run field:preflight`：自动识别 LAN IP、检查 localhost/LAN health、更新 Unity API 地址、按 LAN URL 重渲染现场 PDF，并把现场预检证据写入 `output\field-preflight`；LAN 不通时默认拒绝更新 Unity/PDF，正式现场可用 `-RequireLan` 强校验，主包审计会检查该脚本和 latest 报告存在。
- 新增 `npm run release:index`：汇总最新主包、server-only 包、EXE/APK/PDF、环境医生、现场预检和彩排证据，输出 `output\release-index\release-index-latest.md` / `.json`；`verify:release` 在主包审计和 post-package 环境医生后自动运行。
- `tools\render-field-kit-pdf.ps1` 已改为优先使用 `D:\Downloads\RokidCache\m2-repository` 作为 Maven 本地仓库；`cache:report` 新增 Maven C 盘仓库、Windows Temp 总量和 D Maven cache 报告项，便于持续观察 C 盘风险。
- 新增并试运行 `npm run cache:temp:report` / `npm run cache:temp:clean`：只处理用户 Temp 下 6 小时以前、可识别为 VS/Android/.NET 安装器残留且无进程引用的目录，并显式跳过 junction/symlink 等 reparse point；本轮删除 `glgyitip`、`15tbxetl`、`b54aud4l.eiq`，释放约 7.416GB。
- C 盘仍接近 25GB 警戒线，清理后约 23.741GB 可用；继续高频执行 `npm run cache:temp:report`、`npm run cache:report` / `npm run cache:clean`。不随意删除 Unity `Library`。

## Next

- 重新生成最终交付包并验包，确认服务器部署计划、环境医生、release index、现场 LAN 预检脚本、Windows/Android fallback、Space Server 状态机修复和文档全部进入 zip。
- 硬件到场后，把 Rokid AR Studio 输入/显示层接到同一套 Space API 和数据契约。
