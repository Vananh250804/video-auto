import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VideoBot } from "../../bot/bot.ts";
import { createJob, loadJob, saveJob } from "../../core/jobs/job.ts";
import { stepsFor, type RunnerDeps } from "../../core/jobs/runner.ts";
import { readReview, saveReview } from "../../core/review/review-state.ts";
import { loadLessons } from "../../core/knowledge/lessons.ts";
import type { TelegramApi, TgButton, TgUpdate } from "../../integrations/delivery/telegram/index.ts";

const CHAT = 111;
let sent: { chat: number; text: string; buttons?: TgButton[][] }[] = [];
let ran: string[] = [];
let jobsDir = "";
let downloads: { fileId: string; dest: string }[] = [];
let videosSent: { chat: number; file: string }[] = [];
let knowledge = "";

const tg: TelegramApi = {
  async getUpdates() { return []; },
  async sendMessage(chat, text, buttons) { sent.push({ chat, text, buttons }); },
  async answerCallback() {},
  async clearButtons() {},
  async downloadFile(fileId, dest) { downloads.push({ fileId, dest }); },
  async sendVideo(chat, file) { videosSent.push({ chat, file }); },
};

function makeBot(llmAnswer = "{}", runner?: (dir: string, deps: RunnerDeps) => ReturnType<typeof loadJob>, extra: Partial<ConstructorParameters<typeof VideoBot>[0]> = {}) {
  return new VideoBot({
    tg,
    allowedChats: new Set([CHAT]),
    jobsDir,
    knowledgeDir: knowledge,
    runnerDeps: { llm: () => ({ name: "fake", complete: async () => llmAnswer }), tts: () => ({}) as any, asr: () => ({}) as any },
    runner: async (dir, deps) => { ran.push(dir); return runner ? runner(dir, deps) : loadJob(dir); },
    ...extra,
  });
}
const msg = (text: string, chat = CHAT) => ({ update_id: 1, message: { message_id: 1, chat: { id: chat }, text } });
const videoMsg = (caption: string | undefined, extra: Partial<NonNullable<TgUpdate["message"]>> = {}): TgUpdate => ({
  update_id: 1,
  message: { message_id: 1, chat: { id: CHAT }, caption, video: { file_id: "VID123", file_size: 5_000_000, file_name: "túi: mới.mp4" }, ...extra },
});

beforeEach(async () => {
  sent = [];
  ran = [];
  downloads = [];
  videosSent = [];
  jobsDir = await mkdtemp(join(tmpdir(), "bot-"));
  knowledge = await mkdtemp(join(tmpdir(), "bot-knowledge-"));
});

test("chat lạ bị từ chối, được báo chat id", async () => {
  await makeBot().handleUpdate(msg("/ads", 999));
  assert.match(sent[0].text, /Chat id của bạn là 999/);
  assert.equal(ran.length, 0);
});

test("/ads tạo job với yêu cầu, đưa vào hàng đợi", async () => {
  await makeBot().handleUpdate(msg("/ads https://drive.google.com/file/d/abcdefghij12/view làm nổi giá 199k"));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(ran.length, 1);
  const job = await loadJob(ran[0]);
  assert.equal(job.workflow, "shop-ads");
  assert.equal(job.request, "làm nổi giá 199k");
  assert.equal(job.source, "https://drive.google.com/file/d/abcdefghij12/view");
  assert.equal(job.chatId, CHAT);
  assert.match(sent[0].text, /Đã nhận job/);
});

test("/faceless thiếu nội dung thì hướng dẫn", async () => {
  await makeBot().handleUpdate(msg("/faceless"));
  assert.match(sent[0].text, /Thiếu nội dung/);
});

async function waitingJob(id: string) {
  const dir = join(jobsDir, id);
  await mkdir(dir, { recursive: true });
  const job = await createJob(dir, { id, workflow: "faceless", source: "", brief: "túi", chatId: CHAT }, stepsFor("faceless"));
  job.status = "waiting_approval";
  await saveJob(dir, job);
  await saveReview(dir, { status: "pending", brief: "túi", script: "Bản cũ.", check: { words: 2, estimatedSec: 1, issues: [] }, history: [] });
  return dir;
}

test("bấm Duyệt: kịch bản approved, job chạy tiếp", async () => {
  const dir = await waitingJob("j1");
  await makeBot().handleUpdate({ update_id: 2, callback_query: { id: "q", from: { id: CHAT }, data: "ok:j1", message: { message_id: 5, chat: { id: CHAT } } } });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await readReview(dir)).status, "approved");
  assert.deepEqual(ran, [dir]);
});

test("bấm Sửa, gửi góp ý: Claude viết lại, gửi kèm nút duyệt", async () => {
  const dir = await waitingJob("j2");
  const bot = makeBot(JSON.stringify({ script: "Bản mới ngắn gọn." }));
  await bot.handleUpdate({ update_id: 3, callback_query: { id: "q", from: { id: CHAT }, data: "edit:j2", message: { message_id: 6, chat: { id: CHAT } } } });
  assert.match(sent.at(-1)!.text, /Gửi góp ý/);
  await bot.handleUpdate(msg("ngắn lại"));
  const review = await readReview(dir);
  assert.equal(review.script, "Bản mới ngắn gọn.");
  assert.equal(review.status, "pending");
  assert.match(sent.at(-1)!.text, /Bản mới ngắn gọn/);
  assert.equal(sent.at(-1)!.buttons?.[0][0].callback_data, "ok:j2");
  assert.equal(ran.length, 0);
});

test("không cho bấm duyệt job của chat khác, mã job lạ bị chặn", async () => {
  await waitingJob("j3");
  const bot = makeBot();
  await bot.handleUpdate({ update_id: 4, callback_query: { id: "q", from: { id: CHAT }, data: "ok:../../etc", message: { message_id: 7, chat: { id: CHAT } } } });
  assert.match(sent.at(-1)!.text, /Mã job không hợp lệ/);
});

test("/retry chỉ chạy lại job lỗi", async () => {
  const dir = await waitingJob("j4");
  const job = await loadJob(dir);
  job.status = "failed";
  await saveJob(dir, job);
  const bot = makeBot();
  await bot.handleUpdate(msg("/retry j4"));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(ran, [dir]);
  await bot.handleUpdate(msg("/status"));
  assert.match(sent.at(-1)!.text, /j4 \(faceless\)/);
});

test("video gửi thẳng kèm lệnh ở chú thích: lấy video đó làm nguồn", async () => {
  await makeBot().handleUpdate(videoMsg("/ads https://drive.google.com/file/d/abcdefghij12/view làm nổi giá"));
  await new Promise((r) => setTimeout(r, 20));
  const job = await loadJob(ran[0]);
  assert.equal(job.source, "telegram:VID123:túi_ mới.mp4");
  assert.equal(job.request, "làm nổi giá");
  assert.match(sent[0].text, /Đã nhận job/);
});

test("video gửi dạng file cũng nhận, file không phải video thì bỏ qua", async () => {
  const doc = (mime: string) => videoMsg("/ads chữ freeship", { video: undefined, document: { file_id: "DOC1", mime_type: mime, file_name: "a.mov" } });
  await makeBot().handleUpdate(doc("video/quicktime"));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await loadJob(ran[0])).source, "telegram:DOC1:a.mov");
  await makeBot().handleUpdate(doc("application/pdf"));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await loadJob(ran[1])).source, "");
});

test("video quá 20 MB bị từ chối, video không có lệnh thì hướng dẫn", async () => {
  await makeBot().handleUpdate(videoMsg("/ads", { video: { file_id: "BIG", file_size: 30 * 1024 * 1024 } }));
  assert.match(sent.at(-1)!.text, /30 MB.*20 MB/);
  await makeBot().handleUpdate(videoMsg(undefined));
  assert.match(sent.at(-1)!.text, /phần chú thích/);
  assert.equal(ran.length, 0);
});

test("job chạy: tải video Telegram qua bot, xong thì gửi video về chat", async () => {
  const bot = makeBot("{}", async (dir, deps) => {
    const file = await deps.telegramFile!("VID123", join(dir, "input"), "a.mp4");
    const final = join(dir, "final.mp4");
    await writeFile(final, "x");
    const job = await loadJob(dir);
    await deps.notify(job, { type: "done", final, url: "https://drive/x" });
    assert.equal(file.path, join(dir, "input", "a.mp4"));
    return job;
  });
  await bot.handleUpdate(videoMsg("/ads"));
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(downloads.map((d) => d.fileId), ["VID123"]);
  assert.equal(videosSent.length, 1);
  assert.equal(videosSent[0].chat, CHAT);
  assert.match(sent.at(-1)!.text, /Xong job[\s\S]*https:\/\/drive\/x/);
});

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const LESSON = JSON.stringify({ rules: [{ rule: "Chữ highlight luôn có nền vàng.", all_workflows: true }] });

async function doneJob(id: string) {
  const dir = join(jobsDir, id);
  await mkdir(dir, { recursive: true });
  const job = await createJob(dir, { id, workflow: "shop-ads", source: "x.mp4", request: "làm nổi giá", chatId: CHAT }, stepsFor("shop-ads"));
  job.steps.forEach((s) => (s.status = "done"));
  job.status = "done";
  job.artifacts.final = "/tmp/final.mp4";
  await saveJob(dir, job);
  return dir;
}

test("/sua: thêm yêu cầu, chạy lại từ bước lên hiệu ứng, ghi nhớ bài học", async () => {
  const dir = await doneJob("20261027-090000-aaaa");
  await makeBot(LESSON).handleUpdate(msg("/sua chữ nền vàng"));
  await wait();
  const job = await loadJob(dir);
  assert.deepEqual(ran, [dir]);
  assert.equal(job.request, "làm nổi giá\nNgười dùng yêu cầu sửa: chữ nền vàng");
  assert.deepEqual(job.steps.filter((s) => s.status === "pending").map((s) => s.name), ["plan", "render", "qa", "upload"]);
  assert.equal(job.steps.find((s) => s.name === "cut")!.status, "done");
  assert.equal(job.artifacts.final, undefined);
  const lessons = await loadLessons(knowledge);
  assert.equal(lessons[0].rule, "Chữ highlight luôn có nền vàng.");
  assert.equal(lessons[0].scope, "edit");
  assert.match(sent.at(-1)!.text, /Đã ghi nhớ[\s\S]*nền vàng/);
});

test("/baihoc liệt kê, /quen bỏ bài học", async () => {
  await doneJob("20261027-090000-bbbb");
  const bot = makeBot(LESSON);
  await bot.handleUpdate(msg("/sua 20261027-090000-bbbb chữ nền vàng"));
  await wait();
  const [lesson] = await loadLessons(knowledge);
  await bot.handleUpdate(msg("/baihoc"));
  assert.ok(sent.at(-1)!.text.includes(`nền vàng. (${lesson.id})`));
  await bot.handleUpdate(msg(`/quen ${lesson.id}`));
  assert.match(sent.at(-1)!.text, /Đã bỏ/);
  assert.equal((await loadLessons(knowledge)).length, 0);
});

test("góp ý kịch bản cũng được ghi nhớ (scope script)", async () => {
  await waitingJob("j5");
  let calls = 0;
  const bot = makeBot("", undefined, {
    runnerDeps: { llm: () => ({ name: "fake", complete: async () => (++calls === 1 ? JSON.stringify({ script: "Bản mới." }) : JSON.stringify({ rules: [{ rule: "Hook là câu hỏi." }] })) }), tts: () => ({}) as any, asr: () => ({}) as any },
  });
  await bot.handleUpdate({ update_id: 3, callback_query: { id: "q", from: { id: CHAT }, data: "edit:j5", message: { message_id: 6, chat: { id: CHAT } } } });
  await bot.handleUpdate(msg("mở đầu bằng câu hỏi"));
  await wait();
  const [lesson] = await loadLessons(knowledge);
  assert.equal(lesson.scope, "script");
  assert.equal(lesson.workflow, "faceless");
});

test("job lỗi đã biết: bot gửi kèm cách sửa", async () => {
  const dir = await doneJob("20261027-090000-cccc");
  const bot = makeBot("{}", async (d, deps) => {
    const job = await loadJob(d);
    await deps.notify(job, { type: "failed", step: "upload", error: "Google Drive 403: Google Drive API has not been used in project 1" });
    return job;
  });
  await writeFile(join(knowledge, "known-errors.json"), JSON.stringify([{ match: "has not been used", fix: "Bật Drive API." }]));
  bot.enqueue(dir);
  await wait();
  assert.match(sent.at(-1)!.text, /💡 Cách sửa: Bật Drive API/);
});

test("/hocvideo: video gửi thẳng, tải về rồi học phong cách", async () => {
  let got: any;
  const bot = makeBot("{}", undefined, {
    learner: async (opts) => {
      got = opts;
      return { profile: { name: opts.name, summary: "nhanh", source: "", learnedAt: "", stats: { durationSec: 10, aspectRatio: "9:16", shots: 5, avgShotSec: 2, cutsPerMinute: 24 }, transcript: "", analysis: { hook: "câu hỏi" }, rules: { script: ["Mở bằng câu hỏi."], edit: [] } }, file: "" };
    },
  });
  await bot.handleUpdate(videoMsg("/hocvideo doi-thu-a học hook"));
  await wait(50);
  assert.deepEqual(downloads.map((d) => d.fileId), ["VID123"]);
  assert.equal(got.name, "doi-thu-a");
  assert.equal(got.note, "học hook");
  assert.equal(got.knowledge, knowledge);
  assert.match(sent.at(-1)!.text, /Đã học phong cách "doi-thu-a"[\s\S]*Mở bằng câu hỏi[\s\S]*style:doi-thu-a/);
});

test("/ads style:<tên> lưu phong cách vào job", async () => {
  await makeBot().handleUpdate(msg("/ads style:doi-thu-a làm nổi giá"));
  await wait();
  const job = await loadJob(ran[0]);
  assert.equal(job.style, "doi-thu-a");
  assert.equal(job.request, "làm nổi giá");
});
