import { openAsBlob } from "node:fs";
import { basename } from "node:path";
import type { AsrProvider, Transcript, Word } from "../../../core/contracts/providers.ts";
import { elevenlabsFetch } from "../../elevenlabs-client.ts";

// ElevenLabs Scribe dùng mã ngôn ngữ ISO 639-3
const LANG: Record<string, string> = { vi: "vie", en: "eng" };

export class ElevenLabsAsr implements AsrProvider {
  readonly name = "elevenlabs";
  constructor(private model: string) {}

  async transcribe(audioFile: string, opts: { language: string }): Promise<Transcript> {
    const form = new FormData();
    form.append("model_id", this.model);
    form.append("file", await openAsBlob(audioFile), basename(audioFile));
    form.append("language_code", LANG[opts.language] ?? opts.language);
    form.append("timestamps_granularity", "word");
    form.append("tag_audio_events", "false");
    const data = await elevenlabsFetch("/speech-to-text", { method: "POST", body: form });
    return toTranscript(data, opts.language);
  }
}

export function toTranscript(data: any, language: string): Transcript {
  const words: Word[] = (data.words ?? [])
    .filter((w: any) => w.type === "word" && w.text?.trim())
    .map((w: any) => ({ text: w.text.trim(), start: Number(w.start), end: Number(w.end) }));
  return { language: data.language_code ?? language, text: data.text ?? "", words };
}
