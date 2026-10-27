import { parseArgs } from "node:util";
import { loadConfig } from "../../../../core/config/index.ts";
import { createJobDir } from "../../../../core/jobs/workdir.ts";
import { listStyles, loadStyle } from "../../../../core/knowledge/lessons.ts";
import { learnStyle, styleSummary } from "../../../../core/knowledge/style-learn.ts";
import { getAsr, getLlm } from "../../../../integrations/registry.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string", short: "n" },
    note: { type: "string" },
    "no-asr": { type: "boolean" },
  },
});

const [cmd, arg] = positionals;
const USAGE = `Cách dùng:
  npm run learn-style -- learn <video> --name <tên> [--note "ghi chú"] [--no-asr]
  npm run learn-style -- list
  npm run learn-style -- show <tên>`;

try {
  if (cmd === "learn" && arg && values.name) {
    const dir = await createJobDir(arg);
    const { profile, file } = await learnStyle({
      video: arg,
      name: values.name,
      workDir: dir,
      llm: getLlm(),
      asr: values["no-asr"] ? undefined : getAsr(),
      language: loadConfig().language,
      source: arg,
      note: values.note,
    });
    console.error(styleSummary(profile));
    console.log(JSON.stringify({ file, workDir: dir }, null, 2));
  } else if (cmd === "list") {
    console.log(listStyles().join("\n") || "(chưa có phong cách nào)");
  } else if (cmd === "show" && arg) {
    const p = loadStyle(arg);
    if (!p) throw new Error(`Chưa có phong cách "${arg}".`);
    console.log(JSON.stringify(p, null, 2));
  } else {
    console.error(USAGE);
    process.exit(1);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
