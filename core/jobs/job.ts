import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { QaReport } from "../qa/video-qa.ts";

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type JobStatus = "queued" | "running" | "waiting_approval" | "done" | "failed";

export interface JobState {
  id: string;
  workflow: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  source: string; // link Drive hoặc đường dẫn file
  request?: string; // yêu cầu edit tự do
  brief?: string; // nội dung để Claude viết kịch bản (faceless)
  script?: string; // kịch bản có sẵn (dubbing)
  style?: string; // phong cách đã học (knowledge/styles), áp vào kịch bản và hiệu ứng
  revisions?: { at: string; request: string }[]; // các lần người dùng yêu cầu sửa sau khi xong (/sua)
  chatId?: number; // Telegram chat gửi lệnh
  steps: { name: string; status: StepStatus; error?: string; note?: string }[];
  artifacts: {
    input?: string;
    inputName?: string;
    video?: string; // video hiện tại, cập nhật sau mỗi bước cut/voiceover
    captions?: string;
    edit?: string;
    final?: string;
    url?: string;
    expectedDurationSec?: number;
    hasAudio?: boolean;
    aspectRatio?: string;
    qa?: QaReport;
  };
  error?: string;
}

const FILE = "job.json";

export async function saveJob(dir: string, job: JobState): Promise<void> {
  job.updatedAt = new Date().toISOString();
  const tmp = join(dir, `${FILE}.tmp`);
  await writeFile(tmp, JSON.stringify(job, null, 2), "utf8");
  await rename(tmp, join(dir, FILE)); // ghi tạm rồi đổi tên để không hỏng file khi tắt máy giữa chừng
}

export async function loadJob(dir: string): Promise<JobState> {
  if (!existsSync(join(dir, FILE))) throw new Error(`Không có job trong ${dir}`);
  return JSON.parse(await readFile(join(dir, FILE), "utf8"));
}

export async function createJob(dir: string, init: Omit<JobState, "status" | "createdAt" | "updatedAt" | "steps" | "artifacts">, steps: string[]): Promise<JobState> {
  await mkdir(join(dir, "input"), { recursive: true });
  await mkdir(join(dir, "work"), { recursive: true });
  await mkdir(join(dir, "output"), { recursive: true });
  const now = new Date().toISOString();
  const job: JobState = { ...init, status: "queued", createdAt: now, updatedAt: now, steps: steps.map((name) => ({ name, status: "pending" })), artifacts: {} };
  await saveJob(dir, job);
  return job;
}
