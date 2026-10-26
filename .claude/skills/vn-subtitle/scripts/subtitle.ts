import { parseArgs } from "node:util";
import { loadConfig } from "../../../../core/config/index.ts";
import { createJobDir } from "../../../../core/jobs/workdir.ts";
import { subtitleVideo } from "../../../../core/pipeline/subtitles.ts";
import { getAsr } from "../../../../integrations/registry.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "out-dir": { type: "string" },
    asr: { type: "string" },
    lang: { type: "string" },
  },
});

const video = positionals[0];
if (!video) {
  console.error("Cách dùng: npm run subtitle -- <video> [--out-dir <thư mục>] [--asr elevenlabs] [--lang vi]");
  process.exit(1);
}

try {
  const cfg = loadConfig();
  const dir = await createJobDir(video, values["out-dir"]);
  const result = await subtitleVideo(video, dir, getAsr(values.asr), values.lang ?? cfg.language);
  console.log(JSON.stringify({ dir, srt: result.srt, captionsJson: result.captionsJson, lines: result.captions.length, wordCount: result.wordCount, text: result.text }, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
