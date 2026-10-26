import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegBin, run } from "../../core/media/ffmpeg.ts";
import { probe } from "../../core/media/probe.ts";
import { cutSilences } from "../../core/media/cut.ts";

let dir = "";
let sample = "";

// Video dọc 9:16 dài 6s: tiếng 0-2s, lặng 2-4s, tiếng 4-6s
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "video-auto-"));
  sample = join(dir, "mẫu dọc.mp4");
  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    "-f", "lavfi", "-i", "testsrc2=size=540x960:rate=30:duration=6",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
    "-af", "volume=enable='between(t,2,4)':volume=0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
    sample,
  ]);
});

test("probe nhận video dọc 9:16", async () => {
  const info = await probe(sample);
  assert.equal(info.aspectRatio, "9:16");
  assert.equal(info.orientation, "portrait");
  assert.equal(info.width, 540);
  assert.equal(info.hasAudio, true);
  assert.ok(Math.abs(info.durationSec - 6) < 0.1);
});

test("cut bỏ khoảng lặng 2s ở giữa", async () => {
  const out = join(dir, "cut.mp4");
  const result = await cutSilences(sample, out);
  assert.equal(result.segments.length, 2);
  const info = await probe(out);
  assert.ok(info.durationSec > 4 && info.durationSec < 4.6, `độ dài sau cắt: ${info.durationSec}`);
  assert.equal(info.aspectRatio, "9:16");
});

test("probe tính cả xoay của video quay dọc bằng điện thoại", async () => {
  const landscape = join(dir, "ngang.mp4");
  const rotated = join(dir, "xoay.mp4");
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "testsrc2=size=960x540:rate=30:duration=1", "-c:v", "libx264", landscape]);
  await run(ffmpegBin(), ["-hide_banner", "-y", "-display_rotation", "90", "-i", landscape, "-c", "copy", rotated]);
  const info = await probe(rotated);
  assert.equal(info.rotation, 90);
  assert.equal(info.aspectRatio, "9:16");
  assert.equal(info.hasAudio, false);
});
