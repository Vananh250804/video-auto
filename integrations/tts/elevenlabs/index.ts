import { writeFile } from "node:fs/promises";
import type { TtsOptions, TtsProvider, TtsResult } from "../../../core/contracts/providers.ts";
import { wordsFromCharAlignment } from "../../../core/subtitles/captions.ts";
import { requireEnv } from "../../../core/config/index.ts";
import { elevenlabsFetch } from "../../elevenlabs-client.ts";

export class ElevenLabsTts implements TtsProvider {
  readonly name = "elevenlabs";
  constructor(private defaults: { model: string; voiceId: string }) {}

  async synthesize(text: string, outFile: string, opts: TtsOptions): Promise<TtsResult> {
    const voiceId = opts.voiceId || this.defaults.voiceId || requireEnv("ELEVENLABS_VOICE_ID");
    const data = await elevenlabsFetch(
      `/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: opts.model || this.defaults.model,
          language_code: opts.language,
        }),
      },
    );
    await writeFile(outFile, Buffer.from(data.audio_base64, "base64"));
    const a = data.alignment;
    const words = a?.characters?.length
      ? wordsFromCharAlignment(a.characters, a.character_start_times_seconds, a.character_end_times_seconds)
      : undefined;
    return { audioFile: outFile, words };
  }
}
