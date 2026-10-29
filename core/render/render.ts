import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { tmpdir } from "node:os";
import { projectRoot } from "../config/index.ts";
import { probe, type AspectRatio } from "../media/probe.ts";
import type { CaptionStyle, EditProps, RenderCaption, TemplateName } from "../../renderers/remotion/shared/types.ts";
import { validateEdit, type EditSpec } from "./edit-spec.ts";
import { serveFiles } from "./file-server.ts";

const TEMPLATE_BY_RATIO: Record<AspectRatio, TemplateName> = {
  "9:16": "portrait-9x16",
  "4:5": "portrait-9x16",
  "3:4": "portrait-9x16",
  "1:1": "square-1x1",
  "4:3": "landscape-16x9",
  "16:9": "landscape-16x9",
};

const OVERLAY_DEFAULT = { kind: "text" as const, text: "", position: "top" as const, color: "#FFFFFF", background: "#FF2D55" };

export const resolvePath = (p: string) => (isAbsolute(p) ? p : resolve(projectRoot(), p));

function mustExist(file: string, label: string): string {
  if (!existsSync(file)) throw new Error(`Không tìm thấy ${label}: ${file}`);
  return file;
}

// Chiều rộng/cao chẵn (H.264 yêu cầu), cạnh ngắn tối đa maxShortSide
export function outputSize(width: number, height: number, maxShortSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxShortSide / Math.min(width, height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

export async function loadCaptionStyle(name: string): Promise<CaptionStyle | null> {
  if (name === "none") return null;
  const file = resolve(projectRoot(), "presets/captions", `${name}.json`);
  if (!existsSync(file)) throw new Error(`Không có preset phụ đề "${name}" trong presets/captions/`);
  return JSON.parse(await readFile(file, "utf8"));
}

// Đọc edit.json → props cho Remotion. Trả về danh sách file cần phục vụ qua http.
export async function buildProps(spec: EditSpec): Promise<{ props: EditProps; files: string[] }> {
  const video = mustExist(resolvePath(spec.video), "video");
  const info = await probe(video);
  const files = [video];
  const url = (file: string) => {
    files.push(file);
    return `__FILE_${files.length - 1}__`;
  };

  const captions: RenderCaption[] = spec.captions
    ? JSON.parse(await readFile(mustExist(resolvePath(spec.captions), "captions"), "utf8"))
    : [];
  const fps = Math.min(60, Math.round(info.fps) || 30);
  const size = outputSize(info.width, info.height, spec.maxShortSide ?? 1080);

  const props: EditProps = {
    videoSrc: "__FILE_0__",
    ...size,
    fps,
    durationInFrames: Math.max(1, Math.ceil(info.durationSec * fps)),
    template: TEMPLATE_BY_RATIO[info.aspectRatio],
    originalVolume: spec.originalVolume ?? 1,
    captions,
    captionStyle: await loadCaptionStyle(spec.captionStyle ?? "tiktok"),
    overlays: (spec.overlays ?? []).map((o) => ({ ...OVERLAY_DEFAULT, ...o })),
    zooms: (spec.zooms ?? []).map((z) => ({ start: z.start, end: z.end, scale: z.scale ?? 1.12 })),
    sfx: (spec.sfx ?? []).map((s) => ({ src: url(mustExist(resolvePath(s.file), "sfx")), at: s.at, volume: s.volume ?? 1 })),
    music: spec.music ? { src: url(mustExist(resolvePath(spec.music.file), "nhạc")), volume: spec.music.volume ?? 0.15 } : null,
  };
  return { props, files };
}

function fillUrls(props: EditProps, urls: string[]): EditProps {
  const json = JSON.stringify(props).replace(/__FILE_(\d+)__/g, (_, i) => urls[Number(i)]);
  return JSON.parse(json);
}

export interface RenderOptions {
  onProgress?: (progress: number) => void;
}

export async function renderEdit(input: unknown, output: string, opts: RenderOptions = {}) {
  const spec = validateEdit(input);
  const { props, files } = await buildProps(spec);

  // Nạp Remotion khi cần, để các lệnh khác không phải chờ
  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

  const server = await serveFiles(files);
  try {
    const inputProps = fillUrls(props, server.urls);
    const serveUrl = await bundle({
      entryPoint: resolve(projectRoot(), "renderers/remotion/entrypoints/index.ts"),
      outDir: resolve(tmpdir(), "video-auto-remotion-bundle"),
    });
    const composition = await selectComposition({ serveUrl, id: "Edit", inputProps, browserExecutable });
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: "h264",
      crf: 18,
      outputLocation: resolvePath(output),
      browserExecutable,
      onProgress: ({ progress }) => opts.onProgress?.(progress),
    });
  } finally {
    await server.close();
  }
  return {
    output: resolvePath(output),
    width: props.width,
    height: props.height,
    fps: props.fps,
    durationSec: props.durationInFrames / props.fps,
    template: props.template,
  };
}
