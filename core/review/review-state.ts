import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScriptCheck } from "./script-checks.ts";

// Trạng thái duyệt kịch bản, lưu ở <job>/review.json. Bot Telegram (bước 5) đọc và cập nhật file này.
export type ReviewStatus = "pending" | "approved" | "changes_requested";

export interface ReviewState {
  status: ReviewStatus;
  brief: string;
  targetSec?: number;
  script: string;
  check: ScriptCheck;
  history: { at: string; action: "written" | "revised" | "approved" | "changes_requested"; feedback?: string }[];
}

const file = (dir: string) => join(dir, "review.json");

export async function readReview(dir: string): Promise<ReviewState> {
  if (!existsSync(file(dir))) throw new Error(`Chưa có kịch bản trong ${dir} (thiếu review.json).`);
  return JSON.parse(await readFile(file(dir), "utf8"));
}

export async function saveReview(dir: string, state: ReviewState): Promise<void> {
  await writeFile(file(dir), JSON.stringify(state, null, 2), "utf8");
  await writeFile(join(dir, "script.txt"), state.script, "utf8");
}

export async function setStatus(dir: string, status: "approved" | "changes_requested", feedback?: string): Promise<ReviewState> {
  const state = await readReview(dir);
  state.status = status;
  state.history.push({ at: new Date().toISOString(), action: status, ...(feedback ? { feedback } : {}) });
  await saveReview(dir, state);
  return state;
}
