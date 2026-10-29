import { probe } from "../media/probe.ts";
import { ffmpegBin, run } from "../media/ffmpeg.ts";

// Mốc chụp: câu mở đầu (0.3s, 1.5s), giữa video (25%, 50%, 75%) và khung cuối.
export function sheetTimes(durationSec: number): number[] {
  const d = Math.max(0.1, durationSec);
  const times = [0.3, 1.5, d * 0.25, d * 0.5, d * 0.75, d - 0.2].map((t) => Math.round(Math.min(d - 0.05, Math.max(0, t)) * 100) / 100);
  return [...new Set(times)].sort((a, b) => a - b);
}

// Ghép các khung hình thành một ảnh ngang để nhìn nhanh: chữ có bị che, mở đầu có chữ chưa, khung cuối ổn không.
export async function contactSheet(video: string, output: string, frameWidth = 360): Promise<{ sheet: string; times: number[] }> {
  const info = await probe(video);
  const times = sheetTimes(info.durationSec);
  const inputs = times.flatMap((t) => ["-ss", String(t), "-i", video]);
  const scaled = times.map((_, i) => `[${i}:v]scale=${frameWidth}:-2,setsar=1[v${i}]`).join(";");
  const stack = times.length > 1 ? `${times.map((_, i) => `[v${i}]`).join("")}hstack=inputs=${times.length}[out]` : "[v0]null[out]";
  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    ...inputs,
    "-filter_complex", `${scaled};${stack}`,
    "-map", "[out]", "-frames:v", "1",
    output,
  ]);
  return { sheet: output, times };
}
