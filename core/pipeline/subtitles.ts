import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config/index.ts";
import type { AsrProvider, Word } from "../contracts/providers.ts";
import { extractAudio } from "../media/audio.ts";
import { probe } from "../media/probe.ts";
import { buildCaptions, toSrt, type Caption } from "../subtitles/captions.ts";

export interface SubtitleFiles {
  srt: string;
  captionsJson: string;
  captions: Caption[];
}

export function captionOptions() {
  const s = loadConfig().subtitles;
  return { maxCharsPerLine: s.max_chars_per_line, maxDurationSec: s.max_duration_sec, pauseBreakSec: s.pause_break_sec };
}

export async function writeSubtitles(words: Word[], dir: string): Promise<SubtitleFiles> {
  const captions = buildCaptions(words, captionOptions());
  const srt = join(dir, "subtitles.srt");
  const captionsJson = join(dir, "captions.json");
  await writeFile(srt, toSrt(captions), "utf8");
  await writeFile(captionsJson, JSON.stringify(captions, null, 2), "utf8");
  return { srt, captionsJson, captions };
}

// Video có người nói → phụ đề theo lời nói.
export async function subtitleVideo(video: string, dir: string, asr: AsrProvider, language: string) {
  const info = await probe(video);
  if (!info.hasAudio) throw new Error("Video không có âm thanh, không làm phụ đề được. Dùng voiceover để thêm giọng đọc.");
  const audio = join(dir, "audio.mp3");
  await extractAudio(video, audio);
  const transcript = await asr.transcribe(audio, { language });
  await writeFile(join(dir, "transcript.json"), JSON.stringify(transcript, null, 2), "utf8");
  const files = await writeSubtitles(transcript.words, dir);
  return { ...files, text: transcript.text, wordCount: transcript.words.length };
}
