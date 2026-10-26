import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyAspect, orientationOf } from "../../core/media/probe.ts";
import { DEFAULT_CUT_OPTIONS, keepSegments, parseSilenceLog } from "../../core/media/cut.ts";

test("classifyAspect nhận tỉ lệ chuẩn", () => {
  assert.equal(classifyAspect(1080, 1920), "9:16");
  assert.equal(classifyAspect(1920, 1080), "16:9");
  assert.equal(classifyAspect(1080, 1080), "1:1");
  assert.equal(classifyAspect(1080, 1350), "4:5");
  assert.equal(classifyAspect(720, 1280), "9:16");
  assert.equal(classifyAspect(886, 1920), "9:16"); // màn hình dài vẫn là 9:16
});

test("orientationOf", () => {
  assert.equal(orientationOf(1080, 1920), "portrait");
  assert.equal(orientationOf(1920, 1080), "landscape");
  assert.equal(orientationOf(1080, 1070), "square");
});

test("parseSilenceLog đọc log ffmpeg, kể cả lặng tới cuối", () => {
  const log = [
    "[silencedetect @ 0x1] silence_start: 2.5",
    "[silencedetect @ 0x1] silence_end: 4.1 | silence_duration: 1.6",
    "[silencedetect @ 0x1] silence_start: 9",
  ].join("\n");
  assert.deepEqual(parseSilenceLog(log), [
    { start: 2.5, end: 4.1 },
    { start: 9, end: Infinity },
  ]);
});

test("keepSegments đảo khoảng lặng, chừa padding, gộp và lọc đoạn ngắn", () => {
  const opts = { ...DEFAULT_CUT_OPTIONS, paddingSec: 0.1, minSegmentSec: 0.3 };
  const silences = [
    { start: 0, end: 1 },
    { start: 3, end: 5 },
    { start: 5.2, end: 7 }, // đoạn nói 5.0-5.2s, cộng padding thành 0.4s nên vẫn giữ
    { start: 9, end: Infinity },
  ];
  assert.deepEqual(keepSegments(silences, 10, opts), [
    { start: 0.9, end: 3.1 },
    { start: 4.9, end: 5.3 },
    { start: 6.9, end: 9.1 },
  ]);
});

test("keepSegments không có khoảng lặng thì giữ nguyên", () => {
  assert.deepEqual(keepSegments([], 5, DEFAULT_CUT_OPTIONS), [{ start: 0, end: 5 }]);
});
