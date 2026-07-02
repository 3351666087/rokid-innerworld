const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const chatPath = path.join(root, "群聊_Rokid", "群聊_Rokid.jsonl");
const mediaRoot = path.join(root, "群聊_Rokid", "media");
const outDir = path.join(root, "analysis");

fs.mkdirSync(outDir, { recursive: true });

function decodeMaybeMojibake(text) {
  if (typeof text !== "string") return text;
  const suspicious = /[äåæçèéïðñòóôõöøùúûüýĀ-ſ]|鐜|寮|犱|笘|灏|徊|鎰|淪/.test(text);
  if (!suspicious) return text;
  try {
    const recovered = Buffer.from(text, "latin1").toString("utf8");
    const score = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length - (s.match(/[�]/g) || []).length * 4;
    if (score(recovered) > score(text)) return recovered;
  } catch {
    return text;
  }
  return text;
}

function formatTime(ts) {
  const ms = Number(ts) * 1000;
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

const rawLines = fs.readFileSync(chatPath, "utf8").split(/\r?\n/).filter(Boolean);
const records = rawLines.map((line, index) => {
  const record = JSON.parse(line);
  record.__line = index + 1;
  if (record.accountName) record.accountName = decodeMaybeMojibake(record.accountName);
  if (record.content) record.content = decodeMaybeMojibake(record.content);
  return record;
});

const members = records.filter((r) => r._type === "member").map((r) => ({
  platformId: r.platformId,
  accountName: r.accountName,
  avatar: r.avatar,
}));

const messages = records.filter((r) => r._type === "message").map((r, idx) => ({
  index: idx + 1,
  line: r.__line,
  sender: r.sender,
  accountName: r.accountName || r.sender,
  timestamp: r.timestamp,
  time: formatTime(r.timestamp),
  type: r.type,
  content: r.content || "",
  platformMessageId: r.platformMessageId,
  replyToMessageId: r.replyToMessageId || null,
  chatRecords: r.chatRecords || null,
}));

const urlRegex = /https?:\/\/[^\s"'<>）)】\]]+|www\.[^\s"'<>）)】\]]+/g;
const links = [];
for (const message of messages) {
  const contentLinks = message.content.match(urlRegex) || [];
  for (const url of contentLinks) {
    links.push({
      messageIndex: message.index,
      time: message.time,
      accountName: message.accountName,
      url,
      context: message.content,
    });
  }
}

const mediaFiles = walkFiles(mediaRoot).map((file) => {
  const stat = fs.statSync(file);
  return {
    path: file,
    relativePath: path.relative(root, file).replace(/\\/g, "/"),
    extension: path.extname(file).toLowerCase(),
    bytes: stat.size,
    lastWriteTime: stat.mtime.toISOString(),
  };
});

const mediaByRelativePath = new Map(mediaFiles.map((file) => [file.relativePath, file]));
const mediaByBasename = new Map(mediaFiles.map((file) => [path.basename(file.relativePath), file]));

function normalizeSlashes(value) {
  return String(value || "").replace(/\\/g, "/");
}

function referencedMediaForMessage(message) {
  const content = normalizeSlashes(message.content);
  const matches = [];
  for (const mediaFile of mediaFiles) {
    if (content.includes(mediaFile.relativePath) || content.includes(path.basename(mediaFile.relativePath))) {
      matches.push(mediaFile);
    }
  }
  return matches;
}

const messageEvidence = [];
for (const message of messages) {
  const content = normalizeSlashes(message.content);
  const referencedMedia = referencedMediaForMessage(message);
  const fileMatch = message.type === 4 ? message.content.match(/^\[文件\]\s*(.+)$/) : null;
  const linkMatches = message.content.match(urlRegex) || [];
  if (message.type === 4 || message.type === 7 || referencedMedia.length || linkMatches.length) {
    messageEvidence.push({
      messageIndex: message.index,
      line: message.line,
      time: message.time,
      accountName: message.accountName,
      type: message.type,
      kind: message.type === 4 ? "file" : referencedMedia.length ? "local-media" : linkMatches.length ? "link-or-card" : "media-or-forward",
      content: message.content,
      fileName: fileMatch ? fileMatch[1] : null,
      urls: linkMatches,
      localMedia: referencedMedia.map((file) => ({
        relativePath: file.relativePath,
        bytes: file.bytes,
        extension: file.extension,
      })),
      availability: message.type === 4
        ? "mentioned-in-chat-export-only; file binary not present in moved export folder"
        : referencedMedia.length
          ? "local media file present"
          : "chat record/card present; local binary may not be present",
    });
  }
}

for (const mediaFile of mediaFiles) {
  const isReferenced = messageEvidence.some((entry) =>
    entry.localMedia.some((media) => media.relativePath === mediaFile.relativePath)
  );
  if (!isReferenced && !mediaFile.relativePath.includes("/emojis/")) {
    messageEvidence.push({
      messageIndex: null,
      line: null,
      time: null,
      accountName: null,
      type: null,
      kind: "unmatched-local-media",
      content: null,
      fileName: null,
      urls: [],
      localMedia: [{
        relativePath: mediaFile.relativePath,
        bytes: mediaFile.bytes,
        extension: mediaFile.extension,
      }],
      availability: "local media file present but not directly referenced by a JSON message content field",
    });
  }
}

const keywordGroups = {
  hardware: ["硬件", "Rokid", "眼镜", "Glass", "AR", "摄像头", "麦克风", "设备", "手机", "蓝牙", "WiFi", "安卓", "Android", "iOS", "算力", "端侧", "云端", "MCP", "模型", "语音", "OCR", "视觉", "传感器", "屏幕", "显示", "投屏"],
  plan: ["方案", "执行", "目标", "任务", "里程碑", "落地", "开发", "实现", "Demo", "MVP", "PoC", "接口", "架构", "流程", "分工", "时间", "测试", "部署"],
  people: ["理念", "想法", "认为", "觉得", "希望", "问题", "需求", "用户", "体验", "价值", "商业", "产品"],
  files: ["pdf", "PDF", "文件", "文档", "链接", "资料", "附件", "上传", "下载"],
};

const evidence = {};
for (const [group, keywords] of Object.entries(keywordGroups)) {
  evidence[group] = messages.filter((m) =>
    keywords.some((keyword) => m.content.toLowerCase().includes(keyword.toLowerCase()))
  );
}

const typeCounts = {};
for (const message of messages) {
  typeCounts[message.type] = (typeCounts[message.type] || 0) + 1;
}

const senderCounts = {};
for (const message of messages) {
  senderCounts[message.accountName] = (senderCounts[message.accountName] || 0) + 1;
}

const summary = {
  source: chatPath,
  lineCount: records.length,
  memberCount: members.length,
  messageCount: messages.length,
  firstMessageTime: messages[0]?.time,
  lastMessageTime: messages[messages.length - 1]?.time,
  typeCounts,
  senderCounts,
  linkCount: links.length,
  mediaFileCount: mediaFiles.length,
  mediaBytes: mediaFiles.reduce((sum, file) => sum + file.bytes, 0),
};

function mdEscape(text) {
  return String(text || "").replace(/\r?\n/g, "\n");
}

const timelineMd = [
  "# Rokid 群聊完整时间线",
  "",
  `消息数: ${messages.length}`,
  `时间范围: ${summary.firstMessageTime} - ${summary.lastMessageTime}`,
  "",
  ...messages.map((m) => [
    `## ${String(m.index).padStart(3, "0")} | ${m.time} | ${m.accountName} | type=${m.type}`,
    "",
    mdEscape(m.content),
    "",
    m.chatRecords ? "```json\n" + JSON.stringify(m.chatRecords, null, 2) + "\n```" : "",
  ].filter(Boolean).join("\n")),
].join("\n");

const evidenceMd = [
  "# Rokid 群聊证据索引",
  "",
  ...Object.entries(evidence).map(([group, rows]) => [
    `## ${group}`,
    "",
    `命中 ${rows.length} 条`,
    "",
    ...rows.map((m) => `- ${m.time} | ${m.accountName} | #${m.index}: ${m.content.replace(/\s+/g, " ").trim()}`),
  ].join("\n")),
].join("\n\n");

fs.writeFileSync(path.join(outDir, "chat_summary.json"), JSON.stringify(summary, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "members.json"), JSON.stringify(members, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "messages.json"), JSON.stringify(messages, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "links.json"), JSON.stringify(links, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "media_manifest.json"), JSON.stringify(mediaFiles, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "message_evidence.json"), JSON.stringify(messageEvidence, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "chat_timeline.md"), timelineMd, "utf8");
fs.writeFileSync(path.join(outDir, "evidence_index.md"), evidenceMd, "utf8");

console.log(JSON.stringify(summary, null, 2));
