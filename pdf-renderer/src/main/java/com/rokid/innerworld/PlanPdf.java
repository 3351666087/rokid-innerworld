package com.rokid.innerworld;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class PlanPdf {
    private static final Path ROOT = Path.of("C:/Users/33516/Documents/Rokid");
    private static final Path ANALYSIS = ROOT.resolve("analysis");
    private static final Path OUTPUT = ROOT.resolve("output/pdf");
    private static final Path HTML_OUT = OUTPUT.resolve("rokid_innerworld_execution_plan.html");
    private static final Path PDF_OUT = OUTPUT.resolve("rokid_innerworld_execution_plan.pdf");
    private static final Path FONT_SERIF = Path.of("C:/WeFlow/resources/resources/fonts/annual-report/NotoSerifSC-Var.ttf");
    private static final Path FONT_SANS = Path.of("C:/Windows/Fonts/NotoSansSC-VF.ttf");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        Files.createDirectories(OUTPUT);
        JsonNode chatSummary = readJson("chat_summary.json");
        JsonNode attachments = readJson("attachment_index.json");
        JsonNode media = readJson("media_index.json");
        JsonNode links = readJson("links.json");
        JsonNode chrome = readJson("link_chrome_notes.json");
        String html = buildHtml(chatSummary, attachments, media, links, chrome);
        Files.writeString(HTML_OUT, html, StandardCharsets.UTF_8);

        try (OutputStream os = new FileOutputStream(PDF_OUT.toFile())) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            if (Files.exists(FONT_SERIF)) {
                builder.useFont(FONT_SERIF.toFile(), "Noto Serif SC");
            }
            if (Files.exists(FONT_SANS)) {
                builder.useFont(FONT_SANS.toFile(), "Noto Sans SC");
            }
            builder.withHtmlContent(html, ROOT.toUri().toString());
            builder.toStream(os);
            builder.run();
        }

        System.out.println(PDF_OUT);
        System.out.println(HTML_OUT);
    }

    private static JsonNode readJson(String name) throws Exception {
        Path path = ANALYSIS.resolve(name);
        if (!Files.exists(path)) {
            return MAPPER.createArrayNode();
        }
        return MAPPER.readTree(path.toFile());
    }

    private static String buildHtml(JsonNode chatSummary, JsonNode attachments, JsonNode media, JsonNode links, JsonNode chrome) throws Exception {
        String generatedAt = ZonedDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm z"));
        StringBuilder html = new StringBuilder(160_000);
        html.append("<html xmlns='http://www.w3.org/1999/xhtml'><head><meta charset='UTF-8' />")
            .append("<title>镜见 InnerWorld 执行方案</title>")
            .append(css())
            .append("</head><body>");

        cover(html, generatedAt, chatSummary, attachments, media, links);
        decision(html);
        evidenceCoverage(html, chatSummary, attachments, media, links, chrome);
        hardware(html);
        mvp(html);
        finalProductAndDemo(html);
        architecture(html);
        dataContracts(html);
        executionPlan(html);
        repoAndDeploy(html);
        testAndRisk(html);
        evidenceAppendix(html, attachments, media, chrome);
        html.append("</body></html>");
        return html.toString();
    }

    private static String css() {
        return """
            <style>
            @page {
              size: A4;
              margin: 18mm 16mm 18mm 16mm;
              @bottom-center {
                content: "镜见 InnerWorld 执行方案 · " counter(page);
                font-family: "Noto Sans SC";
                font-size: 8.5pt;
                color: #667085;
              }
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #182230;
              font-family: "Noto Serif SC", "Noto Sans SC", serif;
              font-size: 10.2pt;
              line-height: 1.62;
              letter-spacing: 0;
              background: #fff;
            }
            h1, h2, h3, h4, .sans, table, .tag, .meta, .caption, code, pre {
              font-family: "Noto Sans SC", "Noto Serif SC", sans-serif;
            }
            h1 { font-size: 28pt; line-height: 1.16; margin: 0 0 10mm; color: #101828; }
            h2 { font-size: 17pt; margin: 10mm 0 4mm; color: #101828; page-break-after: avoid; }
            h3 { font-size: 12.2pt; margin: 6mm 0 2mm; color: #1d2939; page-break-after: avoid; }
            h4 { font-size: 10.6pt; margin: 4mm 0 1.5mm; color: #344054; page-break-after: avoid; }
            p { margin: 0 0 3.2mm; }
            ul, ol { margin: 1.5mm 0 4mm 6mm; padding-left: 5mm; }
            li { margin: 1mm 0; }
            code { font-size: 8.6pt; color: #344054; background: #f2f4f7; padding: 0.3mm 0.9mm; border-radius: 2mm; }
            pre {
              white-space: pre-wrap;
              word-break: break-word;
              font-size: 8.1pt;
              line-height: 1.42;
              background: #111827;
              color: #f9fafb;
              padding: 4mm;
              border-radius: 2mm;
              margin: 3mm 0 5mm;
            }
            table { width: 100%; border-collapse: collapse; margin: 3mm 0 6mm; page-break-inside: avoid; }
            th, td { border: 0.25mm solid #d0d5dd; padding: 2mm 2.2mm; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
            th { background: #eef4ff; color: #1d2939; font-weight: 700; }
            tr:nth-child(even) td { background: #fbfcff; }
            .cover {
              min-height: 255mm;
              display: block;
              padding-top: 18mm;
              page-break-after: always;
            }
            .kicker { font-family: "Noto Sans SC"; color: #175cd3; font-size: 10pt; font-weight: 700; margin-bottom: 7mm; }
            .subtitle { font-size: 13.2pt; line-height: 1.6; color: #344054; max-width: 165mm; margin-bottom: 12mm; }
            .meta-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 3mm; margin: 8mm -3mm; }
            .meta-card { display: table-cell; width: 25%; border: 0.25mm solid #d0d5dd; padding: 4mm; background: #f9fafb; }
            .meta-label { font-family: "Noto Sans SC"; color: #667085; font-size: 8.3pt; }
            .meta-value { font-family: "Noto Sans SC"; color: #101828; font-size: 15pt; font-weight: 800; margin-top: 1mm; }
            .callout {
              border-left: 1.2mm solid #175cd3;
              background: #eff8ff;
              padding: 3.2mm 4mm;
              margin: 4mm 0 5mm;
              page-break-inside: avoid;
            }
            .warn { border-left-color: #dc6803; background: #fffaeb; }
            .ok { border-left-color: #079455; background: #ecfdf3; }
            .grid-2 { display: table; width: 100%; border-collapse: separate; border-spacing: 4mm; margin: 0 -4mm; }
            .grid-2 > div { display: table-cell; width: 50%; vertical-align: top; }
            .figure { margin: 4mm 0 6mm; page-break-inside: avoid; }
            .figure img { max-width: 100%; border: 0.25mm solid #d0d5dd; }
            .caption { font-size: 8.2pt; color: #667085; margin-top: 1.5mm; }
            .tag { display: inline-block; font-size: 7.8pt; color: #1849a9; background: #eff4ff; border: 0.2mm solid #b2ccff; padding: 0.2mm 1.4mm; border-radius: 1.2mm; margin-right: 1mm; }
            .small { font-size: 8.4pt; color: #475467; }
            .page-break { page-break-before: always; }
            .nowrap { white-space: nowrap; }
            .evidence { page-break-inside: auto; }
            .evidence tr { page-break-inside: avoid; page-break-after: auto; }
            .evidence td { font-size: 8.1pt; line-height: 1.4; }
            .chrome-table { table-layout: fixed; }
            .chrome-table td { font-size: 7.8pt; }
            </style>
            """;
    }

    private static void cover(StringBuilder html, String generatedAt, JsonNode chatSummary, JsonNode attachments, JsonNode media, JsonNode links) {
        html.append("<section class='cover'>")
            .append("<div class='kicker'>Rokid AR 赛道 · 全量聊天与附件证据执行版</div>")
            .append("<h1>镜见 InnerWorld<br/>空间记忆任务层执行方案</h1>")
            .append("<div class='subtitle'>目标：基于群聊全量记录、22 个恢复附件、图片证据、Chrome 链接核验与当前明确硬件，形成今天即可启动的工程执行计划，并由 Java + OpenHTMLToPDF 渲染为 PDF。</div>")
            .append("<div class='callout ok'><b>最终裁决：</b>主线收敛为“校园记忆展墙 / 三锚点空间记忆任务层”。P0 用 Web/Unity mock + 本地 JSON + 二维码入口 + AI prompt/schema 跑通 90 秒闭环；P1 接 Rokid AR Studio / YodaOS-Master / UXR/OpenXR 的最小真机能力；P2 扩展 Space Server 与机构配置后台。</div>")
            .append("<div class='meta-grid'>")
            .append(meta("聊天消息", text(chatSummary, "messageCount"), "366 条消息已入索引"))
            .append(meta("附件", String.valueOf(attachments.size()), "22/22 已恢复并抽取"))
            .append(meta("媒体", String.valueOf(media.size()), "图片/表情按 JSON 时间回挂"))
            .append(meta("链接", String.valueOf(links.size()), "Chrome 核验与访问限制已记录"))
            .append("</div>")
            .append("<p class='small'>生成时间：").append(esc(generatedAt)).append("。工作区：").append(esc(ROOT.toString())).append("。</p>")
            .append("<p class='small'>渲染方式：Java 21 + Maven + OpenHTMLToPDF + PDFBox；中文字体：Noto Serif SC / Noto Sans SC。</p>")
            .append("</section>");
    }

    private static String meta(String label, String value, String note) {
        return "<div class='meta-card'><div class='meta-label'>" + esc(label) + "</div><div class='meta-value'>" + esc(value) + "</div><div class='small'>" + esc(note) + "</div></div>";
    }

    private static void decision(StringBuilder html) {
        html.append("<section><h2>1. 最终执行裁决</h2>")
            .append("<p>本轮材料已经足够拍板：不再并列推进空间浏览器平台、密室游戏、硬件实验教练、剧本杀角色助手等多条路线。当前唯一主线是 <b>镜见 InnerWorld：校园记忆展墙 + 三锚点空间记忆任务层</b>。</p>")
            .append("<table><tr><th>裁决项</th><th>执行口径</th><th>原因</th></tr>")
            .append(row("主方案", "校园记忆展墙 / 三锚点空间记忆任务层", "能在一面墙或一层楼内做闭环，眼镜必要性强，90 秒能讲清。"))
            .append(row("保留母题", "Spatial URL、空间入口服务器、TimeMark、Hidden Layer、Semantic 3D Pin", "这些是方案的系统价值，但在 P0 中只保留必要子集。"))
            .append(row("淘汰边界", "全校园/全城市导航、全空间 App Store、全天记忆回放、复杂社交平台", "定位、隐私、治理、工程周期风险过高，会削弱可交付性。"))
            .append(row("吸收模块", "CircuitMate 的现场任务指导；In Character 的角色化短 cue", "作为未来空间内容/任务模块吸收，不作为当前主线。"))
            .append("</table>")
            .append("<div class='callout'><b>一句话 pitch：</b>戴上 Rokid，现实地点多出一层可读、可做、可写回的空间记忆层：前人把瞬间留在它发生的地方，后来者在同一位置看见、完成任务，并把新的回声写回去。</div>")
            .append("</section>");
    }

    private static void evidenceCoverage(StringBuilder html, JsonNode chatSummary, JsonNode attachments, JsonNode media, JsonNode links, JsonNode chrome) {
        html.append("<section><h2>2. 证据覆盖与限制</h2>")
            .append("<p>已完成全量聊天解析、附件恢复、全文抽取、图片索引、Chrome 快速核验与四组并行阅读笔记。文件类消息 22 条与恢复附件 22 个全部匹配，没有缺失文件。</p>")
            .append("<table><tr><th>来源</th><th>覆盖结果</th><th>进入方案的方式</th></tr>")
            .append(row("群聊 JSONL", text(chatSummary, "firstMessageTime") + " 至 " + text(chatSummary, "lastMessageTime") + "，" + text(chatSummary, "messageCount") + " 条消息", "用于判断团队决策、硬件选择、后端资源、样机申请状态。"))
            .append(row("PDF/DOCX/XLSX/MD", attachments.size() + " 个文件，累计抽取约 24 万字符", "按 messageIndex、时间、发送者回挂；子代理 A-D 已逐份阅读。"))
            .append(row("图片/表情", media.size() + " 个媒体文件", "重点看 #207 提交截图、#212 样机借用、#337/#343 架构图；同时记录 JSON 回挂错位风险。"))
            .append(row("链接", links.size() + " 条链接，Chrome 快速核验 " + chrome.size() + " 个页面", "Rokid 官网/Gemini/腾讯文档/微信文章进入证据；Chrome 慢读时扩展连接卡住，截图与已落盘文本作为现有证据。"))
            .append(row("WeFlow 导出源码", "确认前端默认 exportFiles=true，调用 electronAPI.export.exportSessions", "原 WeFlow 导出的 PDF/文件缺失应属于导出链路或缓存问题；已从 WeChat 文件目录手动恢复全部附件。"))
            .append("</table>")
            .append("<div class='callout warn'><b>限制说明：</b>Chrome 扩展在快速核验后、慢读 Gemini/腾讯文档时出现控制连接超时。已保存可视截图和快速抽取文本；最终方案主要依赖本地完整附件、群聊记录与官方硬件页。需要继续深挖 Gemini 原文时，应在 Chrome 恢复后逐页慢读补充。</div>")
            .append("</section>");
    }

    private static void hardware(StringBuilder html) {
        html.append("<section><h2>3. 当前硬件与部署判断</h2>")
            .append("<h3>3.1 设备选择</h3>")
            .append("<table><tr><th>设备/资源</th><th>当前判断</th><th>执行影响</th></tr>")
            .append(row("Rokid AR Studio", "主目标。群聊明确倾向 Studio，理由是“空间计算套装”“主机也更强一点”。样机申请已提交，仍待审核。", "P1 以 Studio + YodaOS-Master + Unity/UXR/OpenXR 为主线接入。"))
            .append(row("Rokid AR Lite", "降级兼容。可作为 Lite 到货或 Studio 不可用时的轻量演示设备。", "保持 UI、短卡、二维码入口、HUD fallback，不押重 SLAM。"))
            .append(row("Rokid Glasses", "不是当前主线。它更适合 AI 短提示、In Character 或 CXR-L 类应用。", "可作为 AI 同源补报叙事，不作为空间 Pin 主设备。"))
            .append(row("Windows 开发机", "可用且不是问题。当前这台 Windows 机器已经能承担开发、调试、Java PDF、前端/后端、Chrome/投屏与现场主控。", "现场展示时作为主控台和大屏投放源；设备不到时直接跑 Web/Unity 第一视角 fallback。"))
            .append(row("Mac mini", "10 核 Apple 芯片，32GB RAM，512GB 存储，约 300GB 可用。", "适合本地开发、模型/素材处理、录屏、构建和内网调试。"))
            .append(row("阿里云 2C2G + 域名", "公网后端首选。团队已有域名，群聊判断服务器开销不大，但要控制服务数量。", "部署 Space Server、静态资源、演示 API。避免多个重 pm2 服务；优先 Docker Compose。"))
            .append("</table>")
            .append("<h3>3.2 样机申请证据</h3>")
            .append("<p>样机借用页面显示“预计 3 个工作日内反馈结果”，可选 AR Lite / AR Studio；群聊随后确定“studio 啦”，并已提交申请。</p>")
            .append(figure("C:/Users/33516/Documents/Rokid/群聊_Rokid/media/images/image_47785334806@chatroom_212_93c13585b8e8ec59021d5797eec036e0.png", "开发样机借用页面：AR Lite / AR Studio 可选，状态为待申请/待审核流程。"))
            .append("</section>");
    }

    private static void mvp(StringBuilder html) {
        html.append("<section class='page-break'><h2>4. MVP 范围：校园记忆展墙</h2>")
            .append("<p>P0 的目标不是炫技，而是让评委看见完整闭环：进入空间、读取空间记忆、完成任务、把内容写回、后来者再次读取。</p>")
            .append("<table><tr><th>环节</th><th>用户动作</th><th>AI 负责</th><th>AR/眼镜负责</th><th>P0 实现</th></tr>")
            .append(row("入口", "扫码/点击入口海报", "加载 space_id、路线、权限", "显示“校园记忆层已打开”", "二维码或手动入口 + 本地 JSON"))
            .append(row("读", "看向展墙锚点 A1/A2", "聚类/去噪/三行摘要", "低干扰信标和短卡", "Web/Unity HUD"))
            .append(row("做", "寻找隐藏年份或展板线索", "输出弱提示/强提示/答案提示，纠错", "箭头、短标签、徽章", "状态机 + 提示库"))
            .append(row("服务", "加入活动日历/完成签到模拟", "生成 service_action", "展示确认状态", "本地 mock，不接真实系统"))
            .append(row("写回", "留一句话给后来者", "标签、摘要、风险初筛、可见规则", "新 TimeMark 信标出现", "写入本地 JSON"))
            .append(row("后来者", "切换用户 B 进入同一空间", "读取新信标并解释来源", "同位置出现刚写回内容", "双用户模拟"))
            .append("</table>")
            .append("<h3>90 秒脚本</h3>")
            .append("<table><tr><th>秒数</th><th>镜头</th><th>系统响应</th><th>验收点</th></tr>")
            .append(row("0-8", "入口海报", "打开 Campus Memory Wall：3 个信标，1 个任务", "5 秒内进入"))
            .append(row("8-20", "展墙标题", "官方彩蛋浮出", "空间入口成立"))
            .append(row("20-35", "留声信标", "多条留言压缩成三行摘要", "AI 降噪价值"))
            .append(row("35-52", "隐藏年份任务", "弱提示、强提示、纠错卡", "不是导览，是任务"))
            .append(row("52-65", "活动服务", "加入 14:30 体验活动", "服务动作闭环"))
            .append(row("65-78", "写回", "生成时间胶囊标签和可见规则", "地点可写"))
            .append(row("78-90", "用户 B", "新信标在同一位置可读", "后来者接住"))
            .append("</table>")
            .append("</section>");
    }

    private static void finalProductAndDemo(StringBuilder html) {
        html.append("<section class='page-break'><h2>5. 最终成品与现场展示</h2>")
            .append("<div class='callout ok'><b>最终成品不是概念稿，而是一套可演示包：</b>眼镜端空间体验、Windows 主控投屏、三锚点展墙物料、Space JSON/API、AI 输出约束、后台写回记录和录屏兜底。</div>")
            .append("<h3>5.1 观众会看到什么</h3>")
            .append("<table><tr><th>视角</th><th>最终画面</th><th>必须成立的感觉</th></tr>")
            .append(row("戴眼镜的人", "现实展墙上浮着 3 个低干扰信标：入口海报、记忆信标、写回点。看向某个点后弹出两三行短卡、箭头、任务进度和完成徽章。", "不是一张网页贴在眼前，而是地点旁边多了一层可读、可做、可写回的记忆层。"))
            .append(row("现场大屏", "Windows 机投出第一视角画面：信标出现、任务推进、AI 摘要、写回成功、用户 B 重载后看到新信标。旁边可切后台日志。", "评委不用戴设备也能跟上 90 秒闭环。"))
            .append(row("展墙/桌面物料", "一张入口二维码海报 + 三个 A1/A2/A3 锚点牌 + 一张路线说明卡。锚点可以贴在真实墙面，也可以搭一个轻量展板。", "空间是可布置、可复现的，不依赖复杂场地。"))
            .append(row("后台/数据", "space_demo.json 与写回记录实时变化；AI 输出始终是短 JSON，可直接映射到眼镜 HUD。", "这不是视频剪辑，而是数据驱动的可运行系统。"))
            .append("</table>")
            .append("<h3>5.2 交付物清单</h3>")
            .append("<table><tr><th>交付物</th><th>内容</th><th>验收方式</th></tr>")
            .append(row("Rokid 演示端", "AR Studio 优先；到手后接 Unity/UXR/OpenXR 最小能力：显示短卡、切换锚点、推进任务、写回反馈。", "真机能跑至少 1 个完整锚点链路。"))
            .append(row("Windows 主控端", "当前 Windows 机运行 web-demo / unity-shell / space-server mock，并负责投屏、录屏、热重启和现场兜底。", "断网或无真机时仍能完整演示。"))
            .append(row("Space Server / 数据包", "space_demo.json、sample_beacons.json、prompt_tests.json、写回接口和本地/云端两套配置。", "用户 A 写回后，用户 B 刷新能看到新内容。"))
            .append(row("展示物料", "二维码入口海报、三锚点标识、路线卡、30/90/180 秒 pitch、Q&A 卡。", "现场 5 分钟内可布置完。"))
            .append(row("兜底视频", "一条 90 秒无剪辑路线录屏，一条真机/模拟器备用视频。", "设备、网络、投屏任一环节出问题时可继续讲。"))
            .append("</table>")
            .append("<h3>5.3 现场设备与摆法</h3>")
            .append("<table><tr><th>设备</th><th>用途</th><th>优先级</th></tr>")
            .append(row("Rokid AR Studio", "主展示设备：佩戴者走 90 秒路线，展示空间信标、短卡、任务和写回。", "P0/P1 首选"))
            .append(row("Windows 笔记本/台式机", "主控、投屏、调试、运行本地服务和 fallback。当前这台机器即可承担。", "必须带"))
            .append(row("大屏/投影/HDMI 转接", "给评委看第一视角与后台日志，避免只能靠口述。", "必须带"))
            .append(row("手机", "扫入口二维码、作为第二用户 B、临时热点和拍摄补位。", "建议带"))
            .append(row("打印物料", "入口二维码 + A1/A2/A3 锚点牌。没有真实场地时贴在便携展板或墙面。", "必须带"))
            .append(row("阿里云服务", "公网 API 和静态入口。现场网络不稳时切回 Windows 本地。", "可选增强"))
            .append("</table>")
            .append("<h3>5.4 现场展示流程</h3>")
            .append("<table><tr><th>阶段</th><th>展示动作</th><th>评委看到的证据</th></tr>")
            .append(row("开场 15 秒", "指向入口海报：这是校园记忆展墙，戴上 Rokid 后地点会出现一层 Hidden Layer。", "真实物料 + 大屏第一视角。"))
            .append(row("读 20 秒", "看向官方彩蛋和留声信标，AI 把多人留言压成三行。", "眼镜端短卡和 AI 降噪。"))
            .append(row("做 25 秒", "找隐藏年份，先弱提示，再强提示，完成后出现徽章。", "它不是导览，是空间任务。"))
            .append(row("服务 10 秒", "模拟加入 14:30 体验活动或完成签到。", "空间内容连到服务动作。"))
            .append(row("写回 15 秒", "用户 A 留一句话，系统生成标签、摘要和可见规则。", "地点可以被续写。"))
            .append(row("复现 15 秒", "切用户 B 或刷新第二设备，同一位置出现刚写回的新信标。", "后来者接住前人的内容，闭环成立。"))
            .append("</table>")
            .append("<div class='callout'><b>设备不到场时的同款口径：</b>Windows 机直接跑第一视角 Web/Unity 版本，大屏展示 90 秒路线，同时明确说明真机只替换输入与显示层，Space JSON、AI schema、写回闭环和服务动作不变。</div>")
            .append("</section>");
    }

    private static void architecture(StringBuilder html) {
        html.append("<section><h2>6. 技术架构</h2>")
            .append("<h3>6.1 分层路线</h3>")
            .append("<table><tr><th>层级</th><th>组件</th><th>责任</th><th>阶段</th></tr>")
            .append(row("P0 演示层", "Web/Unity Demo Shell", "第一视角 HUD、信标、短卡、箭头、徽章、用户切换", "今天开工"))
            .append(row("P0 数据层", "Local Space JSON", "space、anchors、beacons、missions、display_rule、fallback", "今天开工"))
            .append(row("P0 AI 层", "Prompt + Schema + Local Fallback", "三行摘要、下一步、纠错、写回审核", "今天开工"))
            .append(row("P1 终端层", "Native Unity App Shell + Rokid UXR/OpenXR", "Semantic 3D Pin、射线/手势交互、本地坐标转换", "样机到手后"))
            .append(row("P1 服务层", "Space Server", "附近 Pin 查询、内容分发、互动沉淀、权限和审核", "本周可先 mock"))
            .append(row("P2 生态层", "Spatial Data Contract + 配置后台", "机构创建空间、配置任务、查看统计", "答辩扩展"))
            .append("</table>")
            .append("<h3>6.2 参考架构图</h3>")
            .append("<div class='grid-2'><div>")
            .append(figure("C:/Users/33516/Documents/Rokid/群聊_Rokid/media/images/image_47785334806@chatroom_337_e2dd8399b7d0b698c0e77fc4365fdd0c.jpg", "群聊架构图之一：空间入口服务器、客户端扫描、内容展开。"))
            .append("</div><div>")
            .append(figure("C:/Users/33516/Documents/Rokid/群聊_Rokid/media/images/image_47785334806@chatroom_343_6af15f19ed16011ed9bede5d01968011.jpg", "群聊架构图之二：简洁 PPT 版空间入口与云端关系。"))
            .append("</div></div>")
            .append("<h3>6.3 P1 空间 Pin 处理流程</h3>")
            .append("<ol>")
            .append("<li>客户端获取用户位置、朝向与当前空间入口状态。</li>")
            .append("<li>调用 <code>GET /api/pins/nearby</code> 查询半径内 Pin 与 Hidden Layer。</li>")
            .append("<li>将 pin GPS 与用户 GPS 计算 ENU offset，映射到 Unity X/Z/Y。</li>")
            .append("<li>按 pin_type 决定 Sky / Ground / Floating / Wall 视觉形态和语义高度。</li>")
            .append("<li>默认低干扰显示，射线/点击/手势选中后展开图片、留言和任务。</li>")
            .append("<li>机构 Hidden Layer 优先使用 QR/Logo/海报图像识别，普通 TimeMark 不承诺厘米级贴物。</li>")
            .append("</ol>")
            .append("</section>");
    }

    private static void dataContracts(StringBuilder html) {
        html.append("<section class='page-break'><h2>7. 数据模型与接口</h2>")
            .append("<h3>7.1 P0 space_demo.json</h3>")
            .append(pre("""
            {
              "space_id": "innerworld_campus_wall",
              "name": "校园记忆展墙",
              "entry": { "type": "qr_poster", "url": "innerworld://space/innerworld_campus_wall" },
              "grid": { "unit_cm": 30, "scope": "one_wall", "width_units": 12, "height_units": 6 },
              "layers": ["official", "public", "circle", "time_capsule"],
              "anchors": [
                { "anchor_id": "A1", "label": "入口海报", "grid_pos": { "x": 1, "y": 2 } },
                { "anchor_id": "A2", "label": "记忆信标", "grid_pos": { "x": 6, "y": 3 } },
                { "anchor_id": "A3", "label": "写回点", "grid_pos": { "x": 10, "y": 2 } }
              ],
              "mission": { "state": "entered", "steps": ["read", "find_year", "service_action", "write_back"] },
              "display_rule": { "max_lines": 3, "low_distraction": true },
              "fallback": { "mode": "manual_advance", "data": "local_json" }
            }
            """))
            .append("<h3>7.2 AI 输出约束</h3>")
            .append(pre("""
            {
              "mission_state": "doing",
              "display_text": "看右下角年份",
              "hint_level": "weak",
              "service_action": null,
              "write_back_review": {
                "status": "approved",
                "tag": "time_capsule",
                "summary": "给后来者的一句话",
                "visibility": "public_after_demo"
              }
            }
            """))
            .append("<h3>7.3 P1 API</h3>")
            .append("<table><tr><th>接口</th><th>用途</th><th>P0 替代</th></tr>")
            .append(row("GET /api/spaces/{space_id}", "加载空间、锚点、内容层、任务与显示规则", "读取本地 JSON"))
            .append(row("GET /api/pins/nearby?lat=&lng=&radius=", "查询附近 Pin 与 Hidden Layer", "固定展墙锚点数组"))
            .append(row("POST /api/spaces/{space_id}/beacons", "写回 TimeMark / 留声信标", "更新本地 JSON"))
            .append(row("POST /api/interactions", "点赞、打卡、收藏、完成任务", "前端状态机记录"))
            .append(row("POST /api/service-actions", "加入日历、签到、领取徽章等动作", "显示模拟成功态"))
            .append("</table>")
            .append("</section>");
    }

    private static void executionPlan(StringBuilder html) {
        html.append("<section><h2>8. 直接开工计划</h2>")
            .append("<h3>8.1 今日 T0-T6</h3>")
            .append("<table><tr><th>编号</th><th>任务</th><th>产物</th><th>验收</th></tr>")
            .append(row("T0", "建立 GitHub 仓库和目录结构", "repo + README + status.md", "每个子任务有路径和负责人"))
            .append(row("T1", "确定 3 个点位或用模拟展墙替代", "points.md + 3 张照片/草图", "点位在小范围内，特征清晰"))
            .append(row("T2", "生成 space_demo.json", "data/space_demo.json", "能驱动入口、三点、任务、写回"))
            .append(row("T3", "写 prompt/schema/tests", "ai/prompt.md + ai/tests.json", "30 个测试输入，每条输出三行以内"))
            .append(row("T4", "做 Web 第一视角 Demo", "apps/web-demo", "90 秒路线可点击跑完"))
            .append(row("T5", "录制 fallback", "output/demo/fallback.mp4", "无真机也能讲完整闭环"))
            .append(row("T6", "写 30/90/180 秒 pitch", "docs/pitch.md", "无成员姓名、无多方案摇摆"))
            .append("</table>")
            .append("<h3>8.2 明日 T7-T12</h3>")
            .append("<ul>")
            .append("<li>接 Space Server mock：Spring Boot 或 Node/FastAPI 均可，先以 JSON 文件/SQLite 落地。</li>")
            .append("<li>做管理脚本：校验 anchors、beacons、mission steps、display_text 长度。</li>")
            .append("<li>做第二用户读取演示：用户 A 写回后，用户 B 重载看到新信标。</li>")
            .append("<li>准备答辩 Q&amp;A：导览质疑、手机替代、AI 必要性、定位不准、商业化、设备未到。</li>")
            .append("<li>若设备到手：只接一个最小能力，如短提示显示、按钮推进、投屏或图像识别入口。</li>")
            .append("</ul>")
            .append("<h3>8.3 三席 Codex 执行树</h3>")
            .append("<table><tr><th>线</th><th>职责</th><th>子任务</th><th>关闭条件</th></tr>")
            .append(row("产品与评委线", "主 pitch、证据总账、Q&A、报名摘要", "source-auditor / judge-critic / pitch-writer", "话术不摇摆，评委追问有回答"))
            .append(row("Demo 与 AR 线", "可运行 demo、录屏、点位配置、设备接入", "prototype-builder / visual-polisher / device-runner", "90 秒不崩，有真机/无真机两套路径"))
            .append(row("AI 与内容线", "prompt、schema、异常库、模拟内容", "prompt-engineer / schema-designer / content-curator", "每条眼镜端输出不超过三行"))
            .append(row("集成与质量线", "战情表、验收脚本、打包清单", "integrator / qa-runner / closeout-manager", "running/blocked 都有下一步或被关闭"))
            .append("</table>")
            .append("</section>");
    }

    private static void repoAndDeploy(StringBuilder html) {
        html.append("<section class='page-break'><h2>9. 仓库结构与部署</h2>")
            .append("<h3>9.1 建议仓库结构</h3>")
            .append(pre("""
            innerworld-rokid/
              README.md
              status.md
              data/
                space_demo.json
                prompt_tests.json
                sample_beacons.json
              apps/
                web-demo/           # P0 第一视角 HUD 和 90 秒闭环
                unity-shell/         # P1 Native Unity + UXR/OpenXR
                admin-mock/          # P2 配置后台 mock
              server/
                space-server/        # nearby pins / spaces / beacons API
                Dockerfile
                docker-compose.yml
              ai/
                prompt.md
                schema.json
                tests.json
                fallback_outputs.json
              docs/
                pitch.md
                qa.md
                evidence.md
                device-notes.md
              output/
                demo/
                pdf/
            """))
            .append("<h3>9.2 部署策略</h3>")
            .append("<table><tr><th>环境</th><th>用途</th><th>命令/策略</th></tr>")
            .append(row("Windows 开发机", "主控、投屏、录屏、前后端调试、Java PDF、Chrome 链接验证", "当前机器即可用；现场优先带 Windows，保持本地服务和 fallback 随时可跑。"))
            .append(row("Mac mini", "开发、素材处理、录屏、Unity/前端构建", "本地运行 web-demo、Space Server、构建脚本；不承担公网依赖。"))
            .append(row("阿里云 2C2G", "公网 API 和静态演示入口", "Docker Compose 部署 Nginx + Space Server + SQLite/PostgreSQL；限制服务数量。"))
            .append(row("GitHub", "多人/ Codex 同步", "main 保持可演示；feature 分支短周期合并；每次合并更新 status.md。"))
            .append(row("Rokid AR Studio", "真机 P1", "Unity Android Build + YodaOS-Master + UXR/OpenXR；只接关键点能力。"))
            .append("</table>")
            .append("<h3>9.3 阿里云最小服务</h3>")
            .append(pre("""
            services:
              nginx:
                image: nginx:alpine
                ports: ["80:80", "443:443"]
                volumes: ["./deploy/nginx.conf:/etc/nginx/nginx.conf:ro", "./static:/usr/share/nginx/html:ro"]
              space-server:
                build: ./server/space-server
                environment:
                  - DATABASE_URL=jdbc:sqlite:/data/innerworld.db
                volumes: ["./data:/data"]
                restart: unless-stopped
            """))
            .append("</section>");
    }

    private static void testAndRisk(StringBuilder html) {
        html.append("<section><h2>10. 验收、风险与兜底</h2>")
            .append("<h3>10.1 验收清单</h3>")
            .append("<table><tr><th>类别</th><th>验收项</th><th>通过标准</th></tr>")
            .append(row("演示", "90 秒路线", "入口、读、做、服务、写回、后来者读取全部完成"))
            .append(row("眼镜端 UI", "低干扰显示", "每屏不超过三行，默认只显示信标，选中后展开"))
            .append(row("AI", "输出约束", "所有测试输入返回 JSON，display_text 可直接上屏"))
            .append(row("数据", "space_demo.json", "schema 校验通过；写回后第二用户可读取"))
            .append(row("硬件", "设备路径", "Studio 到手接最小能力；未到手有录屏和 Web/Unity fallback"))
            .append(row("答辩", "高压追问", "至少 12 个问题有 30 秒内回答"))
            .append("</table>")
            .append("<h3>10.2 风险表</h3>")
            .append("<table><tr><th>风险</th><th>影响</th><th>兜底</th><th>答辩口径</th></tr>")
            .append(row("像 AR 导览", "价值被低估", "展示任务、纠错、写回、第二用户读取", "导览展示内容，我们让地点被操作和续写。"))
            .append(row("手机可替代", "眼镜必要性被质疑", "把提示贴回真实物体旁，边看边做", "手机是列表，眼镜是空间线索。"))
            .append(row("定位/锚定不稳", "现场演示失败", "局部网格、固定锚点、HUD、录屏", "第一阶段分层精度，不承诺全局厘米级定位。"))
            .append(row("样机未到", "真机能力无法展示", "Web/Unity mock + 录屏 + 设备到手最小接入计划", "主流程与设备到货解耦。"))
            .append(row("AI 输出长/幻觉", "眼镜端不可用", "schema、测试集、本地 fallback", "AI 是空间编译器，负责降噪和下一步。"))
            .append(row("内容审核", "公开发布风险", "P0 模拟留言、组织内可见、写回初筛", "先证明机制，规模治理是 P2。"))
            .append("</table>")
            .append("</section>");
    }

    private static void evidenceAppendix(StringBuilder html, JsonNode attachments, JsonNode media, JsonNode chrome) {
        html.append("<section class='page-break'><h2>附录 A：附件与媒体证据索引</h2>")
            .append("<h3>A.1 文件附件（22/22）</h3>")
            .append("<table class='evidence'><tr><th>#</th><th>时间</th><th>发送者</th><th>文件</th><th>抽取</th><th>方案作用</th></tr>");
        for (JsonNode row : attachments) {
            JsonNode extraction = row.path("extraction");
            String role = evidenceRole(text(row, "fileName"));
            html.append("<tr>")
                .append(td(String.valueOf(row.path("messageIndex").asInt())))
                .append(td(text(row, "time")))
                .append(td(text(row, "sender")))
                .append(td(text(row, "fileName")))
                .append(td("chars=" + extraction.path("textChars").asInt() + "; pages/sheets=" + firstNonBlank(extraction, "pageCount", "sheetCount", "paragraphCount")))
                .append(td(role))
                .append("</tr>");
        }
        html.append("</table><h3>A.2 关键媒体</h3>")
            .append("<table class='evidence'><tr><th>文件</th><th>JSON 时间</th><th>视觉内容</th><th>用途</th></tr>")
            .append(row("image_..._207.jpg", "2026/06/30 12:31:51", "提交/通过类状态截图，实际聊天语境靠近 #290-#295", "证明备选方案已提交"))
            .append(row("image_..._212.png", "2026/06/30 12:34:45", "开发样机借用页，可选 AR Lite / AR Studio", "硬件申请证据"))
            .append(row("image_..._337.jpg", "2026/07/01 17:26:38", "空间入口服务器/客户端/云端架构图", "PPT 架构素材"))
            .append(row("image_..._343.jpg", "2026/07/01 17:37:08", "简洁空间入口架构图", "PPT 架构素材"))
            .append("</table><h3>A.3 Chrome 链接核验</h3>")
            .append("<table class='evidence chrome-table'><tr><th>key</th><th>标题 / 短 URL</th><th>正文</th><th>备注</th></tr>");
        for (JsonNode item : chrome) {
            html.append("<tr>")
                .append(td(text(item, "key")))
                .append(td(text(item, "title") + " / " + compactUrl(text(item, "finalUrl"))))
                .append(td(item.path("textLength").asInt() + " chars"))
                .append(td(chromeNote(text(item, "key"), item.path("textLength").asInt())))
                .append("</tr>");
        }
        html.append("</table></section>");
    }

    private static String evidenceRole(String fileName) {
        String f = fileName.toLowerCase();
        if (f.contains("最终主方案")) return "最终裁决、三锚点、技术路线、立即任务";
        if (f.contains("混合式空间pin")) return "Native Unity + Space Server + Semantic 3D Pin 技术路径";
        if (f.contains("最新群聊整合")) return "空间记忆任务层、读-做-写回 P0";
        if (f.contains("最终策划案")) return "空间隐藏层 / Hidden Layer 完整产品定义";
        if (f.contains("完整策划案")) return "InnerWorld 早期完整框架";
        if (f.contains("里世界")) return "空间留言/时间胶囊商业补强";
        if (f.contains("空间浏览器")) return "Spatial URL 与空间入口母题";
        if (f.contains("最优解")) return "冠军执行稿与答辩弹药";
        if (f.contains("circuitmate")) return "备选：第一视角现场任务指导，可吸收";
        if (f.contains("character") || f.contains("在戏中")) return "备选：角色化短 cue，可吸收";
        return "培训、会议或补充证据";
    }

    private static String chromeNote(String key, int length) {
        if (key.contains("ar_studio")) return "官方页可读，支撑 Studio 硬件判断";
        if (key.contains("ar_lite")) return "官方页可读，支撑 Lite 兼容判断";
        if (key.contains("glasses")) return "官方页可读，说明 Glasses 属 AI 眼镜方向";
        if (key.contains("gemini") && length > 0) return "分享页正文已抓取";
        if (key.contains("gemini")) return "截图显示页面可见，DOM 快速抽取为空";
        if (key.contains("tencent")) return "标题可到，正文疑似应用壳/权限受限";
        if (key.contains("yodaos")) return "标题可到，正文 DOM 为空";
        if (key.contains("aiui")) return "重定向登录";
        return "已核验";
    }

    private static String compactUrl(String url) {
        if (url == null || url.isBlank()) return "";
        String compact = url.replace("https://", "").replace("http://", "");
        if (compact.length() <= 68) return compact;
        return compact.substring(0, 65) + "...";
    }

    private static String figure(String path, String caption) {
        Path p = Path.of(path);
        String img = "";
        if (Files.exists(p)) {
            URI uri = p.toUri();
            img = "<img src='" + esc(uri.toString()) + "'/>";
        } else {
            img = "<div class='callout warn'>图片未找到：" + esc(path) + "</div>";
        }
        return "<div class='figure'>" + img + "<div class='caption'>" + esc(caption) + "</div></div>";
    }

    private static String row(String a, String b, String c) {
        return "<tr>" + td(a) + td(b) + td(c) + "</tr>";
    }

    private static String row(String a, String b, String c, String d) {
        return "<tr>" + td(a) + td(b) + td(c) + td(d) + "</tr>";
    }

    private static String row(String a, String b, String c, String d, String e) {
        return "<tr>" + td(a) + td(b) + td(c) + td(d) + td(e) + "</tr>";
    }

    private static String td(String text) {
        return "<td>" + esc(text) + "</td>";
    }

    private static String pre(String code) {
        return "<pre>" + esc(code.strip()) + "</pre>";
    }

    private static String firstNonBlank(JsonNode node, String... keys) {
        for (String key : keys) {
            JsonNode v = node.path(key);
            if (!v.isMissingNode() && !v.isNull()) {
                if (v.isNumber()) return String.valueOf(v.asInt());
                String s = v.asText();
                if (!s.isBlank()) return s;
            }
        }
        return "";
    }

    private static String text(JsonNode node, String key) {
        JsonNode v = node.path(key);
        if (v.isMissingNode() || v.isNull()) return "";
        if (v.isNumber()) return v.asText();
        return v.asText("");
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
