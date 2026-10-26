import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { projectRoot } from "../config/index.ts";
import type { LlmProvider } from "../contracts/providers.ts";
import { probe } from "../media/probe.ts";
import { validateEdit, type EditSpec } from "../render/edit-spec.ts";
import { resolvePath } from "../render/render.ts";
import type { Caption } from "../subtitles/captions.ts";
import { extractJson, fillTemplate } from "./json.ts";
import { loadWorkflow } from "./workflows.ts";

export interface PlanInput {
  video: string;
  captions?: string;
  workflow: string;
  request?: string; // yêu cầu tự do của người dùng, bỏ trống = mặc định
  llm: LlmProvider;
}

export interface PlanResult {
  edit: EditSpec;
  notes: string;
  dropped: string[]; // những gì Claude đề xuất nhưng bị bỏ vì không hợp lệ
}

const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg"]);

function listFiles(dir: string, exts: Set<string>): string[] {
  const abs = resolve(projectRoot(), dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => exts.has(extname(f).toLowerCase()))
    .map((f) => `${dir}/${f}`);
}

export function listCaptionStyles(): string[] {
  return listFiles("presets/captions", new Set([".json"])).map((f) => basename(f, ".json"));
}

const round = (n: number) => Math.round(n * 100) / 100;

function captionsForPrompt(captions: Caption[]): string {
  if (captions.length === 0) return "(không có phụ đề)";
  return captions.slice(0, 250).map((c) => `[${c.start.toFixed(2)}-${c.end.toFixed(2)}] ${c.text}`).join("\n");
}

// Làm sạch kế hoạch của Claude: kẹp thời gian, bỏ file không có trong danh sách, preset không tồn tại.
export function sanitizePlan(
  raw: any,
  ctx: { duration: number; captionStyles: string[]; sfxFiles: string[]; musicFiles: string[]; defaults: { captionStyle: string; originalVolume: number } },
): { plan: Omit<EditSpec, "video" | "captions">; dropped: string[] } {
  const dropped: string[] = [];
  const clamp = (n: unknown) => round(Math.min(ctx.duration, Math.max(0, Number(n) || 0)));

  let captionStyle = ctx.defaults.captionStyle;
  if (raw.captionStyle === "none" || ctx.captionStyles.includes(raw.captionStyle)) captionStyle = raw.captionStyle;
  else if (raw.captionStyle) dropped.push(`kiểu phụ đề "${raw.captionStyle}" không có, dùng ${captionStyle}`);

  const vol = Number(raw.originalVolume);
  const originalVolume = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : ctx.defaults.originalVolume;

  const overlays = (Array.isArray(raw.overlays) ? raw.overlays : []).flatMap((o: any) => {
    const text = String(o?.text ?? "").trim();
    const start = clamp(o?.start);
    const end = clamp(o?.end);
    if (!text || end <= start) {
      dropped.push(`chữ highlight "${text}" sai thời gian`);
      return [];
    }
    return [{
      text,
      start,
      end,
      position: ["top", "center", "bottom"].includes(o.position) ? o.position : "top",
      ...(typeof o.color === "string" ? { color: o.color } : {}),
      ...(typeof o.background === "string" ? { background: o.background } : {}),
    }];
  });

  const sfx = (Array.isArray(raw.sfx) ? raw.sfx : []).flatMap((s: any) => {
    if (!ctx.sfxFiles.includes(s?.file)) {
      if (s?.file) dropped.push(`sfx "${s.file}" không có trong assets/sfx`);
      return [];
    }
    return [{ file: s.file, at: clamp(s.at), volume: Math.min(1, Math.max(0, Number(s.volume ?? 1) || 1)) }];
  });

  let music: EditSpec["music"];
  if (raw.music?.file) {
    if (ctx.musicFiles.includes(raw.music.file)) music = { file: raw.music.file, volume: Math.min(0.4, Math.max(0, Number(raw.music.volume ?? 0.12) || 0.12)) };
    else dropped.push(`nhạc "${raw.music.file}" không có trong assets/music`);
  }

  return { plan: { captionStyle, originalVolume, overlays, sfx, ...(music ? { music } : {}) }, dropped };
}

export async function planEdit(input: PlanInput): Promise<PlanResult> {
  const workflow = loadWorkflow(input.workflow);
  const info = await probe(resolvePath(input.video));
  const captions: Caption[] = input.captions ? JSON.parse(await readFile(resolvePath(input.captions), "utf8")) : [];
  const ctx = {
    duration: round(info.durationSec),
    captionStyles: listCaptionStyles(),
    sfxFiles: listFiles("assets/sfx", AUDIO_EXT),
    musicFiles: listFiles("assets/music", AUDIO_EXT),
    defaults: workflow.defaults,
  };
  const template = await readFile(resolve(projectRoot(), "prompts/edit-planner/plan.md"), "utf8");
  const values = {
    workflow: workflow.name,
    workflow_description: workflow.description,
    aspect: info.aspectRatio,
    duration: String(ctx.duration),
    captions: captionsForPrompt(captions),
    request: input.request?.trim() || "(không có, dùng mặc định cho loại video này)",
    overlays_hint: workflow.defaults.overlays_hint,
    sfx_hint: workflow.defaults.sfx_hint,
    caption_styles: [...ctx.captionStyles, "none"].join(", "),
    sfx_files: ctx.sfxFiles.join(", ") || "(trống)",
    music_files: ctx.musicFiles.join(", ") || "(trống)",
    retry: "",
  };

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (lastError) values.retry = `\n## Lần trước bị lỗi, sửa lại\n${lastError}`;
    const answer = await input.llm.complete(fillTemplate(template, values));
    try {
      const raw = extractJson(answer);
      const { plan, dropped } = sanitizePlan(raw, ctx);
      const edit = validateEdit({
        video: toProjectPath(input.video),
        ...(input.captions ? { captions: toProjectPath(input.captions) } : {}),
        ...plan,
      });
      return { edit, notes: String(raw.notes ?? ""), dropped };
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  throw new Error(`Claude trả kế hoạch không hợp lệ 2 lần: ${lastError}`);
}

// Giữ đường dẫn tương đối nếu file nằm trong project, cho edit.json dễ đọc
function toProjectPath(p: string): string {
  const abs = resolvePath(p);
  const rel = relative(projectRoot(), abs);
  return rel.startsWith("..") ? abs : rel.split("\\").join("/");
}
