import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { createJob, loadJob, saveJob, type JobState } from "../core/jobs/job.ts";
import { stepsFor, type JobEvent, type RunnerDeps, runJob } from "../core/jobs/runner.ts";
import { reviseScript } from "../core/planner/script-writer.ts";
import { SerialQueue } from "../core/queue/queue.ts";
import { setStatus } from "../core/review/review-state.ts";
import type { ScriptCheck } from "../core/review/script-checks.ts";
import { MAX_DOWNLOAD_BYTES, MAX_UPLOAD_BYTES, type TelegramApi, type TgButton, type TgFile, type TgUpdate } from "../integrations/delivery/telegram/index.ts";
import { safeFileName } from "../integrations/storage/google-drive/index.ts";
import { HELP, parseCommand, type Command } from "./commands.ts";

const STEP_LABEL: Record<string, string> = {
  download: "tải video", probe: "đọc video", cut: "cắt khoảng lặng", subtitle: "làm phụ đề", script: "viết kịch bản",
  voiceover: "đọc giọng AI", plan: "lên hiệu ứng", render: "render", qa: "kiểm tra video", upload: "upload Drive",
};
const STATUS_LABEL: Record<string, string> = { queued: "đang chờ", running: "đang chạy", waiting_approval: "chờ duyệt kịch bản", done: "xong", failed: "lỗi" };

export interface BotDeps {
  tg: TelegramApi;
  allowedChats: Set<number>;
  jobsDir: string;
  runnerDeps: Omit<RunnerDeps, "notify">;
  runner?: typeof runJob;
}

export function newJobId(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}-${randomBytes(2).toString("hex")}`;
}

function scriptMessage(script: string, check: ScriptCheck): string {
  const issues = check.issues.length ? `\n\n⚠️ Lưu ý:\n${check.issues.map((i) => `• ${i.message}`).join("\n")}` : "";
  return `📝 Kịch bản (khoảng ${check.estimatedSec}s, ${check.words} từ):\n\n${script}${issues}`;
}

// Video gửi thẳng (dạng video hoặc dạng file)
function attachedVideo(m: TgUpdate["message"]): TgFile | undefined {
  if (m?.video) return m.video;
  if (m?.document?.mime_type?.startsWith("video/")) return m.document;
  return undefined;
}

// Lệnh kèm video gửi thẳng: lấy video đó làm nguồn, bỏ qua link Drive nếu có
export function withVideo(cmd: Command, video: TgFile | undefined): Command {
  if (!video || cmd.kind !== "job") return cmd;
  if ((video.file_size ?? 0) > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Video ${Math.round((video.file_size ?? 0) / 1024 / 1024)} MB, Telegram chỉ cho bot tải tối đa 20 MB. Up lên Drive rồi gửi lệnh kèm link.`);
  }
  const name = safeFileName(video.file_name || `telegram-${Date.now()}.mp4`);
  return { ...cmd, source: `telegram:${video.file_id}:${name}` };
}

export class VideoBot {
  private queue = new SerialQueue();
  private awaitingFeedback = new Map<number, string>(); // chat → job đang chờ góp ý
  private offset = 0;
  private stopped = false;

  constructor(private deps: BotDeps) {}

  private get run() {
    return this.deps.runner ?? runJob;
  }

  private dir(jobId: string): string {
    if (!/^[\w-]+$/.test(jobId)) throw new Error("Mã job không hợp lệ.");
    return join(this.deps.jobsDir, jobId);
  }

  private approvalButtons(jobId: string): TgButton[][] {
    return [[{ text: "✅ Duyệt", callback_data: `ok:${jobId}` }, { text: "✏️ Sửa", callback_data: `edit:${jobId}` }]];
  }

  private async send(chatId: number | undefined, text: string, buttons?: TgButton[][]) {
    if (chatId === undefined) return;
    await this.deps.tg.sendMessage(chatId, text, buttons).catch((err) => console.error(`Không gửi được Telegram: ${err.message}`));
  }

  notify = async (job: JobState, event: JobEvent) => {
    switch (event.type) {
      case "step":
        if (event.step === "render") await this.send(job.chatId, `🎬 Job ${job.id}: đang render...`);
        break;
      case "waiting_approval":
        await this.send(job.chatId, scriptMessage(event.script, event.check), this.approvalButtons(job.id));
        break;
      case "done": {
        // Video vừa đủ nhỏ thì gửi thẳng vào Telegram để xem ngay trên điện thoại
        if (job.chatId !== undefined && existsSync(event.final) && statSync(event.final).size <= MAX_UPLOAD_BYTES) {
          await this.deps.tg.sendVideo(job.chatId, event.final, `🎬 Job ${job.id}`).catch((err) => console.error(`Không gửi được video: ${err.message}`));
        }
        const notes = job.steps.filter((s) => s.note).map((s) => `• ${STEP_LABEL[s.name] ?? s.name}: ${s.note}`);
        const qa = event.qa?.issues.length ? `\n\n🔎 Kiểm tra:\n${event.qa.issues.map((i) => `• ${i.message}`).join("\n")}` : "";
        await this.send(job.chatId, `✅ Xong job ${job.id}\n${event.url ?? event.final}${notes.length ? `\n\n${notes.join("\n")}` : ""}${qa}`);
        break;
      }
      case "failed":
        await this.send(job.chatId, `❌ Job ${job.id} lỗi ở bước ${STEP_LABEL[event.step] ?? event.step}:\n${event.error}\n\nSửa xong gửi /retry ${job.id} để chạy tiếp.`);
        break;
      case "note":
        break;
    }
  };

  private telegramFile = async (fileId: string, destDir: string, name: string) => {
    const path = join(destDir, name);
    await mkdir(destDir, { recursive: true });
    await this.deps.tg.downloadFile(fileId, path);
    return { path, name };
  };

  enqueue(dir: string): Promise<JobState> {
    return this.queue.push(() => this.run(dir, { ...this.deps.runnerDeps, telegramFile: this.telegramFile, notify: this.notify }));
  }

  // Bot tắt giữa chừng thì job đang chạy được chạy tiếp khi bật lại
  resumeUnfinished(): number {
    if (!existsSync(this.deps.jobsDir)) return 0;
    let n = 0;
    for (const id of readdirSync(this.deps.jobsDir).sort()) {
      const dir = join(this.deps.jobsDir, id);
      if (!existsSync(join(dir, "job.json"))) continue;
      loadJob(dir).then((job) => {
        if (job.status === "running" || job.status === "queued") this.enqueue(dir);
      }).catch(() => undefined);
      n++;
    }
    return n;
  }

  async handleUpdate(u: TgUpdate): Promise<void> {
    const chatId = u.message?.chat.id ?? u.callback_query?.message?.chat.id;
    if (chatId === undefined) return;
    if (!this.deps.allowedChats.has(chatId)) {
      if (u.message) await this.send(chatId, `Bot riêng tư. Chat id của bạn là ${chatId}: thêm vào TELEGRAM_ALLOWED_CHAT_IDS trong .env để dùng.`);
      return;
    }
    try {
      if (u.callback_query) return await this.onButton(chatId, u.callback_query);
      const video = attachedVideo(u.message);
      const text = (u.message?.text ?? u.message?.caption)?.trim();
      if (!text) {
        if (video) await this.send(chatId, "Đã nhận video. Gửi lại kèm lệnh ở phần chú thích, ví dụ: /ads làm nổi giá và chữ freeship");
        return;
      }
      const waiting = this.awaitingFeedback.get(chatId);
      if (waiting && !text.startsWith("/")) {
        this.awaitingFeedback.delete(chatId);
        return await this.onFeedback(chatId, waiting, text);
      }
      await this.onCommand(chatId, withVideo(parseCommand(text), video));
    } catch (err) {
      await this.send(chatId, `❌ ${(err as Error).message}`);
    }
  }

  private async onCommand(chatId: number, cmd: Command) {
    switch (cmd.kind) {
      case "help":
        return this.send(chatId, HELP);
      case "unknown":
        return this.send(chatId, `Không hiểu lệnh. Gõ /help để xem cách dùng.`);
      case "status":
        return this.send(chatId, await this.statusText(chatId));
      case "retry": {
        const dir = this.dir(cmd.jobId);
        const job = await loadJob(dir);
        if (job.chatId !== chatId) throw new Error("Không tìm thấy job này.");
        if (job.status !== "failed") return this.send(chatId, `Job ${job.id} đang ${STATUS_LABEL[job.status]}, không cần chạy lại.`);
        job.status = "queued";
        await saveJob(dir, job);
        await this.send(chatId, `🔁 Chạy tiếp job ${job.id} từ bước bị lỗi.`);
        this.enqueue(dir);
        return;
      }
      case "job": {
        if (cmd.workflow === "faceless" && !cmd.text) throw new Error("Thiếu nội dung. Ví dụ: /faceless <link> Giới thiệu túi da màu kem, giá 299 nghìn, freeship");
        if (cmd.workflow === "dubbing" && !cmd.text) throw new Error("Thiếu kịch bản. Gửi: /dub <link> rồi xuống dòng, dán kịch bản.");
        const id = newJobId();
        const dir = this.dir(id);
        await mkdir(dir, { recursive: true });
        await createJob(dir, {
          id,
          workflow: cmd.workflow,
          source: cmd.source,
          chatId,
          ...(cmd.workflow === "shop-ads" && cmd.text ? { request: cmd.text } : {}),
          ...(cmd.workflow === "faceless" ? { brief: cmd.text } : {}),
          ...(cmd.workflow === "dubbing" ? { script: cmd.text } : {}),
        }, stepsFor(cmd.workflow));
        const ahead = this.queue.length;
        await this.send(chatId, `📥 Đã nhận job ${id} (${cmd.workflow}).${ahead ? ` Có ${ahead} job đang chạy trước.` : ""}`);
        this.enqueue(dir);
        return;
      }
    }
  }

  private async onButton(chatId: number, q: NonNullable<TgUpdate["callback_query"]>) {
    const [action, jobId] = (q.data ?? "").split(":");
    const dir = this.dir(jobId ?? "");
    const job = await loadJob(dir);
    if (job.chatId !== chatId) throw new Error("Không tìm thấy job này.");
    if (q.message) await this.deps.tg.clearButtons(chatId, q.message.message_id);
    if (job.status !== "waiting_approval") {
      await this.deps.tg.answerCallback(q.id, "Job không còn chờ duyệt.");
      return;
    }
    if (action === "ok") {
      await setStatus(dir, "approved");
      await this.deps.tg.answerCallback(q.id, "Đã duyệt");
      await this.send(chatId, `👍 Đã duyệt kịch bản, job ${job.id} chạy tiếp.`);
      this.enqueue(dir);
    } else if (action === "edit") {
      this.awaitingFeedback.set(chatId, job.id);
      await this.deps.tg.answerCallback(q.id);
      await this.send(chatId, "Gửi góp ý cho kịch bản (ví dụ: ngắn lại, thêm câu hỏi mở đầu).");
    }
  }

  private async onFeedback(chatId: number, jobId: string, feedback: string) {
    const dir = this.dir(jobId);
    const job = await loadJob(dir);
    await setStatus(dir, "changes_requested", feedback);
    await this.send(chatId, "✏️ Đang viết lại kịch bản...");
    const { state } = await reviseScript({ dir, feedback, workflow: job.workflow, llm: this.deps.runnerDeps.llm() });
    await this.send(chatId, scriptMessage(state.script, state.check), this.approvalButtons(job.id));
  }

  private async statusText(chatId: number): Promise<string> {
    if (!existsSync(this.deps.jobsDir)) return "Chưa có job nào.";
    const ids = readdirSync(this.deps.jobsDir).sort().reverse();
    const lines: string[] = [];
    for (const id of ids) {
      if (lines.length >= 5) break;
      const job = await loadJob(join(this.deps.jobsDir, id)).catch(() => null);
      if (!job || job.chatId !== chatId) continue;
      const current = job.steps.find((s) => s.status === "running" || s.status === "failed");
      lines.push(`• ${job.id} (${job.workflow}): ${STATUS_LABEL[job.status]}${current ? `, bước ${STEP_LABEL[current.name] ?? current.name}` : ""}`);
    }
    return lines.length ? `Job gần đây:\n${lines.join("\n")}` : "Chưa có job nào.";
  }

  async start(): Promise<void> {
    while (!this.stopped) {
      try {
        const updates = await this.deps.tg.getUpdates(this.offset, 30);
        for (const u of updates) {
          this.offset = u.update_id + 1;
          await this.handleUpdate(u);
        }
      } catch (err) {
        console.error(`Lỗi nhận tin Telegram: ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  stop() {
    this.stopped = true;
  }
}
