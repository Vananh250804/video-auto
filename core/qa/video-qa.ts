import { ffmpegBin, run } from "../media/ffmpeg.ts";
import { probe } from "../media/probe.ts";

export interface QaIssue {
  level: "error" | "warning";
  code: "no_video" | "no_audio" | "duration" | "black" | "freeze" | "too_quiet" | "too_loud" | "silent";
  message: string;
}

export interface QaReport {
  ok: boolean; // false khi có lỗi "error"
  durationSec: number;
  width: number;
  height: number;
  loudnessLufs: number | null;
  issues: QaIssue[];
}

export interface QaOptions {
  expectAudio: boolean;
  expectedDurationSec?: number;
  maxBlackSec: number;
  maxFreezeSec: number;
}

export const DEFAULT_QA: QaOptions = { expectAudio: true, maxBlackSec: 1, maxFreezeSec: 3 };

const fmt = (n: number) => n.toFixed(1);

export function parseDetections(log: string, kind: "black" | "freeze"): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  if (kind === "black") {
    for (const m of log.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/g)) out.push({ start: Number(m[1]), end: Number(m[2]) });
  } else {
    let start: number | null = null;
    for (const line of log.split(/\r?\n/)) {
      const s = line.match(/freeze_start:\s*([\d.]+)/);
      if (s) start = Number(s[1]);
      const e = line.match(/freeze_end:\s*([\d.]+)/);
      if (e && start !== null) {
        out.push({ start, end: Number(e[1]) });
        start = null;
      }
    }
    if (start !== null) out.push({ start, end: Infinity });
  }
  return out;
}

export function parseLoudness(log: string): number | null {
  const m = log.match(/Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+|-inf) LUFS/);
  if (!m) return null;
  return m[1] === "-inf" ? -Infinity : Number(m[1]);
}

// Kiểm tra video cuối trước khi giao: khung đen, đứng hình, mất tiếng, âm lượng, độ dài.
export async function checkVideo(file: string, opts: QaOptions = DEFAULT_QA): Promise<QaReport> {
  const issues: QaIssue[] = [];
  const info = await probe(file).catch(() => null);
  if (!info) {
    return { ok: false, durationSec: 0, width: 0, height: 0, loudnessLufs: null, issues: [{ level: "error", code: "no_video", message: "File không có hình hoặc bị hỏng." }] };
  }

  if (opts.expectedDurationSec !== undefined && Math.abs(info.durationSec - opts.expectedDurationSec) > 0.5) {
    issues.push({ level: "error", code: "duration", message: `Độ dài ${fmt(info.durationSec)}s, mong đợi ${fmt(opts.expectedDurationSec)}s.` });
  }
  if (opts.expectAudio && !info.hasAudio) issues.push({ level: "error", code: "no_audio", message: "Video không có tiếng." });

  const filters = [`blackdetect=d=${opts.maxBlackSec}:pix_th=0.1`, `freezedetect=n=0.003:d=${opts.maxFreezeSec}`].join(",");
  const args = ["-hide_banner", "-nostats", "-i", file, "-map", "0:v:0", "-vf", filters, "-f", "null", "-"];
  if (info.hasAudio) args.push("-map", "0:a:0", "-af", "ebur128", "-f", "null", "-");
  const { stderr } = await run(ffmpegBin(), args);

  for (const b of parseDetections(stderr, "black")) {
    issues.push({ level: "warning", code: "black", message: `Màn hình đen ${fmt(b.start)}s đến ${fmt(b.end)}s.` });
  }
  for (const f of parseDetections(stderr, "freeze")) {
    const end = Math.min(f.end, info.durationSec);
    issues.push({ level: "warning", code: "freeze", message: `Hình đứng yên ${fmt(f.start)}s đến ${fmt(end)}s.` });
  }

  const loudness = info.hasAudio ? parseLoudness(stderr) : null;
  if (loudness !== null) {
    if (loudness === -Infinity || loudness < -50) issues.push({ level: opts.expectAudio ? "error" : "warning", code: "silent", message: "Có luồng tiếng nhưng hoàn toàn im lặng." });
    else if (loudness < -24) issues.push({ level: "warning", code: "too_quiet", message: `Tiếng nhỏ (${fmt(loudness)} LUFS). TikTok nên khoảng -14.` });
    else if (loudness > -8) issues.push({ level: "warning", code: "too_loud", message: `Tiếng quá to (${fmt(loudness)} LUFS), có thể bị rè.` });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    durationSec: info.durationSec,
    width: info.width,
    height: info.height,
    loudnessLufs: loudness === null || !Number.isFinite(loudness) ? null : loudness,
    issues,
  };
}
