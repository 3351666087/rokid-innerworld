# InnerWorld Rokid Prototype

本工程服务于 Rokid「镜见 InnerWorld / 校园记忆展墙」最终方案。当前目标是在没有硬件的阶段，先把本机 localhost 闭环跑成可演示、可打包、可迁移到真机的版本。

## Quick Start

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run dev
```

默认地址：

- Web demo: `http://localhost:5177/`
- API health: `http://localhost:5177/api/health`
- Ops status: `http://localhost:5177/api/ops/status`
- Space data: `http://localhost:5177/api/spaces/innerworld_campus_wall`
- Wall calibration: `http://localhost:5177/api/calibration/wall`
- Field markers: `http://localhost:5177/api/field/markers`

现场有 Rokid/手机从同一局域网访问这台 Windows 主控机时，用 LAN 模式：

```powershell
npm run dev:lan
npm run unity:config -- http://<Windows主控机IP>:5177
```

## Architecture Contract

SQLite (`data/innerworld.sqlite`) is the authoritative local/field store now. It owns runtime state, write-back records, safe dataset catalog, device sessions, and bounded device events for the Windows host; it is not a throwaway demo database.

Server deployment preserves the same Space API, mission state machine, write-back flow, device runtime, AI schema/prompt, and SQLite-backed store contract. Moving from localhost/LAN to a public host is a deployment change, not a database-contract rewrite. Raw private evidence, loan-image private fields, `.env`, `secrets/`, and `local-secrets/` stay outside the database, API, packages, and GitHub unless explicitly sanitized.

Wall calibration is now part of the runtime contract, not a future note: Web can rehearse A1/A2/A3 marker lock through `/api/calibration/observations`, and Unity reads `/api/calibration/wall` during startup before device registration. Unity also posts simulator/manual rehearsal observations through the same route, while the UI and heartbeat label them as rehearsal/status evidence rather than real hardware readiness.

Field markers are also a runtime contract now: `data/field_markers.json` and `/api/field/markers` bind printable A1/A2/A3 cards to the wall calibration manifest, expected poses, marker ids, tracking modes, operator actions, and evidence sources. The field kit PDF is a site installation and acceptance artifact, not a brochure.

## SQLite Backup

The runtime database is private and git-ignored, but it is not disposable. Create a verified field backup before release packaging, restore tests, or server handoff:

```powershell
npm run db:backup
npm run db:backup:verify
npm run db:backup:list
```

Backups default to `D:\Downloads\RokidCache\sqlite-backups` and include a SHA256 manifest plus `sqlite-backup-latest.md`. Restore is explicit and guarded:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/sqlite-backup.ps1 -RestoreFrom "D:\Downloads\RokidCache\sqlite-backups\innerworld-sqlite-YYYYMMDD-HHMMSS.sqlite" -Force
```

Restore first creates a `innerworld-before-restore-*.sqlite` backup of the current database. Do not commit SQLite backups or restore manifests.

## Checks

```powershell
npm run reset
npm run check:contract
npm run check:device
npm run check:readonly
npm run check:ops
npm run check:unity
npm run env:doctor
npm run ops:monitor:once
npm run evidence:rehearsal -- --reset-after
npm run field:preflight
npm run pdf:fieldkit
npm run check:field-markers
npm run release:index
npm run server:package
npm run server:deploy-plan
npm run server:deploy-dry-run
npm run server:smoke
npm run package:audit
npm run cache:temp:report
npm run cache:report
```

`/api/health` 对 Unity 轮询是 cache-safe 的，返回 `Cache-Control: no-store`，并包含 demo readiness、空间、锚点、信标和任务状态。API 路由支持 CORS 和 `OPTIONS` preflight，供 UnityWebRequest、浏览器 fallback 和后续 Rokid 接入共用。
Web demo 右侧「现场状态」读取 `/api/ops/status`，用于现场快速查看 API、包、部署预演、LAN 预检和后台巡检。
`npm run check:ops` 会自动验收这个现场状态接口和首页面板；`verify:release` 会用严格模式确认 latest 主包、server-only 包、deploy dry-run 和巡检证据都能被页面读取。
`npm run check:device` 会验收 Rokid 真机接入用的 `/api/device/bootstrap`、AI schema/prompt 和 bootstrap 中列出的核心 URL。

`npm run env:doctor` 会汇总 Node/npm/Java/Maven/Unity/Android 模块、C/D 盘空间、端口、API health、Windows EXE、Android APK、PDF、最新主包和 server-only 包，并把证据写入 `output/env-doctor`。C 盘低于 25GB 会作为 warning 记录，低于 8GB 才按构建安全阈值处理。

`npm run ops:monitor:once` 会跑一次长期巡检，包含 env doctor、Temp report 和 cache report；需要立刻带安全清理跑一轮时用 `npm run ops:monitor:clean:once`。长时间本地推进时用 `npm run ops:monitor`，需要高频安全清理时用 `npm run ops:monitor:clean`，输出在 `output/ops-monitor`。
查看后台巡检状态用 `npm run ops:monitor:status`。

`npm run evidence:rehearsal` 会按 90 秒流程自动走完 reset、读取、寻找年份、加入活动、写回、切 User B，并把 JSON/Markdown 证据写入 `output/demo`。加 `-- --reset-after` 时，证据保存后会把本地状态恢复到干净初始态。

`npm run field:preflight` 会自动识别 Windows 主控机 LAN IP，检查 localhost/LAN health，更新 Unity API 地址，按 LAN URL 重渲染现场 PDF，并把 JSON/Markdown 预检证据写入 `output/field-preflight`。如果 LAN health 不通，脚本会拒绝更新 Unity 配置或渲染 LAN QR PDF；现场正式交接用 `npm run dev:lan` 后运行 `npm run field:preflight -- -RequireLan`，并允许 Windows Firewall 私有网络访问 Node.js。

`npm run pdf:fieldkit` 会调用 sibling `pdf-renderer` 的 Java/OpenHTMLToPDF 渲染器，输出可打印现场包到 `output/pdf/rokid_innerworld_field_kit.pdf`。现场 LAN 版可先设置 `FIELD_KIT_PUBLIC_URL=http://<Windows主控机IP>:5177/` 再渲染。

`npm run check:field-markers` 会验证 A1/A2/A3 marker manifest、`/api/calibration/wall` 派生的 expected pose、A1 QR / A2-A3 image target 类型，以及 PDF/HTML 内可搜索的 `A1:qr-entry`、`A2:image-target`、`A3:image-target` token。

`npm run release:index` 会汇总最新主包、server-only 包、EXE/APK/PDF、环境医生、现场预检和彩排证据，输出 `output/release-index/release-index-latest.md` / `.json`。`verify:release` 会在主包审计后自动运行它，因此这个文件是交付/上传前最方便看的总索引。

`npm run server:package` 会生成轻量 Space Server 发布包到 `output/server-release`。它只包含 Node server、Web demo、`space_demo.json`、AI schema/prompt、文档和启动脚本，用于先在 localhost 解包烟测，再上传到阿里云或其他小主机。

`npm run server:deploy-plan` 会根据最新 server-only zip/manifest 生成 `output/server-release/deploy-plan-latest.md` / `.json`，列出上传路径、Linux 启动、systemd、Caddy 和 Nginx 反代示例。它只写本地计划，不会连接或上传服务器。

`npm run server:smoke` 会把最新 server-only zip 解到 `D:\Downloads\RokidCache\server-release-smoke`，用临时端口启动、跑 health/read-only/rehearsal，然后删除临时目录。`npm run package:audit` 会审计最新主交付包和内嵌 server release 的 SHA、必需文件和禁入目录。`npm run cache:temp:report` 会 dry-run 检查用户 Temp 里的 VS/Android/.NET 安装器残留候选；确认无进程引用后可运行 `npm run cache:temp:clean`。`npm run verify:release` 串联主要检查、PDF、server release、主包、审计和缓存报告。

## GitHub Auto Sync

```powershell
npm run git:sync:dry
npm run git:sync -- -Message "ops: sync InnerWorld checkpoint"
npm run git:sync -- -SkipPush -Message "local checkpoint"
npm run git:sync:loop
```

`git:sync:dry` reports the exact files that would be staged, committed, and pushed. `git:sync` runs one guarded pass with non-ignored untracked files included. `git:sync:loop` repeats every 300 seconds; for a different cadence, run `powershell -NoProfile -ExecutionPolicy Bypass -File tools/git-auto-sync.ps1 -Loop -IntervalSeconds 600 -IncludeUntracked`.

The sync script exits cleanly when there are no eligible changes. It refuses ignored/runtime/private paths such as `.env`, `*.secret*`, `secrets/`, `local-secrets/`, `output/`, `node_modules/`, `data/runtime_state.json`, `data/innerworld.sqlite*`, Unity `Library`/`Temp`/`Obj`, caches, and build outputs. If one of those files is already staged manually, the script refuses to commit until it is unstaged.

## Deliverables

- `apps/web-demo`: 第一视角 Web 展墙 demo。
- `server/space-server`: 本地 Space Server，同时托管静态页面和 API。
- `data/space_demo.json`: 展墙、A1/A2/A3 锚点、信标、任务、服务动作的数据源。
- `data/field_markers.json`: 现场可打印 marker manifest，绑定 A1/A2/A3 marker id/type、tracking modes、operator action 和 evidence source。
- `data/innerworld.sqlite`: 本地权威 SQLite store，由服务运行时生成并维护；不进入 Git 或交付包。
- `data/runtime_state.json`: legacy/runtime fallback 状态文件，由服务自动生成；不进入 Git 或交付包。
- `ai/schema.json` / `ai/prompt.md`: 眼镜 HUD 可消费的 AI 输出约束和提示词。
- `apps/unity-shell`: Unity fallback 工程。
- `output/unity-windows/InnerWorldRokid.exe`: Windows 第一视角 fallback。
- `output/unity-android/InnerWorldRokid.apk`: Android fallback APK，用于验证 Unity Android/Rokid 构建链路。
- `docs/demo-runbook.md`: 现场设备、启动、彩排和兜底流程。
- `docs/cache-ops.md`: C 盘缓存巡检与安全清理规则。
- `docs/server-deploy.md`: 轻量 Space Server 上传服务器前的本地打包、烟测和部署口径。
- `docs/rokid-device-integration.md`: Rokid 真机/AR Studio 接入 bootstrap、API 路由和 LAN 注意事项。
- `output/server-release/deploy-plan-latest.md`: 最新 server-only 包的上传、systemd、Caddy/Nginx 本地交接计划。
- `output/env-doctor/env-doctor-latest.md`: 本机开发环境、磁盘、端口、API 和关键产物巡检证据。
- `output/field-preflight/field-preflight-latest.md`: 现场 LAN URL、Unity 配置、PDF QR 和健康检查证据。
- `output/release-index/release-index-latest.md`: 最新主包、server-only 包、关键产物和证据报告的一页式索引。
- `output/pdf/rokid_innerworld_field_kit.pdf`: 可打印现场执行包，包含 QR、设备、流程、A1:qr-entry / A2:image-target / A3:image-target 锚点牌和操作员清单。

## Package

```powershell
npm run package:demo
```

输出目录：`C:\Users\33516\Documents\Rokid\innerworld-rokid\output\package`

打包脚本会生成 zip、manifest、SHA256、缓存前后报告，并默认只保留最近 2 组包。包内不包含 Unity `Library`、`Temp`、`node_modules`、`.git` 或 D 盘下载缓存。C 盘低于 25GB 会警告，低于 8GB 会停止；Temp 清理由 `cache:temp:report/clean` 单独守护，避免 Unity/Android/VS 安装缓存把 C 盘撑爆。

包内也不会携带 `data/runtime_state.json`，服务启动时会自动生成干净运行态，避免把上一次彩排的 complete 状态带给现场。

## Device Plan

最终现场展示以 Windows 主控机为核心：它运行 localhost/LAN Space Server，投屏到大屏展示 Web 或 Unity 第一视角，同时给 Rokid/手机提供同一套 API。硬件到场前，Web demo 和 Unity shell 已能完整展示读信标、任务推进、服务动作、写回和第二用户读取；硬件到场后替换输入与显示层，数据契约和写回闭环不变。
