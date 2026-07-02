package com.rokid.innerworld;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.Map;

public class FieldKitPdf {
    private static final Path PROJECT = resolveProjectRoot();
    private static final Path ROOT = PROJECT.getParent() == null ? PROJECT : PROJECT.getParent();
    private static final Path OUTPUT = PROJECT.resolve("output/pdf");
    private static final Path ASSETS = OUTPUT.resolve("assets");
    private static final Path HTML_OUT = OUTPUT.resolve("rokid_innerworld_field_kit.html");
    private static final Path PDF_OUT = OUTPUT.resolve("rokid_innerworld_field_kit.pdf");
    private static final Path FONT_SERIF = Path.of("C:/WeFlow/resources/resources/fonts/annual-report/NotoSerifSC-Var.ttf");
    private static final Path FONT_SANS = Path.of("C:/Windows/Fonts/NotoSansSC-VF.ttf");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        Files.createDirectories(OUTPUT);
        Files.createDirectories(ASSETS);

        String publicUrl = firstNonBlank(System.getenv("FIELD_KIT_PUBLIC_URL"), "http://localhost:5177/");
        JsonNode space = readJson(PROJECT.resolve("data/space_demo.json"));
        JsonNode evidence = readJson(PROJECT.resolve("output/demo/rehearsal-evidence-latest.json"));
        JsonNode manifest = readLatestManifest();
        Path qrPath = writeQr(publicUrl);

        String html = buildHtml(space, evidence, manifest, publicUrl, qrPath);
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
            builder.withHtmlContent(html, PROJECT.toUri().toString());
            builder.toStream(os);
            builder.run();
        }

        System.out.println(PDF_OUT);
        System.out.println(HTML_OUT);
    }

    private static JsonNode readJson(Path path) throws Exception {
        if (!Files.exists(path)) {
            return MAPPER.createObjectNode();
        }
        return MAPPER.readTree(path.toFile());
    }

    private static JsonNode readLatestManifest() throws Exception {
        Path packageManifest = PROJECT.resolve("PACKAGE-MANIFEST.json");
        if (Files.exists(packageManifest)) {
            return readJson(packageManifest);
        }

        Path packageDir = PROJECT.resolve("output/package");
        if (!Files.exists(packageDir)) {
            return MAPPER.createObjectNode();
        }
        Path latest = Files.list(packageDir)
            .filter((path) -> path.getFileName().toString().endsWith(".manifest.json"))
            .max(Comparator.comparing((path) -> path.toFile().lastModified()))
            .orElse(null);
        if (latest == null) {
            return MAPPER.createObjectNode();
        }
        return readJson(latest);
    }

    private static Path resolveProjectRoot() {
        String propertyRoot = System.getProperty("innerworld.projectRoot");
        if (propertyRoot != null && !propertyRoot.isBlank()) {
            return Path.of(propertyRoot).toAbsolutePath().normalize();
        }

        String envRoot = System.getenv("INNERWORLD_PROJECT_ROOT");
        if (envRoot != null && !envRoot.isBlank()) {
            return Path.of(envRoot).toAbsolutePath().normalize();
        }

        Path cwd = Path.of("").toAbsolutePath().normalize();
        if (Files.exists(cwd.resolve("data/space_demo.json"))) {
            return cwd;
        }

        Path siblingProject = cwd.resolveSibling("innerworld-rokid");
        if (Files.exists(siblingProject.resolve("data/space_demo.json"))) {
            return siblingProject;
        }

        return Path.of("C:/Users/33516/Documents/Rokid/innerworld-rokid");
    }

    private static Path writeQr(String publicUrl) throws Exception {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        hints.put(EncodeHintType.MARGIN, 1);
        BitMatrix matrix = new QRCodeWriter().encode(publicUrl, BarcodeFormat.QR_CODE, 720, 720, hints);
        Path qrPath = ASSETS.resolve("entry-qr.png");
        MatrixToImageWriter.writeToPath(matrix, "PNG", qrPath);
        return qrPath;
    }

    private static String buildHtml(JsonNode space, JsonNode evidence, JsonNode manifest, String publicUrl, Path qrPath) {
        String generatedAt = ZonedDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm z"));
        StringBuilder html = new StringBuilder(80_000);
        html.append("<html xmlns='http://www.w3.org/1999/xhtml'><head><meta charset='UTF-8' />")
            .append("<title>镜见 InnerWorld 现场包</title>")
            .append(css())
            .append("</head><body>");

        cover(html, generatedAt, publicUrl, qrPath, evidence, manifest);
        quickStart(html, publicUrl, manifest);
        demoFlow(html, space, evidence);
        devices(html);
        deviceBootstrap(html, publicUrl);
        anchorCards(html, space);
        operatorSheet(html, evidence);

        html.append("</body></html>");
        return html.toString();
    }

    private static String css() {
        return """
            <style>
            @page {
              size: A4;
              margin: 14mm 13mm 15mm 13mm;
              @bottom-center {
                content: "镜见 InnerWorld 现场包 · " counter(page);
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
              font-size: 10pt;
              line-height: 1.52;
              letter-spacing: 0;
              background: #fff;
            }
            h1, h2, h3, h4, table, .sans, .tag, .meta, code, pre {
              font-family: "Noto Sans SC", "Noto Serif SC", sans-serif;
            }
            h1 { font-size: 28pt; line-height: 1.16; margin: 0 0 5mm; color: #101828; }
            h2 { font-size: 17pt; line-height: 1.2; margin: 0 0 4mm; color: #101828; page-break-after: avoid; }
            h3 { font-size: 12pt; margin: 5mm 0 2mm; color: #1d2939; page-break-after: avoid; }
            p { margin: 0 0 3mm; }
            table { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; page-break-inside: avoid; }
            th, td { border: 0.25mm solid #d0d5dd; padding: 2mm 2.2mm; vertical-align: top; white-space: pre-line; }
            th { background: #eef4ff; color: #1d2939; font-weight: 800; }
            code {
              font-family: "Noto Sans SC";
              font-size: 8.2pt;
              color: #1d2939;
            }
            pre {
              white-space: pre-wrap;
              font-size: 8.2pt;
              line-height: 1.38;
              background: #111827;
              color: #f9fafb;
              padding: 3mm;
              margin: 2mm 0 5mm;
              border-radius: 1.5mm;
            }
            .cover { min-height: 265mm; page-break-after: always; padding-top: 8mm; }
            .kicker { font-family: "Noto Sans SC"; color: #175cd3; font-size: 10pt; font-weight: 800; margin-bottom: 7mm; }
            .subtitle { font-size: 12.4pt; color: #344054; line-height: 1.56; margin-bottom: 8mm; }
            .two { display: table; width: 100%; border-collapse: separate; border-spacing: 5mm; margin: 0 -5mm; }
            .two > div { display: table-cell; width: 50%; vertical-align: top; }
            .qr {
              width: 54mm;
              height: 54mm;
              border: 0.4mm solid #101828;
              padding: 2mm;
              background: #fff;
            }
            .callout {
              border-left: 1.2mm solid #175cd3;
              background: #eff8ff;
              padding: 3mm 3.5mm;
              margin: 3mm 0 4mm;
              page-break-inside: avoid;
            }
            .ok { border-left-color: #079455; background: #ecfdf3; }
            .warn { border-left-color: #dc6803; background: #fffaeb; }
            .meta-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 3mm; margin: 5mm -3mm; }
            .meta-card { display: table-cell; width: 25%; border: 0.25mm solid #d0d5dd; padding: 3mm; background: #f9fafb; }
            .meta-label { font-family: "Noto Sans SC"; color: #667085; font-size: 8pt; }
            .meta-value { font-family: "Noto Sans SC"; color: #101828; font-size: 11.4pt; line-height: 1.25; font-weight: 900; margin-top: 1mm; }
            .small { font-size: 8.4pt; color: #475467; }
            .page { page-break-before: always; }
            .anchor-page { page-break-before: always; }
            .anchor-card {
              height: 82mm;
              border: 0.55mm solid #101828;
              padding: 5mm;
              margin-bottom: 5mm;
              page-break-inside: avoid;
            }
            .anchor-heading { font-family: "Noto Sans SC"; margin: 8mm 0 3mm; line-height: 1.22; }
            .anchor-id { display: inline-block; font-size: 30pt; font-weight: 900; color: #101828; margin-right: 4mm; }
            .anchor-label { display: inline-block; font-size: 20pt; font-weight: 800; color: #175cd3; }
            .tag { display: inline-block; font-size: 8pt; color: #1849a9; background: #eff4ff; border: 0.2mm solid #b2ccff; padding: 0.2mm 1.3mm; border-radius: 1mm; margin-right: 1mm; }
            .cut { color: #98a2b3; font-size: 8pt; text-align: right; }
            .big-step { font-family: "Noto Sans SC"; font-size: 13pt; font-weight: 800; color: #101828; }
            </style>
            """;
    }

    private static void cover(StringBuilder html, String generatedAt, String publicUrl, Path qrPath, JsonNode evidence, JsonNode manifest) {
        html.append("<section class='cover'>")
            .append("<div class='kicker'>Rokid · 镜见 InnerWorld · Field Kit</div>")
            .append("<h1>校园记忆展墙<br/>现场执行包</h1>")
            .append("<div class='subtitle'>用于交付和现场展示：主控机启动、观众入口、90 秒流程、A1/A2/A3 锚点牌、故障兜底、验收证据都放在一份可打印 PDF 里。</div>")
            .append("<div class='two'><div>")
            .append("<div class='callout ok'><b>最终成品画面：</b>观众在真实展墙前看到三处空间锚点，读取记忆信标，完成一段任务，加入体验活动，并写回一句给后来者的话。第二用户进入后在 A3 看到刚生成的新信标。</div>")
            .append("<p><b>入口地址</b></p>")
            .append("<p><code>").append(esc(publicUrl)).append("</code></p>")
            .append("<p class='small'>如果手机或 Rokid 从局域网访问，请用 <code>npm run dev:lan</code> 后把地址重渲染为 <code>http://&lt;Windows主控机IP&gt;:5177/</code>。</p>")
            .append("</div><div>")
            .append("<img class='qr' src='").append(esc(qrPath.toUri().toString())).append("' />")
            .append("<p class='small'>扫码入口。默认是 localhost；现场 LAN 版请用真实主控机 IP 重渲染。</p>")
            .append("</div></div>")
            .append("<div class='meta-grid'>")
            .append(meta("生成时间", compactTime(generatedAt), "Java + OpenHTMLToPDF"))
            .append(meta("彩排状态", text(evidence.at("/final_state/mission_state")), "User " + text(evidence.at("/final_state/active_user"))))
            .append(meta("完成步骤", String.valueOf(evidence.at("/final_state/completed_steps").size()), "读/找/服务/写回"))
            .append(meta("包 SHA", shortHash(text(manifest, "zip_sha256")), text(manifest, "package")))
            .append("</div>")
            .append("<div class='callout warn'><b>C 盘提醒：</b>当前项目已把大下载和缓存放到 D 盘策略里。现场前后运行 <code>npm run cache:report</code> 和 <code>npm run cache:clean</code>，不要把 Unity/Android 大包堆到 C 盘。</div>")
            .append("</section>");
    }

    private static void quickStart(StringBuilder html, String publicUrl, JsonNode manifest) {
        html.append("<section><h2>1. 主控机启动页</h2>")
            .append("<table><tr><th>场景</th><th>命令</th><th>验收</th></tr>")
            .append(row("本机投屏", "cd C:\\Users\\33516\\Documents\\Rokid\\innerworld-rokid\nnpm run dev", "Chrome 打开 http://localhost:5177/，右侧控制台可见。"))
            .append(row("局域网设备", "npm run dev:lan\nnpm run unity:config -- http://<Windows主控机IP>:5177", "手机/Rokid 访问主控机 IP，API health 返回 demo_ready=true。"))
            .append(row("干净开场", "npm run reset\nnpm run check:readonly", "entered / 2 beacons / 0 completed steps。"))
            .append(row("自动验收", "npm run evidence:rehearsal -- --reset-after", "生成 output/demo/rehearsal-evidence-latest.json，并自动复位。"))
            .append(row("打包", "npm run package:demo", "zip 不含 runtime_state.json，包内含 evidence 和 Windows/Android fallback。"))
            .append("</table>")
            .append("<div class='callout'><b>当前入口：</b><code>").append(esc(publicUrl)).append("</code>。最新候选包：<code>")
            .append(esc(text(manifest, "package"))).append("</code>，SHA256 <code>").append(esc(text(manifest, "zip_sha256"))).append("</code>。</div>")
            .append("<h3>现场窗口摆放</h3>")
            .append("<table><tr><th>屏幕</th><th>内容</th><th>作用</th></tr>")
            .append(row("大屏主画面", "Web demo 或 Windows Unity fallback", "让评委看到第一视角体验。"))
            .append(row("侧边小窗", "/api/health 或 Space Log", "证明不是静态 PPT，而是 API 状态在变。"))
            .append(row("备用窗口", "output/demo/rehearsal-evidence-latest.md", "网络或设备异常时展示自动验收证据。"))
            .append("</table></section>");
    }

    private static void demoFlow(StringBuilder html, JsonNode space, JsonNode evidence) {
        html.append("<section class='page'><h2>2. 90 秒流程卡</h2>")
            .append("<table><tr><th>秒数</th><th>讲解动作</th><th>系统状态</th><th>一句话</th></tr>")
            .append(row("0-8", "指向入口海报 A1", "entered", "现实墙面多出一层可打开的校园记忆。"))
            .append(row("8-20", "看向 A2 记忆信标", "read", "前人留言被压缩成三行，不挡视线。"))
            .append(row("20-38", "寻找隐藏年份", "find_year", "这不是导览，它会给你任务和线索。"))
            .append(row("38-55", "加入 14:30 体验活动", "service_action", "空间内容能连接服务动作。"))
            .append(row("55-75", "在 A3 写回一句话", "write_back", "地点可以被后来者继续书写。"))
            .append(row("75-90", "切 User B", "complete", "第二用户在同一位置看到刚写回的新信标。"))
            .append("</table>")
            .append("<h3>自动证据</h3>")
            .append("<table><tr><th>项目</th><th>值</th><th>说明</th></tr>")
            .append(row("最终用户", text(evidence.at("/final_state/active_user")), "应为 B"))
            .append(row("最终状态", text(evidence.at("/final_state/mission_state")), "应为 complete"))
            .append(row("完成步骤", joinSteps(evidence.at("/final_state/completed_steps")), "应包含 read/find_year/service_action/write_back"))
            .append(row("最终信标数", String.valueOf(evidence.at("/final_state/beacon_count").asInt()), "应为 3"))
            .append(row("复位后状态", text(evidence.at("/reset_after_state/mission_state")) + " / " + evidence.at("/reset_after_state/beacon_count").asInt() + " beacons", "打包前应回到 entered / 2 beacons"))
            .append("</table>")
            .append("<h3>空间数据</h3>")
            .append("<table><tr><th>space_id</th><th>任务</th><th>显示规则</th></tr>")
            .append(row(text(space, "space_id"), text(space.at("/mission/title")), "max_lines=" + space.at("/display_rule/max_lines").asInt() + ", low_distraction=" + space.at("/display_rule/low_distraction").asBoolean()))
            .append("</table></section>");
    }

    private static void devices(StringBuilder html) {
        html.append("<section class='page'><h2>3. 设备与兜底页</h2>")
            .append("<table><tr><th>设备</th><th>现场用途</th><th>失败时</th></tr>")
            .append(row("Windows 主控机", "运行 Space Server、投屏、Chrome 验收、Unity fallback、打包", "本机 localhost 继续演示，不依赖公网。"))
            .append(row("大屏/投影/HDMI", "展示第一视角和 Space Log", "录屏或 Web demo 全屏。"))
            .append(row("Rokid AR Studio", "硬件到场后接同一套 Space API", "未到场时用 Windows Unity fallback。"))
            .append(row("手机", "第二用户、扫码、热点、拍摄补位", "用 Chrome 打开 LAN 地址或展示 evidence。"))
            .append(row("打印物料", "入口 QR、A1/A2/A3 锚点牌、流程卡", "直接使用本 PDF 第 4 页剪裁。"))
            .append("</table>")
            .append("<div class='callout ok'><b>展示口径：</b>Windows 开发环境已经可用，不是问题。最终交付看起来是一面可以被眼镜打开的空间记忆展墙；Rokid 到场只是替换输入和显示层，Space API、任务、写回和证据链保持不变。</div>")
            .append("<h3>故障处理</h3>")
            .append("<table><tr><th>症状</th><th>动作</th><th>确认</th></tr>")
            .append(row("页面不是初始态", "npm run reset", "/api/health 是 entered / 2 / 0。"))
            .append(row("手机打不开", "改用 npm run dev:lan，并检查 Windows 防火墙/同网段", "手机访问 http://<IP>:5177/api/health。"))
            .append(row("Unity 无数据", "检查 innerworld-config.json 是否是主控机 IP", "Unity HUD 显示 LOCALHOST LIVE 或 LAN LIVE。"))
            .append(row("C 盘紧张", "npm run cache:clean；保留 Unity Library，先清 Hub/log/GPUCache", "C 盘高于 8GB 硬停线。"))
            .append("</table></section>");
    }

    private static void deviceBootstrap(StringBuilder html, String publicUrl) {
        String bootstrapUrl = url(publicUrl, "/api/device/bootstrap?profile=rokid-ar");
        String schemaUrl = url(publicUrl, "/api/ai/schema");
        String promptUrl = url(publicUrl, "/api/ai/prompt");

        html.append("<section class='page'><h2>4. Rokid 真机接入页</h2>")
            .append("<div class='callout warn'><b>LAN 硬规则：</b>Rokid 眼镜或手机从局域网访问时不能用 <code>localhost</code> 或 <code>127.0.0.1</code>。现场必须先运行 <code>npm run dev:lan</code>，然后把设备端地址改成 <code>http://&lt;Windows主控机IP&gt;:5177/</code>。</div>")
            .append("<table><tr><th>交接项</th><th>设备端读取</th><th>验收点</th></tr>")
            .append(row("Bootstrap", bootstrapUrl, "返回 base_url、space_id、A1/A2/A3、mission steps、client_hints、unity_compat.config。"))
            .append(row("AI 输出结构", schemaUrl, "HUD/旁白/提示文本必须按 schema 产出，避免真机端自由发挥。"))
            .append(row("AI Prompt", promptUrl, "现场生成或后续服务器 agent 使用同一套任务语气与安全边界。"))
            .append(row("详细文档", "docs\\rokid-device-integration.md", "包含请求顺序、写回 POST、no-store 缓存策略和防火墙提示。"))
            .append("</table>")
            .append("<h3>真机到场后的首轮命令</h3>")
            .append("<pre>cd C:\\Users\\33516\\Documents\\Rokid\\innerworld-rokid\nnpm run dev:lan\nnpm run check:device\nnpm run check:ops -- --require-artifacts\nnpm run check:unity</pre>")
            .append("<table><tr><th>阶段</th><th>Rokid 端动作</th><th>Space Server 端确认</th></tr>")
            .append(row("启动", "GET /api/device/bootstrap?profile=rokid-ar", "/api/health 返回 demo_ready=true，mission_state=entered。"))
            .append(row("识别 A1/A2/A3", "按 anchors 的 grid_pos/pose 显示低干扰 HUD", "nearby_pins 返回 2 个默认信标，A3 初始 locked。"))
            .append(row("推进任务", "POST /api/interactions", "completed_steps 依次出现 read/find_year/service_action。"))
            .append(row("写回", "POST /api/write-back 到 A3", "beacon_count 变为 3，User B 可读到新信标。"))
            .append("</table>")
            .append("<div class='callout ok'><b>硬件未到时的等价验收：</b>Web demo、Windows Unity fallback、check:device 和 rehearsal evidence 已经跑同一套 Space API。真机接入只替换输入/显示层，不改变任务、写回、AI 合约和交付证据链。</div>")
            .append("</section>");
    }

    private static void anchorCards(StringBuilder html, JsonNode space) {
        html.append("<section class='anchor-page'><h2>5. A1/A2/A3 锚点牌</h2>")
            .append("<p class='small'>打印后剪裁，贴在同一面墙或桌面展板上。A3 默认锁定，在写回阶段点亮。</p>");
        for (JsonNode anchor : space.path("anchors")) {
            String id = text(anchor, "anchor_id");
            String label = text(anchor, "label");
            String role = switch (id) {
                case "A1" -> "入口与官方彩蛋";
                case "A2" -> "记忆信标与任务线索";
                case "A3" -> "写回点与后来者信标";
                default -> "空间锚点";
            };
            String cue = switch (id) {
                case "A1" -> "观众从这里进入 Hidden Layer。";
                case "A2" -> "停顿 10 秒，让三行记忆摘要出现。";
                case "A3" -> "写回一句话，然后切 User B 读取。";
                default -> "保持可见。";
            };
            html.append("<div class='anchor-card'>")
                .append("<div class='cut'>cut line</div>")
                .append("<div class='anchor-heading'><span class='anchor-id'>").append(esc(id)).append("</span><span class='anchor-label'>")
                .append(esc(label)).append("</span></div>")
                .append("<p><span class='tag'>").append(esc(text(anchor, "kind"))).append("</span><span class='tag'>")
                .append(esc(text(anchor, "default_state"))).append("</span></p>")
                .append("<table><tr><th>用途</th><th>讲解提示</th><th>网格/姿态</th></tr>")
                .append(row(role, cue, "grid=(" + anchor.at("/grid_pos/x").asInt() + "," + anchor.at("/grid_pos/y").asInt() + "), pose=(" + anchor.at("/pose/x").asDouble() + "," + anchor.at("/pose/y").asDouble() + "," + anchor.at("/pose/z").asDouble() + ")"))
                .append("</table></div>");
        }
        html.append("</section>");
    }

    private static void operatorSheet(StringBuilder html, JsonNode evidence) {
        html.append("<section class='page'><h2>6. 操作员清单</h2>")
            .append("<table><tr><th>阶段</th><th>动作</th><th>通过标准</th></tr>")
            .append(row("前 10 分钟", "npm run cache:report；接电源；打开 Chrome；准备 HDMI/投屏", "C 盘可用空间记录在册，页面能打开。"))
            .append(row("前 5 分钟", "npm run reset；npm run check:readonly；打开 http://localhost:5177/", "entered / 2 beacons / 0 steps。"))
            .append(row("前 2 分钟", "运行 npm run evidence:rehearsal -- --reset-after", "生成 PASS 证据，且状态复位。"))
            .append(row("演示中", "按流程推进；A3 写回；切 User B", "Space Log 显示 complete/write_back/3 beacons。"))
            .append(row("演示后", "npm run reset；npm run package:demo", "新的 zip 和 manifest SHA 一致。"))
            .append("</table>")
            .append("<h3>最后一次自动证据摘要</h3>")
            .append("<div class='callout ok'><b>PASS：</b>")
            .append(" final_state=").append(esc(text(evidence.at("/final_state/mission_state"))))
            .append(", user=").append(esc(text(evidence.at("/final_state/active_user"))))
            .append(", steps=").append(evidence.at("/final_state/completed_steps").size())
            .append(", beacons=").append(evidence.at("/final_state/beacon_count").asInt())
            .append("; reset_after_state=").append(esc(text(evidence.at("/reset_after_state/mission_state"))))
            .append(", reset beacons=").append(evidence.at("/reset_after_state/beacon_count").asInt())
            .append(".</div>")
            .append("<h3>答辩短句</h3>")
            .append("<table><tr><th>追问</th><th>回答</th></tr>")
            .append(row("为什么不是手机？", "手机是列表，眼镜把线索贴回真实地点，观众边看边做。"))
            .append(row("为什么不是导览？", "导览只展示内容；这里有任务、服务动作、写回和后来者读取。"))
            .append(row("硬件没到怎么办？", "Web/Unity fallback 已跑通同一套 Space API，硬件到场只换输入和显示层。"))
            .append(row("定位不准怎么办？", "P0 使用一面墙三锚点，P1 再接 Rokid 空间能力；不把全校园厘米级定位当首日目标。"))
            .append("</table></section>");
    }

    private static String meta(String label, String value, String note) {
        return "<div class='meta-card'><div class='meta-label'>" + esc(label) + "</div><div class='meta-value'>" + esc(value) + "</div><div class='small'>" + esc(note) + "</div></div>";
    }

    private static String row(String a, String b, String c) {
        return "<tr>" + td(a) + td(b) + td(c) + "</tr>";
    }

    private static String row(String a, String b) {
        return "<tr>" + td(a) + td(b) + "</tr>";
    }

    private static String row(String a, String b, String c, String d) {
        return "<tr>" + td(a) + td(b) + td(c) + td(d) + "</tr>";
    }

    private static String td(String text) {
        return "<td>" + esc(text) + "</td>";
    }

    private static String joinSteps(JsonNode steps) {
        if (!steps.isArray()) return "";
        StringBuilder joined = new StringBuilder();
        for (JsonNode step : steps) {
            if (!joined.isEmpty()) joined.append(", ");
            joined.append(step.asText());
        }
        return joined.toString();
    }

    private static String shortHash(String hash) {
        if (hash == null || hash.length() < 12) return firstNonBlank(hash, "n/a");
        return hash.substring(0, 12);
    }

    private static String compactTime(String value) {
        if (value == null || value.length() < 16) return firstNonBlank(value, "n/a");
        return value.substring(5, 16);
    }

    private static String firstNonBlank(String value, String fallback) {
        if (value == null || value.isBlank()) return fallback;
        return value;
    }

    private static String url(String base, String path) {
        String cleanedBase = firstNonBlank(base, "http://localhost:5177/").trim();
        while (cleanedBase.endsWith("/")) {
            cleanedBase = cleanedBase.substring(0, cleanedBase.length() - 1);
        }
        String cleanedPath = path.startsWith("/") ? path : "/" + path;
        return cleanedBase + cleanedPath;
    }

    private static String text(JsonNode node, String key) {
        if (node == null || node.isMissingNode() || node.isNull()) return "";
        JsonNode value = node.path(key);
        if (value.isMissingNode() || value.isNull()) return "";
        return value.asText("");
    }

    private static String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return "";
        return node.asText("");
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
