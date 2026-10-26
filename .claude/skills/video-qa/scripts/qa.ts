import { parseArgs } from "node:util";
import { DEFAULT_QA, checkVideo } from "../../../../core/qa/video-qa.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "expect-duration": { type: "string" },
    "no-audio": { type: "boolean", default: false },
  },
});

if (!positionals[0]) {
  console.error("Cách dùng: npm run qa -- <video> [--expect-duration 30] [--no-audio]");
  process.exit(1);
}

try {
  const report = await checkVideo(positionals[0], {
    ...DEFAULT_QA,
    expectAudio: !values["no-audio"],
    expectedDurationSec: values["expect-duration"] ? Number(values["expect-duration"]) : undefined,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 2);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
