import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VideoBot } from "../../bot/bot.ts";
import { createJob, loadJob, saveJob } from "../../core/jobs/job.ts";
import { stepsFor } from "../../core/jobs/runner.ts";
import { readReview, saveReview } from "../../core/review/review-state.ts";
import type { TelegramApi, TgButton } from "../../integrations/delivery/telegram/index.ts";

const CHAT = 111;
let sent: { chat: number; text: string; buttons?: TgButton[][] }[] = [];
let ran: string[] = [];
let jobsDir = "";

const tg: TelegramApi = {
  async getUpdates() { return []; },
  async sendMessage(chat, text, buttons) { sent.push({ chat, text, buttons }); },
  async answerCallback() {},
  async clearButtons() {},
};

function makeBot(llmAnswer = "{}") {
  return new VideoBot({
    tg,
    allowedChats: new Set([CHAT]),
    jobsDir,
    runnerDeps: { llm: () => ({ name: "fake", complete: async () => llmAnswer }), tts: () => ({}) as any, asr: () => ({}) as any },
    runner: async (dir) => { ran.push(dir); return loadJob(dir); },
  });
}
const msg = (text: string, chat = CHAT) => ({ update_id: 1, message: { message_id: 1, chat: { id: chat }, text } });

beforeEach(async () => {
  sent = [];
  ran = [];
  jobsDir = await mkdtemp(join(tmpdir(), "bot-"));
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
