import { ffmpegBin, run } from "./ffmpeg.ts";

// Chuẩn hóa âm lượng về mức TikTok (-14 LUFS), giữ nguyên hình (không render lại video). Chạy 2 lượt: đo rồi chỉnh tuyến tính.
export async function normalizeLoudness(input: string, output: string, targetLufs = -14): Promise<{ before: number; target: number }> {
  const measure = await run(ffmpegBin(), [
    "-hide_banner", "-i", input,
    "-af", `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:print_format=json`,
    "-f", "null", "-",
  ]);
  const json = /\{[\s\S]*?"target_offset"[\s\S]*?\}/.exec(measure.stderr)?.[0];
  if (!json) throw new Error("Không đo được âm lượng. Video có tiếng không?");
  const m = JSON.parse(json);
  const filter = `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await run(ffmpegBin(), [
    "-hide_banner", "-y", "-i", input,
    "-c:v", "copy", "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
    output,
  ]);
  return { before: Number(m.input_i), target: targetLufs };
}
