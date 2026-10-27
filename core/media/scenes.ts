import { join } from "node:path";
import { ffmpegBin, run } from "./ffmpeg.ts";

// Đọc thời điểm chuyển cảnh từ log showinfo của ffmpeg
export function parseSceneTimes(stderr: string): number[] {
  const times = [...stderr.matchAll(/pts_time:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  return times.filter((t) => Number.isFinite(t)).sort((a, b) => a - b);
}

// Chia video thành các cảnh theo điểm chuyển cảnh. Cảnh ngắn hơn minShotSec thì gộp vào cảnh trước.
export function shotsFromCuts(cuts: number[], durationSec: number, minShotSec = 0.3): { start: number; end: number }[] {
  const points = [0, ...cuts.filter((t) => t > 0 && t < durationSec), durationSec];
  const shots: { start: number; end: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (shots.length && end - start < minShotSec) shots[shots.length - 1].end = end;
    else shots.push({ start, end });
  }
  return shots.map((s) => ({ start: Math.round(s.start * 100) / 100, end: Math.round(s.end * 100) / 100 }));
}

// Dò điểm chuyển cảnh bằng bộ lọc scene của ffmpeg. threshold 0.3 hợp với video TikTok cắt nhanh.
export async function detectSceneCuts(video: string, threshold = 0.3): Promise<number[]> {
  const { stderr } = await run(ffmpegBin(), [
    "-hide_banner", "-nostats",
    "-i", video,
    "-an", "-vf", `select='gt(scene,${threshold})',showinfo`,
    "-f", "null", "-",
  ]);
  return parseSceneTimes(stderr);
}

// Lấy 1 ảnh nhỏ ở giữa mỗi cảnh (tối đa maxFrames ảnh, chọn đều) để Claude xem
export async function extractKeyframes(video: string, shots: { start: number; end: number }[], dir: string, maxFrames = 12): Promise<{ at: number; file: string }[]> {
  const step = Math.max(1, shots.length / maxFrames);
  const picked: { start: number; end: number }[] = [];
  for (let i = 0; i < shots.length && picked.length < maxFrames; i += step) picked.push(shots[Math.floor(i)]);
  const frames: { at: number; file: string }[] = [];
  for (const [i, shot] of picked.entries()) {
    const at = Math.round(((shot.start + shot.end) / 2) * 100) / 100;
    const file = join(dir, `frame-${String(i + 1).padStart(2, "0")}.jpg`);
    await run(ffmpegBin(), ["-hide_banner", "-y", "-ss", String(at), "-i", video, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", file]);
    frames.push({ at, file });
  }
  return frames;
}
