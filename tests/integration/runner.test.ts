import { test, before } from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AsrProvider, LlmProvider, TtsProvider } from "../../core/contracts/providers.ts";
import { createJob, loadJob } from "../../core/jobs/job.ts";
import { runJob, stepsFor, type JobEvent, type RunnerDeps } from "../../core/jobs/runner.ts";
import { ffmpegBin, run } from "../../core/media/ffmpeg.ts";
import { setStatus } from "../../core/review/review-state.ts";
import { LocalStorage } from "../../integrations/storage/local/index.ts";

let root = "";
let talking = "";
let silentClip = "";

const asr: AsrProvider = { name: "fake", async transcribe() {
  return { language: "vi", text: "giảm giá", words: [{ text: "Giảm", start: 0.2, end: 0.6 }, { text: "giá!", start: 0.6, end: 1 }] };
} };
const tts: TtsProvider = { name: "fake", async synthesize(text, out) {
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "sine=frequency=500:duration=2", out]);
  return { audioFile: out, words: text.split(/\s+/).map((t, i) => ({ text: t, start: i * 0.3, end: i * 0.3 + 0.25 })) };
} };
function llm(answers: string[]): LlmProvider {
  return { name: "fake", async complete() { return answers.shift() ?? "{}"; } };
}
// Render giả: chép video nền làm thành phẩm (render thật đã có test riêng)
const fakeRender = (async (spec: any, out: string) => {
  await copyFile(spec.video, out);
  return {} as any;
}) as RunnerDeps["render"];

function deps(over: Partial<RunnerDeps> = {}) {
  const events: JobEvent[] = [];
  return {
    events,
    deps: {
      llm: () => llm([JSON.stringify({ overlays: [{ text: "SALE", start: 0.2, end: 1 }], sfx: [], notes: "ok" })]),
      tts: () => tts,
      asr: () => asr,
      storage: new LocalStorage({ inputDir: join(root, "inbox"), outputDir: join(root, "outbox") }),
      render: fakeRender,
      notify: (_: unknown, e: JobEvent) => { events.push(e); },
      ...over,
    } as RunnerDeps,
  };
}

async function newJob(name: string, init: Record<string, unknown>) {
  const dir = join(root, "jobs", name);
  await mkdir(dir, { recursive: true });
  await createJob(dir, { id: name, source: "", ...init } as any, stepsFor(init.workflow as string));
  return dir;
}

before(async () => {
  root = await mkdtemp(join(tmpdir(), "video-auto-runner-"));
  await mkdir(join(root, "inbox"), { recursive: true });
  talking = join(root, "inbox", "noi.mp4");
  // Tiếng 0-1.5s, lặng 1.5-3.5s, tiếng 3.5-5s
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "testsrc2=size=360x640:rate=25:duration=5", "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
    "-af", "volume=enable='between(t,1.5,3.5)':volume=0", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", talking]);
  silentClip = join(root, "canh.mp4");
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "testsrc2=size=360x640:rate=25:duration=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", silentClip]);
});

test("shop-ads chạy đủ bước: tải, cắt, phụ đề, lên hiệu ứng, render, kiểm tra, upload", async () => {
  const dir = await newJob("ads1", { workflow: "shop-ads", request: "làm nổi chữ sale" });
  const { deps: d, events } = deps();
  const job = await runJob(dir, d);
  assert.equal(job.status, "done", job.error);
  assert.deepEqual(job.steps.map((s) => `${s.name}:${s.status}`), ["download:done", "probe:done", "cut:done", "subtitle:done", "plan:done", "render:done", "qa:done", "upload:done"]);
  assert.match(job.steps.find((s) => s.name === "cut")!.note!, /đã cắt/);
  assert.ok(job.artifacts.expectedDurationSec! < 4);
  assert.match(job.artifacts.url!, /outbox.*noi-edited\.mp4$/);
  assert.equal(events.at(-1)?.type, "done");
});

test("lỗi giữa chừng thì dừng, chạy lại tiếp từ bước lỗi", async () => {
  const dir = await newJob("ads2", { workflow: "shop-ads" });
  let calls = 0;
  const flaky: AsrProvider = { name: "flaky", async transcribe(f, o) {
    calls++;
    if (calls === 1) throw new Error("mất mạng");
    return asr.transcribe(f, o);
  } };
  const { deps: d, events } = deps({ asr: () => flaky });
  const first = await runJob(dir, d);
  assert.equal(first.status, "failed");
  assert.equal(first.error, "subtitle: mất mạng");
  assert.deepEqual(events.at(-1), { type: "failed", step: "subtitle", error: "mất mạng" });

  const before = first.steps.filter((s) => s.status === "done").map((s) => s.name);
  const stepsRun: string[] = [];
  const second = await runJob(dir, { ...d, notify: (_, e) => { if (e.type === "step") stepsRun.push(e.step); } });
  assert.equal(second.status, "done");
  assert.deepEqual(before, ["download", "probe", "cut"]);
  assert.equal(stepsRun[0], "subtitle");
});

test("faceless: viết kịch bản → chờ duyệt → duyệt → đọc giọng → xong", async () => {
  const dir = await newJob("face1", { workflow: "faceless", source: silentClip, brief: "giới thiệu túi" });
  const { deps: d, events } = deps({
    llm: () => llm([JSON.stringify({ script: "Chào các bạn. Túi đẹp lắm." }), JSON.stringify({ overlays: [], sfx: [] })]),
  });
  const first = await runJob(dir, d);
  assert.equal(first.status, "waiting_approval");
  const wait = events.find((e) => e.type === "waiting_approval");
  assert.ok(wait && wait.type === "waiting_approval" && wait.script.includes("Túi đẹp"));

  // Chạy lại khi chưa duyệt thì vẫn chờ, không viết kịch bản mới
  assert.equal((await runJob(dir, d)).status, "waiting_approval");

  await setStatus(dir, "approved");
  const done = await runJob(dir, d);
  assert.equal(done.status, "done", done.error);
  assert.equal(done.steps.find((s) => s.name === "voiceover")?.status, "done");
  assert.equal(done.artifacts.hasAudio, true);
  assert.equal((await loadJob(dir)).status, "done");
});

test("dubbing thiếu kịch bản thì báo lỗi rõ", async () => {
  const dir = await newJob("dub1", { workflow: "dubbing", source: silentClip });
  const job = await runJob(dir, deps().deps);
  assert.equal(job.status, "failed");
  assert.match(job.error!, /Thiếu kịch bản/);
});
