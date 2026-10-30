import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig, projectRoot } from "../config/index.ts";
import type { LlmProvider } from "../contracts/providers.ts";
import { checkScript } from "../review/script-checks.ts";
import { readReview, saveReview, type HookSelfScore, type ReviewState } from "../review/review-state.ts";
import { extractJson, fillTemplate } from "./json.ts";

async function generate(llm: LlmProvider, values: Record<string, string>): Promise<{ script: string; notes: string; hook?: HookSelfScore }> {
  const template = await readFile(resolve(projectRoot(), "prompts/script-review/write.md"), "utf8");
  let last = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = await llm.complete(fillTemplate(template, values));
    try {
      const raw = extractJson(answer);
      const script = String(raw.script ?? "").trim();
      if (!script) throw new Error("thiếu trường script");
      return { script, notes: String(raw.notes ?? ""), hook: parseHook(raw.hook) };
    } catch (err) {
      last = (err as Error).message;
    }
  }
  throw new Error(`Claude không trả kịch bản hợp lệ: ${last}`);
}

function parseHook(h: any): HookSelfScore | undefined {
  const score = Number(h?.score);
  if (!h || !Number.isFinite(score)) return undefined;
  return { type: String(h.type ?? ""), score: Math.max(0, Math.min(10, Math.round(score))), question: String(h.question ?? ""), ...(h.answered_in ? { answered_in: String(h.answered_in) } : {}) };
}

function values(brief: string, workflow: string, targetSec: number | undefined, previous = "") {
  const wps = loadConfig().script.words_per_second;
  return {
    workflow,
    brief,
    target: targetSec ? `${targetSec} giây` : "tự chọn, 20 đến 45 giây",
    words: targetSec ? String(Math.round(targetSec * wps)) : "65 đến 145",
    previous,
  };
}

// Viết kịch bản mới, lưu review.json trạng thái "pending" chờ người dùng duyệt
export async function writeScript(opts: { dir: string; brief: string; workflow: string; targetSec?: number; llm: LlmProvider }) {
  const { script, notes, hook } = await generate(opts.llm, values(opts.brief, opts.workflow, opts.targetSec));
  const state: ReviewState = {
    status: "pending",
    brief: opts.brief,
    targetSec: opts.targetSec,
    script,
    check: checkScript(script, { targetSec: opts.targetSec, wordsPerSecond: loadConfig().script.words_per_second }),
    ...(hook ? { hook } : {}),
    history: [{ at: new Date().toISOString(), action: "written" }],
  };
  await saveReview(opts.dir, state);
  return { state, notes };
}

// Viết lại theo góp ý của người dùng, trạng thái quay về "pending"
export async function reviseScript(opts: { dir: string; feedback: string; workflow: string; llm: LlmProvider }) {
  const state = await readReview(opts.dir);
  const previous = `\n## Bản trước (người dùng chưa duyệt)\n${state.script}\n\n## Góp ý của người dùng, phải làm theo\n${opts.feedback}`;
  const { script, notes, hook } = await generate(opts.llm, values(state.brief, opts.workflow, state.targetSec, previous));
  state.script = script;
  state.hook = hook;
  state.status = "pending";
  state.check = checkScript(script, { targetSec: state.targetSec, wordsPerSecond: loadConfig().script.words_per_second });
  state.history.push({ at: new Date().toISOString(), action: "revised", feedback: opts.feedback });
  await saveReview(opts.dir, state);
  return { state, notes };
}
