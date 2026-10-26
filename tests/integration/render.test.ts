import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegBin, run } from "../../core/media/ffmpeg.ts";
import { probe } from "../../core/media/probe.ts";
import { renderEdit } from "../../core/render/render.ts";

// Render thật bằng Remotion (lần đầu Remotion tự tải Chrome Headless Shell)
let dir = "";

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "video-auto-render-"));
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=25:duration=2", "-f", "lavfi", "-i", "sine=frequency=300:duration=2", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", join(dir, "ngang.mp4")]);
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "sine=frequency=1200:duration=0.2", join(dir, "pop.mp3")]);
  await writeFile(join(dir, "captions.json"), JSON.stringify([
    { start: 0, end: 1.5, text: "Xin chào Việt Nam", words: [{ text: "Xin", start: 0, end: 0.3 }, { text: "chào", start: 0.3, end: 0.7 }, { text: "Việt", start: 0.7, end: 1 }, { text: "Nam", start: 1, end: 1.4 }] },
  ]));
});

test("render video ngang 16:9 với phụ đề, chữ highlight, sfx", { timeout: 300_000 }, async () => {
  const out = join(dir, "out.mp4");
  const result = await renderEdit({
    video: join(dir, "ngang.mp4"),
    captions: join(dir, "captions.json"),
    captionStyle: "box",
    overlays: [{ text: "MỚI VỀ", start: 0.5, end: 1.8, position: "center" }],
    sfx: [{ file: join(dir, "pop.mp3"), at: 0.5 }],
  }, out);
  assert.equal(result.template, "landscape-16x9");
  const info = await probe(out);
  assert.equal(info.width, 640);
  assert.equal(info.height, 360);
  assert.ok(info.hasAudio);
  assert.ok(Math.abs(info.durationSec - 2) < 0.15, `độ dài ${info.durationSec}`);
});

test("render báo lỗi rõ khi thiếu file sfx", async () => {
  await assert.rejects(
    renderEdit({ video: join(dir, "ngang.mp4"), sfx: [{ file: join(dir, "khong-co.mp3"), at: 0 }] }, join(dir, "x.mp4")),
    /Không tìm thấy sfx/,
  );
});
