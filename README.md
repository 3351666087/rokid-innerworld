# Rokid InnerWorld / 镜见

Rokid InnerWorld 是一个面向真实校园展墙的空间记忆层：观众戴上 Rokid 眼镜后，对准物理展墙上的入口锚点，现实墙面会叠加出 A1/A2/A3 三个空间记忆点、任务推进、TimeMark 写回、后来者读取和现场状态反馈。

这不是普通校园导览、静态网页或 PPT。当前仓库的目标是先在 Windows 主控机上把完整闭环跑通，再把 Rokid Max Pro / Station Pro 的输入与显示层接入同一套 Space API、SQLite 数据层和 Unity 协议客户端。

## 当前成品长什么样

现场展示以一台 Windows 主控机为核心，运行 localhost/LAN Space Server，并投屏展示 Web 或 Unity 第一视角 fallback。观众侧最终使用 Rokid 眼镜进入同一空间层：

- A1 入口海报：识别物理锚点，开启 InnerWorld 空间层。
- A2 年份信标：读取校史/记忆片段，推动任务状态机。
- A3 写回点：生成并展示时间胶囊，后来者能读到新信标。
- 操作台：显示设备会话、心跳、展墙标定、服务动作 outbox、写回链路、现场预检和发布状态。

硬件未到场时，Web demo 和 Unity fallback 承担完整演示；硬件到场后，只替换输入/显示层，不重写数据契约。

## 已申请硬件

硬件记录见 [innerworld-rokid/data/hardware_manifest.json](innerworld-rokid/data/hardware_manifest.json)。

- Rokid Max Pro, model `RA202`, blue-black, quantity `1`
- Rokid Station Pro, model `RAS201`, blue-black, quantity `1`
- Windows 主控机：当前开发机，同时承担 localhost/LAN Space Server、演示投屏、打包和现场预检

项目接入原则：Rokid 设备负责空间输入、显示、手势/射线/图像识别/SLAM 能力；Windows 主控机负责 Space Server、SQLite、任务状态、写回、证据链和部署包。

## 快速运行

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm install
npm run dev
```

默认地址：

- Web demo: `http://localhost:5177/`
- API health: `http://localhost:5177/api/health`
- Ops status: `http://localhost:5177/api/ops/status`
- Space data: `http://localhost:5177/api/spaces/innerworld_campus_wall`
- Wall calibration: `http://localhost:5177/api/calibration/wall`

现场 LAN 模式：

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run dev:lan
npm run unity:config -- http://<Windows主控机IP>:5177
```

## 关键检查

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run check:mainline
npm run check:contract
npm run check:device
npm run check:unity
npm run check:service-actions
npm run check:security
npm run check:web
```

常用交付检查：

```powershell
npm run context:export
npm run db:backup
npm run db:backup:verify
npm run env:doctor
npm run field:preflight
npm run pdf:fieldkit
npm run release:index
npm run server:package
npm run verify:release
```

缓存和磁盘守护：

```powershell
npm run cache:report
npm run cache:clean
npm run cache:temp:report
npm run cache:temp:clean
```

## 仓库结构

- [innerworld-rokid](innerworld-rokid): 主工程，包含 Web demo、Space Server、Unity shell、共享协议、AI schema/prompt、打包和检查脚本。
- [innerworld-rokid/apps/web-demo](innerworld-rokid/apps/web-demo): 当前可投屏的第一视角空间展墙和操作台。
- [innerworld-rokid/server/space-server](innerworld-rokid/server/space-server): localhost/LAN Space Server，托管静态页面和 Space API。
- [innerworld-rokid/apps/unity-shell](innerworld-rokid/apps/unity-shell): Unity/Rokid fallback 与设备接入边界。
- [innerworld-rokid/shared](innerworld-rokid/shared): Web、Server、Unity 共同遵守的 InnerWorld contract。
- [innerworld-rokid/data](innerworld-rokid/data): `space_demo.json`、硬件 manifest 和本地 SQLite 运行时数据入口。
- [innerworld-rokid/docs](innerworld-rokid/docs): 主线目标、现场 runbook、Rokid 接入、部署、缓存和安全文档。
- [pdf-renderer](pdf-renderer): Java/OpenHTMLToPDF + PDFBox 现场 PDF 渲染器。
- [docs](docs): 策划案与 Rokid SDK 参考资料。

## 主线复审

Kepler 是长期主线 reviewer。重大 checkpoint 必须回投 Kepler 复审，尤其是：

- 前端叙事、展示节奏或现场话术发生大改。
- Rokid SDK、Unity adapter、设备心跳或硬件协议发生大改。
- SQLite、service action、write-back、证据链、发布包或部署链路发生大改。
- 新文档或新功能可能把项目带向普通导览、社交 UGC 平台、机构后台、PPT 或纯网页演示。

## 新增参考资料

2026-07-02 的提交 `f402f82f61d62e897d7615fa3f4259423e5cfce9` 已纳入本地 `main`。它新增：

- [docs/design.md](docs/design.md): InnerWorld 空间设计工作拆解。
- [docs/rokid_sdk_docs.md](docs/rokid_sdk_docs.md): Rokid SDK 摘要资料。
- [docs/rokid_sdk_docs_full.md](docs/rokid_sdk_docs_full.md): Rokid SDK 完整摘录。
- [docs/策划案.pdf](docs/%E7%AD%96%E5%88%92%E6%A1%88.pdf): 原始策划案 PDF。

这些资料不是只做归档。已经把其中可立即执行的部分并入工程总线，采纳矩阵见 [innerworld-rokid/docs/rokid-device-integration.md](innerworld-rokid/docs/rokid-device-integration.md)：RKCameraRig、RKInput、RKHand、PointableUI、图像识别、SLAM/头部追踪、FollowCamera、空间音频、3DoF 射线、近场手势、AR 视觉亮度和空间布局规则，都通过 Space API、Unity adapter boundary、wall calibration 和现有任务状态机接入。

当前 P0 只认一条线：A1/A2/A3 真实展墙锚点、wall calibration、mission state、service action、write-back、User B 读到新增记忆、现场证据链。操场广场大路线、开放 UGC 社交、个人主页、机构后台、商业任务或 NPC 徽章系统不抢当前阶段。

## 当前实现重点

- SQLite 已作为本地权威 store，负责运行态、写回记录、数据集目录、设备会话、bounded device events、service action outbox 和 wall calibration observations。
- Space Server 已有 health、ops status、space data、device bootstrap、device register/heartbeat、service actions outbox/ack、wall calibration manifest/observations 等接口。
- Unity client 已具备 Space API bootstrap、设备注册、心跳、SDK binding 状态、service action outbox/ack、wall calibration manifest/observation 协议边界，并在启动链中主动读取 wall calibration manifest。
- `/api/calibration/wall` 暴露 A1/A2/A3 墙面坐标系、marker 类型、预期 pose 和验收阈值；`/api/calibration/observations` 接收脱敏后的 QR/image tracking/SLAM/manual/simulator 观测并写入 SQLite。
- Web demo 已完成第一视角空间展墙、三锚点任务闭环、右侧操作台、写回状态、展墙标定面板和 responsive 布局修正。
- Java PDF 渲染链路已用于现场 field kit，输出路径为 `innerworld-rokid/output/pdf/rokid_innerworld_field_kit.pdf`。
- GitHub 自动同步脚本已存在，但运行前必须先看 dry-run，确认不会提交私密证据、runtime 数据或大缓存。

## 阶段记录

2026-07-02 20:47 Asia/Shanghai：

- Web 操作台新增 `Wall Calibration / 展墙标定` 模块，可刷新 `/api/calibration/wall`，查看 A1/A2/A3 marker、expected pose、latest observation 和 `ready_for_hardware`。
- Web 操作台可提交 simulator 标定观测到 `/api/calibration/observations`，用于硬件未到场阶段演练同一套墙面锁定合同；硬件到场后 Rokid QR/image tracking/SLAM 写入同一接口。
- Unity fallback/controller 启动时主动读取 wall calibration manifest，并把 schema、anchor count、ready flag 和 calibrated anchor ids 放进 HUD/log/heartbeat。
- Wall calibration 记录会脱敏 `session_id`、`device_id` 和 notes；`ready_for_hardware` 只看每个 anchor 的最新 observation，历史 accepted 不能覆盖后续 rejected。
- `check:web` 和 `check:unity` 已加入防退化断言，防止只保留空协议或空 DOM。

## 隐私与安全

不要提交以下内容：

- `.env`、API key、token、账号凭据和本地登录材料
- 微信原始导出、私密聊天证据、个人电话/地址/序列号等敏感字段
- `innerworld-rokid/data/innerworld.sqlite*`
- `innerworld-rokid/output/`
- `node_modules/`、Unity `Library/`、`Temp/`、`Obj/`、构建输出和缓存
- Rokid SDK 包本体、vendor payload、设备 SN、SSID、MAC、个人 IP 证据或任何可识别现场私密设备的信息

提交前至少运行：

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run git:sync:dry
npm run check:security
```

## 主线判断

项目最终要交付的是“Rokid 眼镜中的真实展墙空间记忆层”。任何新增模块都必须能回答三个问题：

1. 它是否帮助 Rokid 眼镜接入真实空间锚点、手势/射线、SLAM、图像识别或空间音频？
2. 它是否加强 Space Server、SQLite、写回、服务动作、设备会话或现场证据链？
3. 它是否能让交付现场更稳定、更好展示、更容易恢复？

回答不上来，就先不要进主线。
