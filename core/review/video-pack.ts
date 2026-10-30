import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Caption } from "../subtitles/captions.ts";
import { probe } from "../media/probe.ts";
import { ffmpegBin, run } from "../media/ffmpeg.ts";
import { contactSheet } from "../qa/contact-sheet.ts";
import { RISKY_PHRASES } from "./script-checks.ts";

// Gói đánh giá cho skill video-review: lời nói có mốc giây, số liệu, khung hình. Agent đọc gói này thay vì xem video.

const GAP_SEC = 1.5;
const FILLERS = ["anh em ạ", "anh em nhá", "anh em nha", "anh em nhé", "cả nhà ơi", "các bạn ạ", "đấy", "nhé", "nhá", "nói chung", "kiểu là", "thì là"];
const SPOKEN_RISKY = ["vãi", "vl", "đéo", "chất lượng nhất", "không đâu bằng"];
// \b của JS không hiểu chữ có dấu, nên tự viết biên của từ
const word = (alts: string) => new RegExp(`(?<![\\p{L}\\p{N}])(${alts})(?![\\p{L}\\p{N}])`, "iu");
const PRICE = word("\\d+(?:[.,]\\d+)?\\s*(?:k|nghìn|ngàn|triệu|tr|đồng|đ)|nghìn|ngàn|triệu|chục|lít|lốp|lốt|xị|củ|giá");
const CTA = word("giỏ hàng|bấm|inbox|nhắn tin|link|mua ngay|đặt hàng|đặt ngay|chốt đơn|theo dõi|follow");

export interface ReviewStats {
  durationSec: number;
  speechSec: number;
  speechRatio: number;
  wordsPerSecond: number;
  firstSpeechAt: number | null;
  gaps: { start: number; end: number; sec: number }[];
  fillers: { phrase: string; count: number }[];
  risky: { phrase: string; at: number; line: string }[];
  priceMentions: { at: number; line: string }[];
  ctaMentions: { at: number; line: string }[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const id = (i: number) => `N${String(i + 1).padStart(2, "0")}`;
const count = (text: string, phrase: string) => text.toLowerCase().split(phrase).length - 1;

export function analyzeCaptions(captions: Caption[], durationSec: number): ReviewStats {
  const gaps: ReviewStats["gaps"] = [];
  let cursor = 0;
  for (const c of [...captions, { start: durationSec, end: durationSec } as Caption]) {
    if (c.start - cursor >= GAP_SEC) gaps.push({ start: r2(cursor), end: r2(c.start), sec: r2(c.start - cursor) });
    cursor = Math.max(cursor, c.end);
  }
  const speechSec = captions.reduce((s, c) => s + (c.end - c.start), 0);
  const words = captions.reduce((s, c) => s + (c.words.length || c.text.split(/\s+/).length), 0);
  const all = captions.map((c) => c.text).join(" ");
  const lineAt = (re: RegExp) => captions.filter((c) => re.test(c.text)).map((c) => ({ at: r2(c.start), line: c.text }));
  const risky = [...RISKY_PHRASES, ...SPOKEN_RISKY].flatMap((p) =>
    captions.filter((c) => word(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(c.text)).map((c) => ({ phrase: p, at: r2(c.start), line: c.text })),
  );
  return {
    durationSec: r2(durationSec),
    speechSec: r2(speechSec),
    speechRatio: durationSec ? r2(speechSec / durationSec) : 0,
    wordsPerSecond: speechSec ? r2(words / speechSec) : 0,
    firstSpeechAt: captions.length ? r2(captions[0].start) : null,
    gaps,
    fillers: FILLERS.map((phrase) => ({ phrase, count: count(all, phrase) })).filter((f) => f.count >= 2),
    risky,
    priceMentions: lineAt(PRICE),
    ctaMentions: lineAt(CTA),
  };
}

// Lời nói đánh số N01..., chèn dòng "không có lời" ở các khoảng trống dài
export function transcriptMarkdown(captions: Caption[], stats: ReviewStats): string {
  const rows: { at: number; text: string }[] = captions.map((c, i) => ({ at: c.start, text: `${id(i)} [${c.start.toFixed(2)}–${c.end.toFixed(2)}] ${c.text}` }));
  for (const g of stats.gaps) rows.push({ at: g.start + 0.001, text: `— không có lời ${g.start.toFixed(2)}–${g.end.toFixed(2)} (${g.sec}s) —` });
  rows.sort((a, b) => a.at - b.at);
  return `# Lời nói (${stats.durationSec}s, có lời ${Math.round(stats.speechRatio * 100)}%, ${stats.wordsPerSecond} từ/giây)\n\n${rows.map((r) => r.text).join("\n")}\n`;
}

// 0–3s chụp dày để chấm hook, sau đó mỗi 3 giây
export function frameTimes(durationSec: number, every = 3): number[] {
  const end = Math.max(0, durationSec - 0.1);
  const times = [0, 0.5, 1, 1.5, 2, 3];
  for (let t = 6; t < end; t += every) times.push(t);
  times.push(end);
  return [...new Set(times.filter((t) => t <= end).map(r2))].sort((a, b) => a - b);
}

export async function buildReviewPack(opts: { video: string; captions: Caption[]; outDir: string; brief?: string }) {
  const info = await probe(opts.video);
  const frames = join(opts.outDir, "frames");
  await mkdir(frames, { recursive: true });
  const stats = analyzeCaptions(opts.captions, info.durationSec);
  const files: string[] = [];
  for (const t of frameTimes(info.durationSec)) {
    const file = join(frames, `t${t.toFixed(1).padStart(5, "0")}s.jpg`);
    await run(ffmpegBin(), ["-hide_banner", "-y", "-ss", String(t), "-i", opts.video, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "4", file]);
    files.push(file);
  }
  const { sheet } = await contactSheet(opts.video, join(opts.outDir, "sheet.png"));
  await writeFile(join(opts.outDir, "transcript.md"), transcriptMarkdown(opts.captions, stats), "utf8");
  await writeFile(join(opts.outDir, "stats.json"), JSON.stringify({ video: opts.video, aspectRatio: info.aspectRatio, ...stats }, null, 2), "utf8");
  if (opts.brief) await writeFile(join(opts.outDir, "brief.txt"), opts.brief, "utf8");
  return { dir: opts.outDir, frames: files.length, sheet, stats };
}

export async function readCaptions(file: string): Promise<Caption[]> {
  if (!existsSync(file)) throw new Error(`Không có file phụ đề: ${file}`);
  return JSON.parse(await readFile(file, "utf8"));
}
