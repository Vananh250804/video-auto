import { existsSync, readdirSync, statSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { StorageProvider, StoredFile } from "../../../core/contracts/providers.ts";

const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".mkv", ".webm"]);

// Lưu trữ bằng thư mục trên máy, dùng khi chưa nối Google Drive hoặc để thử
export class LocalStorage implements StorageProvider {
  readonly name = "local";
  constructor(private cfg: { inputDir: string; outputDir: string }) {}

  async download(ref: string, destDir: string): Promise<StoredFile> {
    let src = ref.trim() ? resolve(ref) : resolve(this.cfg.inputDir);
    if (!existsSync(src)) throw new Error(`Không tìm thấy: ${src}`);
    if (statSync(src).isDirectory()) {
      const videos = readdirSync(src)
        .filter((f) => VIDEO_EXT.has(extname(f).toLowerCase()))
        .map((f) => join(src, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
      if (!videos.length) throw new Error(`Thư mục ${src} không có video.`);
      src = videos[0];
    }
    const dest = join(destDir, basename(src));
    await copyFile(src, dest);
    return { path: dest, name: basename(src) };
  }

  async upload(file: string, name: string): Promise<{ url: string }> {
    await mkdir(this.cfg.outputDir, { recursive: true });
    const dest = join(this.cfg.outputDir, name);
    await copyFile(file, dest);
    return { url: dest };
  }
}
