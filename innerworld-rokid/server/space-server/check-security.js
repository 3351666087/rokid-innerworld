import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const ignoredDirectories = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "output",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".next",
  ".nuxt",
  "secrets",
  "local-secrets"
]);

const ignoredExtensions = new Set([
  ".7z",
  ".apk",
  ".bin",
  ".bmp",
  ".dll",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".rar",
  ".tar",
  ".webp",
  ".zip"
]);

const textExtensions = new Set([
  ".asmdef",
  ".cs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".sh",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);

const textFileNames = new Set([
  ".gitignore",
  "package.json",
  "README",
  "README.md"
]);

const secretFileNamePatterns = [
  /^\.env(?:\..*)?$/i,
  /(?:^|[.-])secret(?:[.-]|$)/i
];

const secretRules = [
  {
    name: "generic-sk-prefixed-token",
    pattern: /(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/
  },
  {
    name: "qwen-or-dashscope-env-assignment",
    pattern: /\b(?:QWEN|DASHSCOPE)_API_KEY\s*(?:=|:)\s*["']?(?!<|your\b|example\b|placeholder\b|changeme\b|unset\b|$)[^\s"'#]{12,}/i
  },
  {
    name: "qwen-or-dashscope-key-near-token",
    pattern: /\b(?:qwen|dashscope)\b.{0,60}\b(?:api[_-]?key|secret|token)\b.{0,40}["':=]\s*["']?(?!<|your\b|example\b|placeholder\b|changeme\b|unset\b|$)[A-Za-z0-9_-]{16,}/i
  }
];

function toProjectPath(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function isSecretFileName(fileName) {
  return secretFileNamePatterns.some((pattern) => pattern.test(fileName));
}

function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase();

  if (isSecretFileName(fileName)) return true;
  if (ignoredExtensions.has(extension)) return true;
  if (textFileNames.has(fileName)) return false;
  return !textExtensions.has(extension);
}

function hasBinaryMarker(buffer) {
  const sampleLength = Math.min(buffer.length, 4096);
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) return true;
  }
  return false;
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        yield* walk(entryPath);
      }
      continue;
    }

    if (entry.isFile() && !shouldSkipFile(entryPath)) {
      yield entryPath;
    }
  }
}

async function scanFile(filePath) {
  const buffer = await readFile(filePath);
  if (hasBinaryMarker(buffer)) return [];

  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    for (const rule of secretRules) {
      if (rule.pattern.test(line)) {
        findings.push({
          file: toProjectPath(filePath),
          line: index + 1,
          rule: rule.name
        });
      }
    }
  });

  return findings;
}

async function main() {
  await stat(root);

  const findings = [];
  let scannedFiles = 0;

  for await (const filePath of walk(root)) {
    scannedFiles += 1;
    findings.push(...await scanFile(filePath));
  }

  if (findings.length > 0) {
    console.error("Potential secret material was found. Matched values are intentionally hidden.");
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line} ${finding.rule}`);
    }
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    scanned_files: scannedFiles,
    skipped_local_secret_patterns: [".env", ".env.*", "*.secret", "secrets/", "local-secrets/"],
    rules: secretRules.map((rule) => rule.name)
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
