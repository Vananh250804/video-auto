import { existsSync, readFileSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { projectRoot } from "../config/index.ts";
import { ffmpegBin, run } from "../media/ffmpeg.ts";
import { elevenlabsAudio } from "../../integrations/elevenlabs-client.ts";

export interface SfxEntry {
  group: string;
  name: string;
  duration: number;
  prompt: string;
  use: string;
  file: string; // assets/sfx/<group>-<name>.mp3
}

const CATALOG = "assets/sfx/catalog.yaml";

export function loadSfxCatalog(): SfxEntry[] {
  const abs = resolve(projectRoot(), CATALOG);
  if (!existsSync(abs)) return [];
  const raw = parse(readFileSync(abs, "utf8")) ?? {};
  return Object.entries(raw).flatMap(([group, items]: [string, any]) =>
    Object.entries(items ?? {}).map(([name, v]: [string, any]) => ({
      group,
      name,
      duration: Number(v.duration),
      prompt: String(v.prompt),
      use: String(v.use ?? ""),
      file: `assets/sfx/${group}-${name}.mp3`,
    })),
  );
}

// Danh sách cho prompt edit-planner: "đường dẫn (khi nào dùng)". File không có trong danh mục vẫn liệt kê.
export function describeSfxFiles(files: string[]): string {
  const uses = new Map(loadSfxCatalog().map((e) => [e.file, e.use]));
  return files.map((f) => (uses.get(f) ? `\n  - ${f}: ${uses.get(f)}` : `\n  - ${f}`)).join("");
}

// Gọi ElevenLabs Sound Effects, mỗi lần gọi tốn credit. Kết quả đã cắt lặng và chuẩn hóa đỉnh.
export async function generateSfx(entry: SfxEntry, outFile: string, opts: { model: string; promptInfluence: number }): Promise<void> {
  const audio = await elevenlabsAudio("/sound-generation?output_format=mp3_44100_192", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: entry.prompt,
      duration_seconds: Math.min(30, Math.max(0.5, entry.duration)),
      prompt_influence: opts.promptInfluence,
      model_id: opts.model,
    }),
  });
  const rawFile = `${outFile}.raw.mp3`;
  await writeFile(rawFile, audio);
  await finishSfx(rawFile, outFile);
  await rm(rawFile, { force: true });
}

const TRIM = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01";

// Bỏ khoảng lặng đầu/cuối để sfx vang đúng thời điểm `at`, rồi đưa đỉnh về -1 dBFS.
export async function finishSfx(input: string, output: string): Promise<void> {
  const trim = `${TRIM},areverse,${TRIM},areverse`;
  const { stderr } = await run(ffmpegBin(), ["-hide_banner", "-i", input, "-af", `${trim},volumedetect`, "-f", "null", "-"]);
  const peak = Number(/max_volume:\s*(-?[\d.]+) dB/.exec(stderr)?.[1] ?? 0);
  const gain = Math.round((-1 - peak) * 10) / 10;
  await run(ffmpegBin(), [
    "-hide_banner", "-y", "-i", input,
    "-af", `${trim},volume=${gain}dB`,
    "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k",
    output,
  ]);
}
