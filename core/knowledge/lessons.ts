import { existsSync, readFileSync, readdirSync } from "node:fs";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { loadConfig, projectRoot } from "../config/index.ts";
import type { LlmProvider } from "../contracts/providers.ts";
import { extractJson, fillTemplate } from "../planner/json.ts";

// Kho bài học trong knowledge/ (có commit lên git, người nhận bàn giao dùng được luôn):
//   lessons.json       quy tắc rút ra từ góp ý của người dùng, tự áp dụng vào prompt
//   known-errors.json  lỗi đã gặp và cách sửa, gợi ý khi job lỗi
//   styles/<tên>.json  hồ sơ phong cách học từ video đối thủ

export type LessonScope = "script" | "edit";

export interface Lesson {
  id: string;
  scope: LessonScope; // script = viết kịch bản, edit = phụ đề, chữ highlight, sfx, nhạc
  rule: string;
  workflow?: string; // bỏ trống = áp dụng mọi loại video
  source: "feedback" | "manual";
  feedback?: string; // câu góp ý gốc
  createdAt: string;
}

export interface KnownError {
  match: string; // regex, không phân biệt hoa thường
  fix: string;
}

export const knowledgeDir = () => resolve(projectRoot(), "knowledge");

const MAX_IN_PROMPT = 40;
const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export async function loadLessons(dir = knowledgeDir()): Promise<Lesson[]> {
  const file = join(dir, "lessons.json");
  return existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : [];
}

async function saveLessons(lessons: Lesson[], dir: string) {
  await mkdir(dir, { recursive: true });
  const tmp = join(dir, "lessons.json.tmp");
  await writeFile(tmp, JSON.stringify(lessons, null, 2) + "\n", "utf8");
  await rename(tmp, join(dir, "lessons.json"));
}

// Thêm quy tắc mới, bỏ quy tắc trùng chữ với quy tắc đã có. Trả về những quy tắc thật sự được thêm.
export async function addLessons(items: Omit<Lesson, "id" | "createdAt">[], dir = knowledgeDir()): Promise<Lesson[]> {
  const lessons = await loadLessons(dir);
  const seen = new Set(lessons.map((l) => `${l.scope}|${l.workflow ?? ""}|${normalize(l.rule)}`));
  const added: Lesson[] = [];
  for (const item of items) {
    const rule = item.rule.trim();
    const key = `${item.scope}|${item.workflow ?? ""}|${normalize(rule)}`;
    if (!rule || seen.has(key)) continue;
    seen.add(key);
    const lesson: Lesson = { id: randomBytes(3).toString("hex"), ...item, rule, createdAt: new Date().toISOString() };
    lessons.push(lesson);
    added.push(lesson);
  }
  if (added.length) await saveLessons(lessons, dir);
  return added;
}

export async function removeLesson(id: string, dir = knowledgeDir()): Promise<Lesson | undefined> {
  const lessons = await loadLessons(dir);
  const found = lessons.find((l) => l.id === id);
  if (found) await saveLessons(lessons.filter((l) => l.id !== id), dir);
  return found;
}

// Phần chèn vào prompt: quy tắc đã học + quy tắc của phong cách đang dùng. Không có gì thì trả chuỗi rỗng.
export async function lessonsForPrompt(scope: LessonScope, opts: { workflow?: string; style?: string; dir?: string } = {}): Promise<string> {
  const dir = opts.dir ?? knowledgeDir();
  const lessons = (await loadLessons(dir))
    .filter((l) => l.scope === scope && (!l.workflow || l.workflow === opts.workflow))
    .slice(-MAX_IN_PROMPT);
  const parts: string[] = [];
  if (lessons.length) {
    parts.push(`## Bài học từ góp ý trước của người dùng (bắt buộc làm theo, trừ khi yêu cầu lần này nói khác)\n${lessons.map((l) => `- ${l.rule}`).join("\n")}`);
  }
  const style = opts.style ? loadStyle(opts.style, dir) : undefined;
  if (opts.style && !style) throw new Error(`Chưa có phong cách "${opts.style}". Hiện có: ${listStyles(dir).join(", ") || "(chưa có)"}`);
  if (style) {
    const rules = scope === "script" ? style.rules.script : style.rules.edit;
    if (rules.length) parts.push(`## Phong cách cần theo: ${style.name} (${style.summary})\n${rules.map((r) => `- ${r}`).join("\n")}`);
  }
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
}

// ---- Học từ góp ý ----

// Nhờ Claude rút góp ý thành quy tắc chung, dùng được cho video sau (bỏ chi tiết riêng của video này).
export async function learnFromFeedback(opts: {
  llm: LlmProvider;
  scope: LessonScope;
  workflow: string;
  feedback: string;
  context?: string; // kịch bản cũ hoặc yêu cầu cũ, để Claude hiểu góp ý
  dir?: string;
}): Promise<Lesson[]> {
  const dir = opts.dir ?? knowledgeDir();
  const existing = (await loadLessons(dir)).filter((l) => l.scope === opts.scope).map((l) => `- ${l.rule}`).join("\n");
  const template = await readFile(resolve(projectRoot(), "prompts/learning/lesson.md"), "utf8");
  const answer = await opts.llm.complete(fillTemplate(template, {
    scope: opts.scope === "script" ? "viết kịch bản thuyết minh" : "edit video (phụ đề, chữ highlight, âm thanh, nhạc)",
    workflow: opts.workflow,
    feedback: opts.feedback,
    context: opts.context?.trim() || "(không có)",
    existing: existing || "(chưa có)",
  }));
  const raw = extractJson(answer);
  const rules: any[] = Array.isArray(raw.rules) ? raw.rules.slice(0, 3) : [];
  return addLessons(rules.flatMap((r) => {
    const rule = String(r?.rule ?? "").trim();
    if (!rule || rule.length > 300) return [];
    return [{ scope: opts.scope, rule, source: "feedback" as const, feedback: opts.feedback, ...(r?.all_workflows ? {} : { workflow: opts.workflow }) }];
  }), dir);
}

// ---- Học từ lỗi ----

export function loadKnownErrors(dir = knowledgeDir()): KnownError[] {
  const file = join(dir, "known-errors.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

// Lỗi đã gặp trước đây thì trả cách sửa
export function hintForError(message: string, dir = knowledgeDir()): string | undefined {
  for (const e of loadKnownErrors(dir)) {
    try {
      if (new RegExp(e.match, "i").test(message)) return e.fix;
    } catch {
      // regex hỏng thì bỏ qua mục đó
    }
  }
  return undefined;
}

// Ghi lỗi job vào workspace/logs/errors.jsonl (không commit) để skill learn xem lại và bổ sung known-errors.json
export async function logError(entry: { jobId: string; workflow: string; step: string; error: string }): Promise<void> {
  const dir = resolve(projectRoot(), loadConfig().workspace_dir, "logs");
  await mkdir(dir, { recursive: true });
  await appendFile(join(dir, "errors.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...entry, known: Boolean(hintForError(entry.error)) }) + "\n", "utf8");
}

// ---- Phong cách học từ video đối thủ ----

export interface StyleProfile {
  name: string;
  summary: string;
  source: string;
  learnedAt: string;
  stats: { durationSec: number; aspectRatio: string; shots: number; avgShotSec: number; cutsPerMinute: number; wordsPerSecond?: number };
  transcript: string;
  analysis: Record<string, unknown>; // hook, cấu trúc, giọng văn, nhịp, chuyển cảnh, chữ trên màn hình...
  rules: { script: string[]; edit: string[] };
}

export function listStyles(dir = knowledgeDir()): string[] {
  const d = join(dir, "styles");
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => basename(f, ".json")) : [];
}

export function loadStyle(name: string, dir = knowledgeDir()): StyleProfile | undefined {
  if (!/^[\w-]+$/.test(name)) throw new Error(`Tên phong cách không hợp lệ: ${name}`);
  const file = join(dir, "styles", `${name}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
}

export async function saveStyle(profile: StyleProfile, dir = knowledgeDir()): Promise<string> {
  if (!/^[\w-]+$/.test(profile.name)) throw new Error(`Tên phong cách không hợp lệ: ${profile.name}`);
  await mkdir(join(dir, "styles"), { recursive: true });
  const file = join(dir, "styles", `${profile.name}.json`);
  await writeFile(file, JSON.stringify(profile, null, 2) + "\n", "utf8");
  return file;
}
