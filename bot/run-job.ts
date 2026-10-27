import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, projectRoot } from "../core/config/index.ts";
import { createJob } from "../core/jobs/job.ts";
import { runJob, stepsFor } from "../core/jobs/runner.ts";
import { getAsr, getLlm, getStorage, getTts } from "../integrations/registry.ts";
import { hintForError } from "../core/knowledge/lessons.ts";
import { newJobId } from "./bot.ts";

// Chạy cả luồng không cần Telegram: npm run job -- <link Drive hoặc file> --workflow shop-ads --request "..." [--style <tên phong cách>]
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    workflow: { type: "string", short: "w", default: "shop-ads" },
    request: { type: "string", short: "r" },
    brief: { type: "string", short: "b" },
    script: { type: "string", short: "s" },
    style: { type: "string" },
    storage: { type: "string" },
    resume: { type: "string" },
  },
});

const deps = {
  llm: () => getLlm(),
  tts: () => getTts(),
  asr: () => getAsr(),
  storage: getStorage(values.storage),
  notify: (_job: unknown, e: any) => {
    if (e.type === "step") console.error(`▶ ${e.step}`);
    else if (e.type === "note") console.error(`  ${e.message}`);
    else if (e.type === "waiting_approval") console.error(`\nKịch bản chờ duyệt:\n${e.script}\n\nDuyệt: npm run script -- approve --dir <thư mục job>, rồi chạy lại với --resume <thư mục job>`);
    else if (e.type === "failed") {
      console.error(`✖ ${e.step}: ${e.error}`);
      const hint = hintForError(e.error);
      if (hint) console.error(`💡 ${hint}`);
    }
  },
};

try {
  let dir = values.resume ? resolve(values.resume) : "";
  if (!dir) {
    const id = newJobId();
    dir = resolve(projectRoot(), loadConfig().workspace_dir, "jobs", id);
    await mkdir(dir, { recursive: true });
    await createJob(dir, {
      id,
      workflow: values.workflow!,
      source: positionals[0] ?? "",
      ...(values.request ? { request: values.request } : {}),
      ...(values.brief ? { brief: values.brief } : {}),
      ...(values.script ? { script: values.script } : {}),
      ...(values.style ? { style: values.style } : {}),
    }, stepsFor(values.workflow!));
  }
  const job = await runJob(dir, deps);
  console.log(JSON.stringify({ dir, status: job.status, final: job.artifacts.final, url: job.artifacts.url, error: job.error }, null, 2));
  process.exit(job.status === "failed" ? 1 : 0);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
