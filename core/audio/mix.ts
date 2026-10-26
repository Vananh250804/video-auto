import { ffmpegBin, ffprobeBin, run } from "../media/ffmpeg.ts";
import { probe } from "../media/probe.ts";

export interface MixOptions {
  video: string;
  voice: string;
  output: string;
  originalVolume: number; // 0 = bỏ tiếng gốc
}

// Ghép giọng đọc vào video. Giọng dài hơn video thì giữ khung hình cuối cho tới hết giọng.
export async function mixVoiceover(opts: MixOptions): Promise<{ durationSec: number; extendedSec: number }> {
  const [video, voiceSec] = await Promise.all([probe(opts.video), audioDuration(opts.voice)]);
  const extendedSec = Math.max(0, Math.round((voiceSec - video.durationSec) * 1000) / 1000);
  const keepOriginal = opts.originalVolume > 0 && video.hasAudio;

  const filters: string[] = [];
  filters.push(extendedSec > 0 ? `[0:v]tpad=stop_mode=clone:stop_duration=${extendedSec}[v]` : `[0:v]null[v]`);
  if (keepOriginal) {
    filters.push(`[0:a]volume=${opts.originalVolume}[orig]`);
    filters.push(`[orig][1:a]amix=inputs=2:duration=longest:normalize=0[a]`);
  } else {
    filters.push(`[1:a]anull[a]`);
  }

  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    "-i", opts.video,
    "-i", opts.voice,
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    opts.output,
  ]);
  return { durationSec: Math.max(video.durationSec, voiceSec), extendedSec };
}

export async function audioDuration(file: string): Promise<number> {
  const { stdout } = await run(ffprobeBin(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim());
}
