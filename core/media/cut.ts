import { ffmpegBin, run } from "./ffmpeg.ts";
import { probe } from "./probe.ts";

export interface Segment {
  start: number;
  end: number;
}

export interface CutOptions {
  silenceThresholdDb: number;
  minSilenceSec: number;
  paddingSec: number;
  minSegmentSec: number;
}

// Giống config/default.yaml
export const DEFAULT_CUT_OPTIONS: CutOptions = {
  silenceThresholdDb: -35,
  minSilenceSec: 0.6,
  paddingSec: 0.12,
  minSegmentSec: 0.3,
};

export async function detectSilences(file: string, opts: CutOptions): Promise<Segment[]> {
  const { stderr } = await run(ffmpegBin(), [
    "-hide_banner", "-nostats",
    "-i", file,
    "-af", `silencedetect=noise=${opts.silenceThresholdDb}dB:d=${opts.minSilenceSec}`,
    "-f", "null", "-",
  ]);
  return parseSilenceLog(stderr);
}

export function parseSilenceLog(log: string): Segment[] {
  const silences: Segment[] = [];
  let start: number | null = null;
  for (const line of log.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && start !== null) {
      silences.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  // Im lặng kéo dài tới hết video thì không có silence_end
  if (start !== null) silences.push({ start, end: Infinity });
  return silences;
}

// Đảo các khoảng lặng thành các đoạn giữ lại, chừa padding và gộp đoạn chồng nhau.
export function keepSegments(silences: Segment[], durationSec: number, opts: CutOptions): Segment[] {
  const raw: Segment[] = [];
  let cursor = 0;
  for (const s of silences) {
    if (s.start > cursor) raw.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < durationSec) raw.push({ start: cursor, end: durationSec });

  const padded = raw.map((s) => ({
    start: Math.max(0, s.start - opts.paddingSec),
    end: Math.min(durationSec, s.end + opts.paddingSec),
  }));

  const merged: Segment[] = [];
  for (const s of padded) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged
    .filter((s) => s.end - s.start >= opts.minSegmentSec)
    .map((s) => ({ start: round(s.start), end: round(s.end) }));
}

const round = (n: number) => Math.round(n * 1000) / 1000;

// Cắt và nối các đoạn, render lại để cắt chính xác đến từng khung hình.
export async function renderSegments(input: string, segments: Segment[], output: string, hasAudio: boolean): Promise<void> {
  if (segments.length === 0) throw new Error("Không còn đoạn nào để giữ lại sau khi cắt.");
  const parts: string[] = [];
  const labels: string[] = [];
  segments.forEach((s, i) => {
    parts.push(`[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS[v${i}]`);
    labels.push(`[v${i}]`);
    if (hasAudio) {
      parts.push(`[0:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS[a${i}]`);
      labels.push(`[a${i}]`);
    }
  });
  const a = hasAudio ? 1 : 0;
  parts.push(`${labels.join("")}concat=n=${segments.length}:v=1:a=${a}[outv]${hasAudio ? "[outa]" : ""}`);

  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    "-i", input,
    "-filter_complex", parts.join(";"),
    "-map", "[outv]",
    ...(hasAudio ? ["-map", "[outa]", "-c:a", "aac", "-b:a", "192k"] : []),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    output,
  ]);
}

export interface CutResult {
  input: string;
  output: string;
  originalSec: number;
  keptSec: number;
  removedSec: number;
  segments: Segment[];
}

export async function cutSilences(input: string, output: string, opts: CutOptions = DEFAULT_CUT_OPTIONS, dryRun = false): Promise<CutResult> {
  const info = await probe(input);
  const segments = info.hasAudio
    ? keepSegments(await detectSilences(input, opts), info.durationSec, opts)
    : [{ start: 0, end: info.durationSec }];
  if (!dryRun) await renderSegments(input, segments, output, info.hasAudio);
  const keptSec = round(segments.reduce((sum, s) => sum + s.end - s.start, 0));
  return {
    input,
    output,
    originalSec: round(info.durationSec),
    keptSec,
    removedSec: round(info.durationSec - keptSec),
    segments,
  };
}
