import { ffmpegBin, run } from "./ffmpeg.ts";

// Tách tiếng ra file mp3 mono nhỏ gọn để gửi đi nhận giọng nói.
export async function extractAudio(input: string, output: string): Promise<void> {
  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    "-i", input,
    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k",
    output,
  ]);
}
