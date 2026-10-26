import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { loadConfig } from "../../../../core/config/index.ts";
import { createJobDir } from "../../../../core/jobs/workdir.ts";
import { voiceoverVideo } from "../../../../core/pipeline/voiceover.ts";
import { getAsr, getTts } from "../../../../integrations/registry.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    script: { type: "string", short: "s" },
    text: { type: "string", short: "t" },
    "out-dir": { type: "string" },
    tts: { type: "string" },
    voice: { type: "string" },
    lang: { type: "string" },
    "original-volume": { type: "string" },
  },
});

const video = positionals[0];
if (!video || (!values.script && !values.text)) {
  console.error('Cách dùng: npm run voiceover -- <video> --script <kich-ban.txt> | --text "..." [--out-dir <thư mục>] [--tts elevenlabs] [--voice <id>] [--original-volume 0.15]');
  process.exit(1);
}

try {
  const cfg = loadConfig();
  const script = values.text ?? (await readFile(values.script!, "utf8"));
  const dir = await createJobDir(video, values["out-dir"]);
  const result = await voiceoverVideo({
    video,
    script,
    dir,
    tts: getTts(values.tts),
    asr: () => getAsr(),
    language: values.lang ?? cfg.language,
    voiceId: values.voice,
    originalVolume: values["original-volume"] !== undefined ? Number(values["original-volume"]) : cfg.voiceover.original_volume,
  });
  console.log(JSON.stringify({ dir, output: result.output, voice: result.voice, srt: result.srt, lines: result.captions.length, durationSec: result.durationSec, extendedSec: result.extendedSec }, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
