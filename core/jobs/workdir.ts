import { mkdir } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { loadConfig, projectRoot } from "../config/index.ts";

// Thư mục làm việc cho một video: workspace/jobs/<tên-file>-<thời-gian>/
export async function createJobDir(input: string, outDir?: string): Promise<string> {
  const dir = outDir
    ? resolve(outDir)
    : resolve(projectRoot(), loadConfig().workspace_dir, "jobs", `${slug(basename(input, extname(input)))}-${stamp()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "video";
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
