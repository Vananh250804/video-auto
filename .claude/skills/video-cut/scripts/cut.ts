import { parseArgs } from "node:util";
import { DEFAULT_CUT_OPTIONS, cutSilences } from "../../../../core/media/cut.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", short: "o" },
    threshold: { type: "string" },
    "min-silence": { type: "string" },
    padding: { type: "string" },
    "min-segment": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const input = positionals[0];
if (!input || (!values.out && !values["dry-run"])) {
  console.error("Cách dùng: npm run cut -- <video> --out <file.mp4> [--threshold -35] [--min-silence 0.6] [--padding 0.12] [--min-segment 0.3] [--dry-run]");
  process.exit(1);
}

const num = (v: string | undefined, d: number) => (v === undefined ? d : Number(v));
const opts = {
  silenceThresholdDb: num(values.threshold, DEFAULT_CUT_OPTIONS.silenceThresholdDb),
  minSilenceSec: num(values["min-silence"], DEFAULT_CUT_OPTIONS.minSilenceSec),
  paddingSec: num(values.padding, DEFAULT_CUT_OPTIONS.paddingSec),
  minSegmentSec: num(values["min-segment"], DEFAULT_CUT_OPTIONS.minSegmentSec),
};

try {
  const result = await cutSilences(input, values.out ?? "", opts, values["dry-run"]);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
