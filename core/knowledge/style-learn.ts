import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { projectRoot } from "../config/index.ts";
import type { AsrProvider, LlmProvider, Transcript } from "../contracts/providers.ts";
import { extractAudio } from "../media/audio.ts";
import { probe } from "../media/probe.ts";
import { detectSceneCuts, extractKeyframes, shotsFromCuts } from "../media/scenes.ts";
import { extractJson, fillTemplate } from "../planner/json.ts";
import { knowledgeDir, saveStyle, type StyleProfile } from "./lessons.ts";

const round = (n: number) => Math.round(n * 100) / 100;

// Gom từ thành câu có thời gian, ngắt khi người nói ngừng lâu, cho prompt dễ đọc
export function transcriptLines(t: Transcript, pauseSec = 0.6): string[] {
  const lines: string[] = [];
  let cur: { start: number; end: number; words: string[] } | null = null;
  for (const w of t.words) {
    if (cur && (w.start - cur.end > pauseSec || cur.words.length >= 20)) {
      lines.push(`[${cur.start.toFixed(1)}-${cur.end.toFixed(1)}] ${cur.words.join(" ")}`);
      cur = null;
    }
    if (!cur) cur = { start: w.start, end: w.end, words: [] };
    cur.words.push(w.text);
    cur.end = w.end;
  }
  if (cur) lines.push(`[${cur.start.toFixed(1)}-${cur.end.toFixed(1)}] ${cur.words.join(" ")}`);
  return lines;
}

const asList = (v: unknown, max = 10) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);

// Học phong cách từ một video mẫu: đo cảnh, tách lời, lấy khung hình, nhờ Claude phân tích, lưu knowledge/styles/<tên>.json.
// Video mẫu không bị sửa; file tạm nằm trong workDir.
export async function learnStyle(opts: {
  video: string;
  name: string;
  workDir: string;
  llm: LlmProvider;
  asr?: AsrProvider; // không có thì bỏ qua phần lời nói
  language: string;
  source?: string; // ghi lại nguồn (tên file, link Drive)
  note?: string;
  knowledge?: string;
}): Promise<{ profile: StyleProfile; file: string }> {
  if (!/^[\w-]+$/.test(opts.name)) throw new Error(`Tên phong cách chỉ gồm chữ không dấu, số, gạch ngang: "${opts.name}"`);
  await mkdir(opts.workDir, { recursive: true });

  const info = await probe(opts.video);
  const cuts = await detectSceneCuts(opts.video);
  const shots = shotsFromCuts(cuts, info.durationSec);
  const frames = await extractKeyframes(opts.video, shots, opts.workDir);

  let transcript: Transcript = { language: opts.language, text: "", words: [] };
  if (info.hasAudio && opts.asr) {
    const audio = join(opts.workDir, "audio.mp3");
    await extractAudio(opts.video, audio);
    transcript = await opts.asr.transcribe(audio, { language: opts.language });
    await writeFile(join(opts.workDir, "transcript.json"), JSON.stringify(transcript, null, 2), "utf8");
  }
  const spoken = transcript.words.length ? transcript.words[transcript.words.length - 1].end - transcript.words[0].start : 0;
  const stats: StyleProfile["stats"] = {
    durationSec: round(info.durationSec),
    aspectRatio: info.aspectRatio,
    shots: shots.length,
    avgShotSec: round(info.durationSec / Math.max(1, shots.length)),
    cutsPerMinute: round((cuts.length / Math.max(1, info.durationSec)) * 60),
    ...(spoken > 1 ? { wordsPerSecond: round(transcript.words.length / spoken) } : {}),
  };

  const template = await readFile(resolve(projectRoot(), "prompts/learning/style.md"), "utf8");
  const prompt = fillTemplate(template, {
    aspect: stats.aspectRatio,
    duration: String(stats.durationSec),
    shots: String(stats.shots),
    avg_shot: String(stats.avgShotSec),
    cuts_per_minute: String(stats.cutsPerMinute),
    wps: stats.wordsPerSecond ? `${stats.wordsPerSecond} từ/giây` : "không có lời nói hoặc chưa tách lời",
    shot_list: shots.slice(0, 80).map((s) => `${s.start}-${s.end}`).join(", "),
    transcript: transcriptLines(transcript).join("\n") || "(không có)",
    note: opts.note?.trim() || "(không có)",
    frame_times: frames.map((f) => `${f.at}s`).join(", ") || "(không có ảnh)",
  });

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = await opts.llm.complete(lastError ? `${prompt}\n\n## Lần trước trả sai, sửa lại\n${lastError}` : prompt, { images: frames.map((f) => f.file) });
    try {
      const raw = extractJson(answer);
      const rules = { script: asList(raw.rules?.script), edit: asList(raw.rules?.edit) };
      if (!rules.script.length && !rules.edit.length) throw new Error("thiếu rules.script và rules.edit");
      const profile: StyleProfile = {
        name: opts.name,
        summary: String(raw.summary ?? "").trim(),
        source: opts.source ?? "",
        learnedAt: new Date().toISOString(),
        stats,
        transcript: transcript.text,
        analysis: typeof raw.analysis === "object" && raw.analysis ? raw.analysis : {},
        rules,
      };
      const file = await saveStyle(profile, opts.knowledge ?? knowledgeDir());
      return { profile, file };
    } catch (err) {
      lastError = (err as Error).message;
    }
  }
  throw new Error(`Claude phân tích video không hợp lệ 2 lần: ${lastError}`);
}

// Tin nhắn tóm tắt cho người dùng
export function styleSummary(p: StyleProfile): string {
  const a = p.analysis as Record<string, any>;
  const lines = [
    `🎓 Đã học phong cách "${p.name}": ${p.summary}`,
    `${p.stats.aspectRatio}, ${p.stats.durationSec}s, ${p.stats.shots} cảnh (TB ${p.stats.avgShotSec}s/cảnh)${p.stats.wordsPerSecond ? `, nói ${p.stats.wordsPerSecond} từ/giây` : ""}`,
  ];
  if (a.hook) lines.push(`Hook: ${a.hook}`);
  if (a.transitions) lines.push(`Chuyển cảnh: ${a.transitions}`);
  if (p.rules.script.length) lines.push(`\nKịch bản:\n${p.rules.script.map((r) => `• ${r}`).join("\n")}`);
  if (p.rules.edit.length) lines.push(`\nEdit:\n${p.rules.edit.map((r) => `• ${r}`).join("\n")}`);
  const tips = asList(a.shooting_tips, 5);
  if (tips.length) lines.push(`\nGợi ý khi quay:\n${tips.map((r) => `• ${r}`).join("\n")}`);
  lines.push(`\nDùng: thêm style:${p.name} vào lệnh, ví dụ /ads style:${p.name} làm nổi giá`);
  return lines.join("\n");
}
