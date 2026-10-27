import { test, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lessonsForPrompt } from "../../core/knowledge/lessons.ts";
import { learnStyle } from "../../core/knowledge/style-learn.ts";
import { ffmpegBin, run } from "../../core/media/ffmpeg.ts";
import { detectSceneCuts } from "../../core/media/scenes.ts";

let dir = "";
let sample = "";

// Video dọc 6s gồm 3 cảnh màu khác nhau: 0-2s đỏ, 2-4s xanh, 4-6s trắng
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "style-"));
  sample = join(dir, "đối thủ.mp4");
  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    "-f", "lavfi", "-i", "color=c=red:size=360x640:rate=30:duration=2",
    "-f", "lavfi", "-i", "color=c=blue:size=360x640:rate=30:duration=2",
    "-f", "lavfi", "-i", "color=c=white:size=360x640:rate=30:duration=2",
    "-filter_complex", "[0][1][2]concat=n=3:v=1:a=0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    sample,
  ]);
});

test("dò được 2 điểm chuyển cảnh", async () => {
  const cuts = await detectSceneCuts(sample);
  assert.equal(cuts.length, 2);
  assert.ok(Math.abs(cuts[0] - 2) < 0.1 && Math.abs(cuts[1] - 4) < 0.1);
});

test("learnStyle: gửi số liệu + ảnh cho Claude, lưu phong cách, dùng được trong prompt", async () => {
  const knowledge = await mkdtemp(join(tmpdir(), "style-knowledge-"));
  let prompt = "";
  let images: string[] = [];
  const llm = {
    name: "fake",
    complete: async (p: string, opts?: { images?: string[] }) => {
      prompt = p;
      images = opts?.images ?? [];
      return JSON.stringify({ summary: "cắt nhanh", analysis: { hook: "màu nổi" }, rules: { script: ["Câu ngắn."], edit: ["Chữ highlight mỗi cảnh."] } });
    },
  };
  const { profile, file } = await learnStyle({ video: sample, name: "doi-thu-a", workDir: join(dir, "work"), llm, language: "vi", knowledge });
  assert.match(prompt, /3 cảnh, trung bình 2 giây\/cảnh/);
  assert.equal(images.length, 3);
  assert.ok(images.every((f) => existsSync(f)));
  assert.equal(profile.stats.shots, 3);
  assert.equal(profile.stats.aspectRatio, "9:16");
  assert.equal(JSON.parse(readFileSync(file, "utf8")).summary, "cắt nhanh");
  assert.match(await lessonsForPrompt("edit", { style: "doi-thu-a", dir: knowledge }), /Chữ highlight mỗi cảnh/);
  assert.ok(existsSync(sample), "video mẫu không bị đụng tới");
});
