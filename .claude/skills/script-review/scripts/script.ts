import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, projectRoot } from "../../../../core/config/index.ts";
import { reviseScript, writeScript } from "../../../../core/planner/script-writer.ts";
import { checkScript } from "../../../../core/review/script-checks.ts";
import { readReview, setStatus } from "../../../../core/review/review-state.ts";
import { getLlm } from "../../../../integrations/registry.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    brief: { type: "string", short: "b" },
    seconds: { type: "string", short: "s" },
    workflow: { type: "string", short: "w", default: "faceless" },
    dir: { type: "string", short: "d" },
    feedback: { type: "string", short: "f" },
  },
});

const USAGE = `Cách dùng:
  npm run script -- write --brief "nội dung" [--seconds 30] [--dir <thư mục job>]
  npm run script -- show --dir <thư mục job>
  npm run script -- revise --dir <thư mục job> --feedback "góp ý"
  npm run script -- approve --dir <thư mục job>
  npm run script -- check <kich-ban.txt> [--seconds 30]`;

const [cmd, file] = positionals;
const seconds = values.seconds ? Number(values.seconds) : undefined;
const print = (x: unknown) => console.log(JSON.stringify(x, null, 2));

try {
  switch (cmd) {
    case "write": {
      if (!values.brief) throw new Error(USAGE);
      const dir = resolve(values.dir ?? resolve(projectRoot(), loadConfig().workspace_dir, "jobs", `script-${Date.now()}`));
      await mkdir(dir, { recursive: true });
      const { state, notes } = await writeScript({ dir, brief: values.brief, workflow: values.workflow!, targetSec: seconds, llm: getLlm() });
      print({ dir, status: state.status, notes, script: state.script, check: state.check });
      break;
    }
    case "show":
      if (!values.dir) throw new Error(USAGE);
      print(await readReview(values.dir));
      break;
    case "revise": {
      if (!values.dir || !values.feedback) throw new Error(USAGE);
      const { state, notes } = await reviseScript({ dir: values.dir, feedback: values.feedback, workflow: values.workflow!, llm: getLlm() });
      print({ dir: values.dir, status: state.status, notes, script: state.script, check: state.check });
      break;
    }
    case "approve": {
      if (!values.dir) throw new Error(USAGE);
      const state = await setStatus(values.dir, "approved");
      print({ dir: values.dir, status: state.status, scriptFile: resolve(values.dir, "script.txt") });
      break;
    }
    case "check": {
      if (!file) throw new Error(USAGE);
      print(checkScript(await readFile(file, "utf8"), { targetSec: seconds, wordsPerSecond: loadConfig().script.words_per_second }));
      break;
    }
    default:
      throw new Error(USAGE);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
