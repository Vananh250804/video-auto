import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AsrProvider, TtsProvider } from "../contracts/providers.ts";
import { mixVoiceover } from "../audio/mix.ts";
import { writeSubtitles } from "./subtitles.ts";

export interface VoiceoverInput {
  video: string;
  script: string;
  dir: string;
  tts: TtsProvider;
  asr: () => AsrProvider; // chỉ dùng khi TTS không trả thời điểm từng từ
  language: string;
  voiceId?: string;
  originalVolume: number;
}

// Kịch bản → giọng đọc AI → ghép vào video, kèm phụ đề khớp giọng đọc.
export async function voiceoverVideo(input: VoiceoverInput) {
  const script = input.script.trim();
  if (!script) throw new Error("Kịch bản trống.");
  await writeFile(join(input.dir, "script.txt"), script, "utf8");

  const voice = join(input.dir, "voice.mp3");
  const tts = await input.tts.synthesize(script, voice, { language: input.language, voiceId: input.voiceId });
  const words = tts.words ?? (await input.asr().transcribe(voice, { language: input.language })).words;
  const subs = await writeSubtitles(words, input.dir);

  const output = join(input.dir, "voiceover.mp4");
  const mix = await mixVoiceover({ video: input.video, voice, output, originalVolume: input.originalVolume });
  return { output, voice, ...subs, ...mix };
}
