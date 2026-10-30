import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadConfig, projectRoot } from "../config/index.ts";

// Trạng thái cài đặt của khách (tên, cách gọi, các bước đã xong). Không chứa khóa. Nằm trong workspace/ nên không bị commit.

export const STEPS = ["hello", "machine", "voice", "telegram", "storage", "sample"] as const;
export type Step = (typeof STEPS)[number];

export interface SetupState {
  name?: string;
  call?: string; // cách gọi, ví dụ "anh Nam"
  done: Step[];
  skipped: Step[]; // bước tùy chọn khách bỏ qua (telegram, storage)
  onboarded: boolean;
}

// Chỉ cho phép ghi các khóa này vào .env, tránh ghi tên bừa qua lệnh set-key
export const KEY_NAMES = [
  "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_CHAT_IDS",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_DRIVE_INPUT_FOLDER_ID", "GOOGLE_DRIVE_OUTPUT_FOLDER_ID",
  "FFMPEG_PATH", "FFPROBE_PATH", "CLAUDE_PATH",
] as const;
export type KeyName = (typeof KEY_NAMES)[number];

const stateFile = () => resolve(projectRoot(), loadConfig().workspace_dir, "setup.json");
export const envFile = () => resolve(projectRoot(), ".env");

export async function readState(): Promise<SetupState> {
  const empty: SetupState = { done: [], skipped: [], onboarded: false };
  if (!existsSync(stateFile())) return empty;
  try {
    return { ...empty, ...JSON.parse(await readFile(stateFile(), "utf8")) };
  } catch {
    return empty; // file hỏng thì làm lại từ đầu, không làm khách kẹt
  }
}

export async function saveState(state: SetupState): Promise<void> {
  await mkdir(dirname(stateFile()), { recursive: true });
  await writeFile(stateFile(), JSON.stringify(state, null, 2), "utf8");
}

// Bước tiếp theo chưa xong (kể cả đã bỏ qua thì coi là qua)
export function nextStep(state: SetupState): Step | null {
  return STEPS.find((s) => !state.done.includes(s) && !state.skipped.includes(s)) ?? null;
}

export function markStep(state: SetupState, step: Step, how: "done" | "skipped" = "done"): SetupState {
  const rest = (list: Step[]) => list.filter((s) => s !== step);
  return how === "done"
    ? { ...state, done: [...rest(state.done), step], skipped: rest(state.skipped) }
    : { ...state, skipped: [...rest(state.skipped), step], done: rest(state.done) };
}

// Ghi hoặc thay một dòng NAME=value trong nội dung .env, giữ nguyên các dòng khác
export function setEnvValue(content: string, name: string, value: string): string {
  if (!(KEY_NAMES as readonly string[]).includes(name)) throw new Error(`Không được phép ghi "${name}" vào .env. Các khóa hợp lệ: ${KEY_NAMES.join(", ")}`);
  if (/[\r\n]/.test(value)) throw new Error("Giá trị khóa không được có xuống dòng.");
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  return re.test(content) ? content.replace(re, () => line) : `${content.trimEnd()}${content.trim() ? "\n" : ""}${line}\n`;
}

// Khóa nào đã có giá trị (chỉ trả đúng/sai, không bao giờ trả giá trị)
export function presentKeys(content: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const name of KEY_NAMES) {
    const m = new RegExp(`^${name}=(.*)$`, "m").exec(content);
    out[name] = !!m && m[1].trim().length > 0;
  }
  return out;
}

export async function ensureEnvFile(): Promise<boolean> {
  if (existsSync(envFile())) return false;
  const example = resolve(projectRoot(), ".env.example");
  if (existsSync(example)) await copyFile(example, envFile());
  else await writeFile(envFile(), "", "utf8");
  return true;
}

export async function writeKey(name: string, value: string): Promise<void> {
  await ensureEnvFile();
  const content = readFileSync(envFile(), "utf8");
  await writeFile(envFile(), setEnvValue(content, name, value.trim()), "utf8");
}

export const readEnvContent = (): string => (existsSync(envFile()) ? readFileSync(envFile(), "utf8") : "");

export function nodeVersionOk(version = process.versions.node): boolean {
  const [major, minor] = version.split(".").map(Number);
  return major > 20 || (major === 20 && minor >= 12);
}
