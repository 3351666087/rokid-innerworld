import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export async function readJson(file) {
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

export async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return await readJson(file);
  } catch (error) {
    return {
      ok: false,
      path: file,
      parse_error: error.message
    };
  }
}

export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const tempFile = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempFile, file);
}
