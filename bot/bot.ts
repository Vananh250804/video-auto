import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { createJob, loadJob, saveJob, type JobState } from "../core/jobs/job.ts";
import { stepsFor, type JobEvent, type RunnerDeps, runJob } from "../core/jobs/runner.ts";
import { hintForError, knowledgeDir, learnFromFeedback, loadLessons, removeLesson, type Lesson } from "../core/knowledge/lessons.ts";
import { learnStyle, styleSummary } from "../core/knowledge/style-learn.ts";
import { loadConfig } from "../core/config/index.ts";
import { reviseScript } from "../core/planner/script-writer.ts";
import { SerialQueue } from "../core/queue/queue.ts";
import { readReview, setStatus } from "../core/review/review-state.ts";
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
  knowledgeDir?: string; // mặc định knowledge/ trong repo, test thay bằng thư mục tạm
  learner?: typeof learnStyle;
}

// Bước phải chạy lại khi người dùng yêu cầu sửa video đã xong
const FIX_STEPS = new Set(["plan", "render", "qa", "upload"]);

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
  if (!video || (cmd.kind !== "job" && cmd.kind !== "learn")) return cmd;
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

  private get knowledge() {
    return this.deps.knowledgeDir ?? knowledgeDir();
  }

  // Học ở nền: không làm chậm phản hồi, lỗi chỉ ghi log
  private learn(chatId: number, run: () => Promise<Lesson[]>) {
    run()
      .then(async (added) => {
        if (added.length) await this.send(chatId, `🧠 Đã ghi nhớ cho lần sau:\n${added.map((l) => `• ${l.rule} (${l.id})`).join("\n")}\n\nSai thì gửi /quen <mã>.`);
      })
      .catch((err) => console.error(`Không rút được bài học: ${err.message}`));
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
      case "failed": {
        const hint = hintForError(event.error, this.knowledge);
        await this.send(job.chatId, `❌ Job ${job.id} lỗi ở bước ${STEP_LABEL[event.step] ?? event.step}:\n${event.error}${hint ? `\n\n💡 Cách sửa: ${hint}` : ""}\n\nSửa xong gửi /retry ${job.id} để chạy tiếp.`);
        break;
      }
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
          ...(cmd.style ? { style: cmd.style } : {}),
        }, stepsFor(cmd.workflow));
        const ahead = this.queue.length;
        await this.send(chatId, `📥 Đã nhận job ${id} (${cmd.workflow}).${ahead ? ` Có ${ahead} job đang chạy trước.` : ""}`);
        this.enqueue(dir);
        return;
      }
      case "fix":
        return this.onFix(chatId, cmd.jobId, cmd.request);
      case "lessons":
        return this.send(chatId, await this.lessonsText());
      case "forget": {
        const removed = await removeLesson(cmd.lessonId, this.knowledge);
        return this.send(chatId, removed ? `🗑 Đã bỏ: ${removed.rule}` : "Không có bài học với mã này. Gõ /baihoc để xem.");
      }
      case "learn":
        return this.onLearn(chatId, cmd.name, cmd.source, cmd.note);
    }
  }

  // Sửa video đã xong: thêm yêu cầu, chạy lại từ bước lên hiệu ứng, và ghi nhớ góp ý cho các video sau
  private async onFix(chatId: number, jobId: string | undefined, request: string) {
    if (!request) throw new Error("Thiếu yêu cầu sửa. Ví dụ: /sua chữ highlight to hơn, bỏ nhạc nền");
    const id = jobId ?? (await this.latestJob(chatId, ["done", "failed"]));
    if (!id) throw new Error("Chưa có job nào để sửa.");
    const dir = this.dir(id);
    const job = await loadJob(dir);
    if (job.chatId !== chatId) throw new Error("Không tìm thấy job này.");
    if (job.status !== "done" && job.status !== "failed") return this.send(chatId, `Job ${job.id} đang ${STATUS_LABEL[job.status]}, đợi xong rồi sửa.`);
    if (!job.steps.some((s) => s.name === "plan" && s.status === "done")) throw new Error(`Job ${job.id} chưa tới bước lên hiệu ứng. Dùng /retry ${job.id}.`);
    const previous = job.request?.trim();
    job.request = [previous, `Người dùng yêu cầu sửa: ${request}`].filter(Boolean).join("\n");
    job.revisions = [...(job.revisions ?? []), { at: new Date().toISOString(), request }];
    for (const step of job.steps) {
      if (FIX_STEPS.has(step.name)) Object.assign(step, { status: "pending", error: undefined, note: undefined });
    }
    delete job.artifacts.final;
    delete job.artifacts.url;
    delete job.artifacts.qa;
    job.status = "queued";
    await saveJob(dir, job);
    await this.send(chatId, `🔧 Đang sửa job ${job.id}: ${request}`);
    this.enqueue(dir);
    this.learn(chatId, () => learnFromFeedback({
      llm: this.deps.runnerDeps.llm(),
      scope: "edit",
      workflow: job.workflow,
      feedback: request,
      context: `Yêu cầu trước: ${previous || "(mặc định)"}`,
      dir: this.knowledge,
    }));
  }

  // Học phong cách từ video mẫu, chạy trong hàng đợi chung vì nặng (tách lời, phân tích ảnh)
  private async onLearn(chatId: number, name: string, source: string, note: string) {
    if (!/^[\w-]+$/.test(name)) throw new Error("Đặt tên phong cách không dấu, ví dụ: /hocvideo doi-thu-a <link Drive> (hoặc gửi video kèm chú thích /hocvideo doi-thu-a)");
    if (!source) throw new Error("Gửi video kèm chú thích /hocvideo <tên>, hoặc /hocvideo <tên> <link Drive>.");
    const workDir = join(dirname(this.deps.jobsDir), "learn", `${name}-${newJobId()}`);
    await this.send(chatId, `🎓 Đang học phong cách "${name}" (tách lời, đo cảnh, xem khung hình)...`);
    this.queue.push(async () => {
      const tg = source.match(/^telegram:([^:]+):(.+)$/);
      const storage = this.deps.runnerDeps.storage;
      if (!tg && !storage) throw new Error("Chưa nối Google Drive để tải video.");
      const file = tg ? await this.telegramFile(tg[1], join(workDir, "input"), tg[2]) : await storage!.download(source, join(workDir, "input"));
      const { profile } = await (this.deps.learner ?? learnStyle)({
        video: file.path,
        name,
        workDir,
        llm: this.deps.runnerDeps.llm(),
        asr: this.deps.runnerDeps.asr(),
        language: loadConfig().language,
        source: tg ? file.name : source,
        note,
        knowledge: this.knowledge,
      });
      await this.send(chatId, styleSummary(profile));
    }).catch(async (err) => {
      const hint = hintForError(err.message, this.knowledge);
      await this.send(chatId, `❌ Học video lỗi: ${err.message}${hint ? `\n💡 ${hint}` : ""}`);
    });
  }

  private async lessonsText(): Promise<string> {
    const lessons = await loadLessons(this.knowledge);
    if (!lessons.length) return "Chưa có bài học nào. Khi bạn góp ý kịch bản hoặc /sua video, bot tự ghi nhớ.";
    const label = { script: "Kịch bản", edit: "Edit" } as const;
    return `🧠 Bài học đang áp dụng:\n${lessons.slice(-30).map((l) => `• [${label[l.scope]}${l.workflow ? `, ${l.workflow}` : ""}] ${l.rule} (${l.id})`).join("\n")}\n\nBỏ một bài: /quen <mã>`;
  }

  private async latestJob(chatId: number, statuses: string[]): Promise<string | undefined> {
    if (!existsSync(this.deps.jobsDir)) return undefined;
    for (const id of readdirSync(this.deps.jobsDir).sort().reverse()) {
      const job = await loadJob(join(this.deps.jobsDir, id)).catch(() => null);
      if (job && job.chatId === chatId && statuses.includes(job.status)) return job.id;
    }
    return undefined;
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
    const previous = (await readReview(dir)).script;
    const { state } = await reviseScript({ dir, feedback, workflow: job.workflow, style: job.style, llm: this.deps.runnerDeps.llm() });
    await this.send(chatId, scriptMessage(state.script, state.check), this.approvalButtons(job.id));
    this.learn(chatId, () => learnFromFeedback({ llm: this.deps.runnerDeps.llm(), scope: "script", workflow: job.workflow, feedback, context: previous, dir: this.knowledge }));
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
