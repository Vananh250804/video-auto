import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "../../../../core/config/index.ts";
import { createJobDir } from "../../../../core/jobs/workdir.ts";
import { subtitleVideo } from "../../../../core/pipeline/subtitles.ts";
import { buildReviewPack, readCaptions } from "../../../../core/review/video-pack.ts";
import { getAsr } from "../../../../integrations/registry.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    captions: { type: "string", short: "c" },
    "out-dir": { type: "string", short: "o" },
    brief: { type: "string", short: "b" },
  },
});

if (!positionals[0]) {
  console.error('Cách dùng: npm run review -- <video> [--captions captions.json] [--out-dir <thư mục>] [--brief "sản phẩm, giá thật, ưu đãi"]');
  process.exit(1);
}

try {
  const video = resolve(positionals[0]);
  const outDir = values["out-dir"] ? resolve(values["out-dir"]) : join(await createJobDir(video), "review");
  let captionsFile = values.captions;
  if (!captionsFile) {
    // Chưa có phụ đề thì nhận giọng nói (tốn credit ASR)
    console.error("Chưa có --captions, đang nhận giọng nói...");
    captionsFile = (await subtitleVideo(video, outDir, getAsr(), loadConfig().language)).captionsJson;
  }
  const pack = await buildReviewPack({ video, captions: await readCaptions(captionsFile), outDir, brief: values.brief });
  console.log(JSON.stringify(pack, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
