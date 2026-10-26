import { existsSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { loadConfig } from "../config/index.ts";
import type { AsrProvider, LlmProvider, StorageProvider, TtsProvider } from "../contracts/providers.ts";
import { cutSilences } from "../media/cut.ts";
import { probe } from "../media/probe.ts";
import { planEdit } from "../planner/edit-planner.ts";
import { writeScript } from "../planner/script-writer.ts";
import { loadWorkflow } from "../planner/workflows.ts";
import { subtitleVideo } from "../pipeline/subtitles.ts";
import { voiceoverVideo } from "../pipeline/voiceover.ts";
import { DEFAULT_QA, checkVideo, type QaReport } from "../qa/video-qa.ts";
import { validateEdit, type EditSpec } from "../render/edit-spec.ts";
import { renderEdit } from "../render/render.ts";
import { readReview } from "../review/review-state.ts";
import type { ScriptCheck } from "../review/script-checks.ts";
import { loadJob, saveJob, type JobState } from "./job.ts";

export type JobEvent =
  | { type: "step"; step: string }
  | { type: "note"; message: string }
  | { type: "waiting_approval"; script: string; check: ScriptCheck }
  | { type: "done"; url?: string; final: string; qa?: QaReport }
  | { type: "failed"; step: string; error: string };

export interface RunnerDeps {
  llm: () => LlmProvider;
  tts: () => TtsProvider;
  asr: () => AsrProvider;
  storage?: StorageProvider; // không có thì lấy file local, không upload
  render?: typeof renderEdit; // cho test thay bằng bản giả
  notify: (job: JobState, event: JobEvent) => Promise<void> | void;
}

// Bước tải về và upload luôn bao quanh các bước của workflow
export function stepsFor(workflow: string): string[] {
  return ["download", ...loadWorkflow(workflow).steps, "upload"];
}

class WaitForApproval extends Error {}

type Ctx = { dir: string; work: string; job: JobState; deps: RunnerDeps };
type Step = (ctx: Ctx) => Promise<string | void>; // trả về ghi chú nếu có

const STEPS: Record<string, Step> = {
  async download({ dir, job, deps }) {
    const file = deps.storage
      ? await deps.storage.download(job.source, join(dir, "input"))
      : await copyLocal(job.source, join(dir, "input"));
    job.artifacts.input = file.path;
    job.artifacts.inputName = file.name;
    job.artifacts.video = file.path;
  },

  async probe({ job }) {
    const info = await probe(job.artifacts.video!);
    job.artifacts.hasAudio = info.hasAudio;
    job.artifacts.aspectRatio = info.aspectRatio;
    job.artifacts.expectedDurationSec = info.durationSec;
    return `${info.aspectRatio}, ${info.durationSec.toFixed(1)}s${info.hasAudio ? "" : ", không có tiếng"}`;
  },

  async cut({ work, job }) {
    if (!job.artifacts.hasAudio) return "bỏ qua: video không có tiếng";
    const cfg = loadConfig().cut;
    const out = join(work, "cut.mp4");
    const opts = { silenceThresholdDb: cfg.silence_threshold_db, minSilenceSec: cfg.min_silence_sec, paddingSec: cfg.padding_sec, minSegmentSec: cfg.min_segment_sec };
    const preview = await cutSilences(job.artifacts.video!, out, opts, true);
    if (preview.removedSec < 0.3) return "không có khoảng lặng cần cắt";
    if (preview.removedSec > preview.originalSec * 0.5) return `bỏ qua: sẽ cắt mất ${preview.removedSec}s (hơn nửa video), có thể là nhạc nền`;
    const result = await cutSilences(job.artifacts.video!, out, opts);
    job.artifacts.video = out;
    job.artifacts.expectedDurationSec = result.keptSec;
    return `đã cắt ${result.removedSec}s khoảng lặng`;
  },

  async subtitle({ work, job, deps }) {
    if (!job.artifacts.hasAudio) return "bỏ qua: video không có tiếng";
    const r = await subtitleVideo(job.artifacts.video!, work, deps.asr(), loadConfig().language);
    job.artifacts.captions = r.captionsJson;
    return `${r.captions.length} dòng phụ đề`;
  },

  async script({ dir, job, deps }) {
    if (existsSync(join(dir, "review.json"))) {
      const review = await readReview(dir);
      if (review.status === "approved") return "kịch bản đã duyệt";
      if (review.status === "pending") throw new WaitForApproval();
    }
    // Chưa có kịch bản, hoặc người dùng yêu cầu sửa (bot đã viết lại rồi chạy tiếp)
    if (!job.brief) throw new Error("Thiếu nội dung để viết kịch bản (brief).");
    const { state } = await writeScript({ dir, brief: job.brief, workflow: job.workflow, llm: deps.llm() });
    await deps.notify(job, { type: "waiting_approval", script: state.script, check: state.check });
    throw new WaitForApproval();
  },

  async voiceover({ dir, work, job, deps }) {
    const script = job.workflow === "faceless" ? (await readReview(dir)).script : job.script;
    if (!script?.trim()) throw new Error("Thiếu kịch bản để đọc giọng.");
    const r = await voiceoverVideo({
      video: job.artifacts.video!,
      script,
      dir: work,
      tts: deps.tts(),
      asr: deps.asr,
      language: loadConfig().language,
      originalVolume: loadWorkflow(job.workflow).defaults.originalVolume,
    });
    job.artifacts.video = r.output;
    job.artifacts.captions = r.captionsJson;
    job.artifacts.hasAudio = true;
    job.artifacts.expectedDurationSec = r.durationSec;
    return r.extendedSec > 2 ? `giọng dài hơn video ${r.extendedSec}s, đã giữ khung cuối` : undefined;
  },

  async plan({ work, job, deps }) {
    const defaults = loadWorkflow(job.workflow).defaults;
    let edit: EditSpec;
    let note: string | undefined;
    if (job.request?.trim() || loadConfig().plan.auto_highlight) {
      const r = await planEdit({ video: job.artifacts.video!, captions: job.artifacts.captions, workflow: job.workflow, request: job.request, llm: deps.llm() });
      edit = r.edit;
      note = [r.notes, ...r.dropped.map((d) => `bỏ: ${d}`)].filter(Boolean).join("; ");
    } else {
      edit = validateEdit({ video: job.artifacts.video, captions: job.artifacts.captions, captionStyle: defaults.captionStyle, originalVolume: 1 });
    }
    // Tiếng đã được trộn ở bước voiceover, nên khi render giữ nguyên âm lượng video nền
    if (job.steps.some((s) => s.name === "voiceover")) edit.originalVolume = 1;
    const file = join(work, "edit.json");
    await writeFile(file, JSON.stringify(edit, null, 2), "utf8");
    job.artifacts.edit = file;
    return note;
  },

  async render({ dir, job, deps }) {
    const edit = JSON.parse(await readFile(job.artifacts.edit!, "utf8"));
    const name = `${basename(job.artifacts.inputName ?? "video", extname(job.artifacts.inputName ?? ".mp4"))}-edited.mp4`;
    const out = join(dir, "output", name);
    await (deps.render ?? renderEdit)(edit, out);
    job.artifacts.final = out;
  },

  async qa({ job }) {
    const report = await checkVideo(job.artifacts.final!, { ...DEFAULT_QA, expectAudio: Boolean(job.artifacts.hasAudio), expectedDurationSec: job.artifacts.expectedDurationSec });
    job.artifacts.qa = report;
    if (!report.ok) throw new Error(`Video lỗi: ${report.issues.filter((i) => i.level === "error").map((i) => i.message).join(" ")}`);
    return report.issues.map((i) => i.message).join(" ") || undefined;
  },

  async upload({ job, deps }) {
    if (!deps.storage) return "không upload (chạy local)";
    const { url } = await deps.storage.upload(job.artifacts.final!, basename(job.artifacts.final!));
    job.artifacts.url = url;
  },
};

async function copyLocal(source: string, destDir: string) {
  if (!existsSync(source)) throw new Error(`Không tìm thấy file: ${source}`);
  const dest = join(destDir, basename(source));
  await copyFile(source, dest);
  return { path: dest, name: basename(source) };
}

// Chạy job từ bước chưa xong. Gọi lại sau khi lỗi hoặc sau khi duyệt kịch bản để chạy tiếp.
export async function runJob(dir: string, deps: RunnerDeps): Promise<JobState> {
  const job = await loadJob(dir);
  if (job.status === "done") return job;
  job.status = "running";
  job.error = undefined;
  await saveJob(dir, job);
  const ctx: Ctx = { dir, work: join(dir, "work"), job, deps };

  for (const step of job.steps) {
    if (step.status === "done" || step.status === "skipped") continue;
    const fn = STEPS[step.name];
    if (!fn) {
      step.status = "skipped";
      step.note = "chưa hỗ trợ bước này";
      continue;
    }
    step.status = "running";
    step.error = undefined;
    await saveJob(dir, job);
    await deps.notify(job, { type: "step", step: step.name });
    try {
      const note = await fn(ctx);
      step.status = note?.startsWith("bỏ qua") ? "skipped" : "done";
      if (note) {
        step.note = note;
        await deps.notify(job, { type: "note", message: `${step.name}: ${note}` });
      }
      await saveJob(dir, job);
    } catch (err) {
      if (err instanceof WaitForApproval) {
        step.status = "pending";
        job.status = "waiting_approval";
        await saveJob(dir, job);
        return job;
      }
      step.status = "failed";
      step.error = (err as Error).message;
      job.status = "failed";
      job.error = `${step.name}: ${step.error}`;
      await saveJob(dir, job);
      await deps.notify(job, { type: "failed", step: step.name, error: step.error });
      return job;
    }
  }

  job.status = "done";
  await saveJob(dir, job);
  await deps.notify(job, { type: "done", url: job.artifacts.url, final: job.artifacts.final!, qa: job.artifacts.qa });
  return job;
}
