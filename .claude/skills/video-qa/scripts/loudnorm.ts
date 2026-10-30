import { parseArgs } from "node:util";
import { normalizeLoudness } from "../../../../core/media/loudnorm.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string", short: "o" }, lufs: { type: "string", default: "-14" } },
});

if (!positionals[0] || !values.out) {
  console.error("Cách dùng: npm run loudnorm -- <video> --out <video-moi.mp4> [--lufs -14]");
  process.exit(1);
}

try {
  console.log(JSON.stringify(await normalizeLoudness(positionals[0], values.out, Number(values.lufs)), null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
