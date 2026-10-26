import { stat } from "node:fs/promises";
import { ffprobeBin, run } from "./ffmpeg.ts";

export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "3:4" | "4:3";
export type Orientation = "portrait" | "landscape" | "square";

export interface ProbeResult {
  file: string;
  sizeBytes: number;
  durationSec: number;
  width: number; // đã tính cả xoay (video quay dọc bằng điện thoại)
  height: number;
  rotation: number;
  fps: number;
  aspectRatio: AspectRatio;
  orientation: Orientation;
  videoCodec: string;
  hasAudio: boolean;
  audioCodec: string | null;
}

const RATIOS: Record<AspectRatio, number> = {
  "9:16": 9 / 16,
  "3:4": 3 / 4,
  "4:5": 4 / 5,
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
};

// Chọn tỉ lệ chuẩn gần nhất, so sánh theo log để 9:16 và 16:9 đối xứng.
export function classifyAspect(width: number, height: number): AspectRatio {
  const r = Math.log(width / height);
  let best: AspectRatio = "16:9";
  let bestDiff = Infinity;
  for (const [name, value] of Object.entries(RATIOS) as [AspectRatio, number][]) {
    const diff = Math.abs(r - Math.log(value));
    if (diff < bestDiff) {
      best = name;
      bestDiff = diff;
    }
  }
  return best;
}

export function orientationOf(width: number, height: number): Orientation {
  if (Math.abs(width - height) / Math.max(width, height) < 0.05) return "square";
  return height > width ? "portrait" : "landscape";
}

function parseFps(rate: string | undefined): number {
  if (!rate) return 0;
  const [n, d] = rate.split("/").map(Number);
  return d ? Math.round((n / d) * 100) / 100 : n || 0;
}

function rotationOf(stream: any): number {
  const fromSideData = stream.side_data_list?.find((s: any) => s.rotation !== undefined)?.rotation;
  const fromTags = stream.tags?.rotate;
  const raw = Number(fromSideData ?? fromTags ?? 0);
  return ((raw % 360) + 360) % 360;
}

export async function probe(file: string): Promise<ProbeResult> {
  const { stdout } = await run(ffprobeBin(), [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    file,
  ]);
  const info = JSON.parse(stdout);
  const video = info.streams?.find((s: any) => s.codec_type === "video");
  if (!video) throw new Error(`File không có luồng video: ${file}`);
  const audio = info.streams?.find((s: any) => s.codec_type === "audio");

  const rotation = rotationOf(video);
  const swap = rotation === 90 || rotation === 270;
  const width = swap ? video.height : video.width;
  const height = swap ? video.width : video.height;

  return {
    file,
    sizeBytes: (await stat(file)).size,
    durationSec: Number(info.format?.duration ?? video.duration ?? 0),
    width,
    height,
    rotation,
    fps: parseFps(video.avg_frame_rate || video.r_frame_rate),
    aspectRatio: classifyAspect(width, height),
    orientation: orientationOf(width, height),
    videoCodec: video.codec_name,
    hasAudio: Boolean(audio),
    audioCodec: audio?.codec_name ?? null,
  };
}
