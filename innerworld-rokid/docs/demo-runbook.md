# Demo Runbook

## 现场成品

最终成品是一套「空间记忆展墙」体验：观众在入口看到 A1/A2/A3 三个空间锚点，读取校园记忆信标，按任务推进，触发服务动作，再写回一句自己的记忆。第二个用户进入后能在同一空间看到刚写回的新信标。

硬件未到时，Web demo 和 Windows Unity fallback 就是完整可演示版本；硬件到场后，Rokid 只替换输入和显示层，Space API、数据、任务、写回和服务动作不变。

## 设备

- Windows 主控机：运行 Space Server，负责 localhost/LAN 服务、投屏、录屏、重启和兜底。
- 大屏/投影/HDMI：展示第一视角、API 状态和讲解过程。
- Rokid 设备：硬件到场后接入同一套 Space API，展示真机 AR 层。
- 手机：可作为第二用户、扫码入口、热点或拍摄补位。
- 打印物料：入口二维码、A1/A2/A3 锚点牌、路线卡。

## 启动

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run dev
```

打开 `http://localhost:5177/`。

Web demo 右侧「现场状态」会显示 API、最新主包、server-only 包、部署预演、LAN 预检和后台巡检状态；同一数据也可用 `http://localhost:5177/api/ops/status` 读取。

如果 Rokid/手机要从同一局域网访问 Windows 主控机：

```powershell
npm run dev:lan
npm run unity:config -- http://<Windows主控机IP>:5177
```

外部设备访问 `http://<Windows主控机IP>:5177/`。本机投屏只需要默认 `npm run dev` 和 `http://localhost:5177/`。

## 终局架构规则

- SQLite (`data/innerworld.sqlite`) 现在就是 Windows 主控机的本地权威 store，负责运行态、写回、设备会话、安全数据目录和有界设备事件；它不是临时 demo 存储。
- `data/space_demo.json` 等公开种子文件只用于初始化和可审计交付，运行期权威状态以 SQLite-backed store 和 Space API 为准。
- 上传到服务器时保持同一套 Space API、mission state、write-back、device runtime、AI schema/prompt 和 evidence contract。服务器化是部署位置变化，不是换一套数据库契约。
- 原始私密证据、借用单私人字段、API key、`.env`、`secrets/`、`local-secrets/` 不进入数据库、API、包或 GitHub；只有明确清洗过的字段可以进入公开数据和文档。
- 文档和交接话术不要再写“以后换数据库”或“临时数据库”。如果后续需要远端备份/复制，只能作为同步层追加，不能改变现有本地权威 store 契约。

## 彩排检查

```powershell
npm run reset
npm run check:device
npm run check:readonly
npm run check:ops
npm run check:unity
npm run env:doctor
npm run evidence:rehearsal -- --reset-after
npm run field:preflight
npm run pdf:fieldkit
npm run check:field-markers
npm run check:field-acceptance
npm run release:index
npm run server:package
npm run server:deploy-plan
npm run server:smoke
npm run package:audit
```

页面右侧「快速彩排」会自动走完读取、服务动作、写回、切换 User B。正式 90 秒演示不要依赖等按钮拖满时间，由讲解节奏控制停顿和镜头。

`check:device` 会验收 Rokid/AR Studio 接入用的 `/api/device/bootstrap`、AI schema/prompt 和所有关键设备端 URL；硬件到场前后都先跑它。

Chrome 插件验收时保留本机标签页，确认页面可见状态为 `User B / complete / write_back`，并同步查看 `/api/state` 中 `completed_steps=4`、`beacons=3`。

`env:doctor` 会把 Node/npm/Java/Maven/Unity/Android 模块、磁盘、端口、API health、Windows EXE、Android APK、PDF、最新包和 server-only 包写入 `output/env-doctor/env-doctor-latest.md`，用于现场前确认这台 Windows 主控机没有环境漂移。

`evidence:rehearsal` 会把本轮自动彩排证据写到 `output/demo/rehearsal-evidence-*.json` 和同名 Markdown；加 `--reset-after` 可以保存证据后恢复初始状态，适合打包前使用。

`field:preflight` 会识别 Windows 主控机 LAN IP，检查 `localhost` 和 `http://<Windows主控机IP>:5177/`，更新 Unity 配置，按 LAN URL 重渲染现场 PDF，并把证据写入 `output/field-preflight/field-preflight-latest.md`。如果 LAN API 不通，脚本会拒绝更新 Unity 配置或渲染 LAN QR PDF；现场正式交接用 `npm run dev:lan` 后运行 `npm run field:preflight -- -RequireLan`，并允许 Windows Firewall 私有网络访问 Node.js。

`pdf:fieldkit` 会生成 `output/pdf/rokid_innerworld_field_kit.pdf`，用于打印入口 QR、A1/A2/A3 锚点牌、90 秒流程和操作员清单。若现场要扫码访问局域网主控机，先设置 `FIELD_KIT_PUBLIC_URL=http://<Windows主控机IP>:5177/` 后重新渲染。

`check:field-markers` 会验收 `data/field_markers.json`、`/api/field/markers`、`/api/calibration/wall` 和现场包 PDF/HTML：A1 必须是 `A1:qr-entry`，A2/A3 必须是 `image_target`，三张卡片都要带 expected pose、tracking modes 和 evidence source。

Web 右侧 `Wall Calibration / Field Kit` 面板要同步确认三件事：`print kit ready` 只代表现场包和三张卡片齐备，`simulator rehearsal` 只代表本机演练观测，`hardware ready/pending` 才代表 QR/image tracking/SLAM 等硬件观测是否足够进入真机展示。

Web 右侧 `Field Acceptance / Site Gates` 面板是现场验收总线：它读取 `/api/field/acceptance`，一次性列出 print kit、simulator rehearsal、hardware alignment、mission/write-back loop、SQLite evidence、release/deploy chain 和 hardware kit。正式展示前先看这里的 blocking items；`rehearsal_ready` 可以支持本机演练，但只有 `hardware_acceptance_ready` 才代表真机硬件对齐也过线。

`check:field-acceptance` 会验收同一套 gate contract，并固定一条回归：A1/A2/A3 全部 simulator accepted 时只能得到 rehearsal evidence，不能让 `ready_for_hardware` 变成 true。运行中的 server 可用 `npm run check:field-acceptance -- --api` 做真实接口验收。

`release:index` 会把最新主包、server-only 包、EXE/APK/PDF、环境医生、现场预检和彩排证据汇成 `output/release-index/release-index-latest.md`，现场或上传服务器前先看这一页。

网页右侧「现场状态」读取同一组 latest 证据，适合投屏或交付现场快速确认，不必临时翻终端。

`server:package` 会生成 `output/server-release/innerworld-space-server-*.zip`。这是上传服务器用的轻量包，先在 localhost 解包验证，再放到公网主机后面接 Nginx/Caddy。

`server:deploy-plan` 会为最新 server-only 包生成 `output/server-release/deploy-plan-latest.md`，包含上传命令、Linux 启动、systemd、Caddy 和 Nginx 反代示例；它只生成本地计划，不会上传服务器。

`server:smoke` 会自动解包最新轻量服务器包、临时启动、跑只读检查和自动彩排，再清理临时目录。`package:audit` 会审计主交付包和内嵌 server release 的 SHA、必需文件和禁入目录。

## GitHub 自动同步

自动同步先 dry-run，再进入单次或循环上传：

```powershell
npm run git:sync:dry
npm run git:sync -- -Message "ops: sync InnerWorld checkpoint"
npm run git:sync:loop
```

常用参数：

- `-DryRun`：只列出将 stage/commit/push 的文件，不改 index、不提交、不上传。
- `-Message "..."`：指定提交信息；为空时脚本会生成 `Auto-sync InnerWorld checkpoint yyyy-MM-dd HH:mm`。
- `-SkipPush`：只生成本地 commit，不 push。
- `-IncludeUntracked`：把未被 `.gitignore` 忽略的新文件纳入候选；package 脚本默认带这个参数。
- `-Loop -IntervalSeconds 300`：循环同步，最小睡眠 30 秒；适合长期工作台自动上传。
- `-SkipChecks`：跳过 `npm run check:security`，只在明确需要快速本地试跑时使用。

脚本不会使用 `git add -A`。它会逐文件筛选并拒绝 ignored/runtime/private 路径，包括 `.env`、`*.secret*`、`secrets/`、`local-secrets/`、`output/`、`node_modules/`、`data/runtime_state.json`、`data/innerworld.sqlite*`、Unity `Library`/`Temp`/`Obj`、缓存和构建产物。如果没有合格变更，脚本输出 `No eligible changes to sync.` 并以成功状态退出；如果危险文件已经被手动 staged，脚本会拒绝提交，要求先 unstage。

## SQLite Runtime Backup

SQLite is the field-authoritative runtime store, so create a private backup before release packaging, restore tests, or server handoff:

```powershell
npm run db:backup
npm run db:backup:verify
npm run db:backup:list
```

Backups are written outside Git by default at `D:\Downloads\RokidCache\sqlite-backups`, with a SHA256 manifest and `sqlite-backup-latest.md`. Restore is explicit:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/sqlite-backup.ps1 -RestoreFrom "D:\Downloads\RokidCache\sqlite-backups\innerworld-sqlite-YYYYMMDD-HHMMSS.sqlite" -Force
```

The restore path first creates a `innerworld-before-restore-*.sqlite` backup of the current database. These files are private runtime evidence and must not be committed or packaged.

## Unity Fallback

Windows fallback：

```powershell
C:\Users\33516\Documents\Rokid\innerworld-rokid\output\unity-windows\InnerWorldRokid.exe
```

启动顺序：先保持 Space Server 在 `http://localhost:5177` 运行，再打开 Unity fallback。若 localhost 暂时不可用，Unity 会显示内置 fallback 数据用于排查。

Android fallback APK：

```text
C:\Users\33516\Documents\Rokid\innerworld-rokid\output\unity-android\InnerWorldRokid.apk
SHA256: D507E209A245CB663FF775E85B098AF159DE977E642B45606DA1F8BE35285574
```

当前 APK 还不是 Rokid SDK 真机版；它用于确认 Unity Android、Gradle、SDK/NDK/OpenJDK、HTTP 权限、包内配置和 Unity fallback 业务代码链路已经跑通。Android/Rokid 访问主控机时不要用 `localhost`，要用 Windows 主控机局域网 IP。

## 90 秒流程

1. 指向入口海报：说明这个地点出现一层 Hidden Layer。
2. 点击或看向 A2：读取记忆信标，展示 AI 三行摘要。
3. 连续推进任务：弱提示、强提示、完成徽章。
4. 点击「加入活动」：展示空间内容连接服务动作。
5. 写回一句话：生成新的 TimeMark。
6. 切 User B：第二用户在 A3 看到刚写回的新信标。

Unity fallback 可用键盘彩排：`Space, Space, S, W, B, R`。验收标准是 HUD 显示 `complete`，API health 显示 `active_user=B`、`mission_state=complete`、`completed_step_count=4`、`beacon_count=3`。

## 缓存运维

C 盘空间需要定期看报表，现场前后、Unity/Android 构建后、打包后都跑一轮：

```powershell
npm run cache:temp:report
npm run cache:report
npm run cache:clean
npm run cache:temp:clean
npm run cache:report
```

`cache:temp:clean` 只在 dry-run 报告确认候选为旧安装器残留且未被进程引用后执行；它用于清掉 VS/Android/.NET 安装缓存，防止 C 盘在现场前被临时解包目录占满。

大包、安装包和下载缓存统一放到 `D:\Downloads\RokidCache`，避免 C 盘被 Unity/Android 工具链缓存占满。

## 打包交付

```powershell
npm run package:demo
```

输出目录：`C:\Users\33516\Documents\Rokid\innerworld-rokid\output\package`

包内包含 Web demo、Space Server、数据、AI schema/prompt、文档、Windows Unity fallback、Android fallback APK、校验清单和缓存报告；包内不包含 Unity `Library`、`Temp`、`node_modules`、`.git` 或下载缓存。

包内不携带 `data/runtime_state.json`。它是运行时文件，服务首次启动会自动生成，确保每个交付包从 `entered` 初始态开始。
