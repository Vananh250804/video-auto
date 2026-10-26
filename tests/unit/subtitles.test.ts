import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaptions, toSrt, wordsFromCharAlignment } from "../../core/subtitles/captions.ts";
import { toTranscript } from "../../integrations/asr/elevenlabs/index.ts";

const opts = { maxCharsPerLine: 32, maxDurationSec: 3.5, pauseBreakSec: 0.45 };
const w = (text: string, start: number, end: number) => ({ text, start, end });

test("wordsFromCharAlignment gom ký tự thành từ tiếng Việt", () => {
  const chars = [..."Xin chào,  bạn!"];
  const starts = chars.map((_, i) => i * 0.1);
  const ends = chars.map((_, i) => i * 0.1 + 0.1);
  const words = wordsFromCharAlignment(chars, starts, ends);
  assert.deepEqual(words.map((x) => x.text), ["Xin", "chào,", "bạn!"]);
  assert.equal(words[1].start, 0.4);
  assert.ok(Math.abs(words[1].end - 0.9) < 1e-9);
});

test("buildCaptions ngắt sau dấu chấm câu", () => {
  const caps = buildCaptions([w("Chào", 0, 0.3), w("bạn.", 0.3, 0.6), w("Mua", 0.7, 0.9), w("ngay!", 0.9, 1.2)], opts);
  assert.deepEqual(caps.map((c) => c.text), ["Chào bạn.", "Mua ngay!"]);
  assert.equal(caps[0].end, 0.7); // lấp khoảng trống ngắn
});

test("buildCaptions ngắt khi người nói ngừng lâu", () => {
  const caps = buildCaptions([w("một", 0, 0.3), w("hai", 1.5, 1.8)], opts);
  assert.equal(caps.length, 2);
  assert.equal(caps[0].end, 0.3);
});

test("buildCaptions không vượt số ký tự mỗi dòng", () => {
  const words = "sản phẩm này đang giảm giá cực sốc chỉ hôm nay thôi các bạn ơi".split(" ").map((t, i) => w(t, i * 0.2, i * 0.2 + 0.2));
  const caps = buildCaptions(words, opts);
  assert.ok(caps.length >= 2);
  for (const c of caps) assert.ok(c.text.length <= 32, c.text);
  assert.equal(caps.map((c) => c.text).join(" "), words.map((x) => x.text).join(" "));
});

test("toSrt đúng định dạng", () => {
  const srt = toSrt([{ start: 0, end: 1.5, text: "Xin chào", words: [] }, { start: 61.25, end: 3725.007, text: "Hết", words: [] }]);
  assert.equal(srt, "1\n00:00:00,000 --> 00:00:01,500\nXin chào\n\n2\n00:01:01,250 --> 01:02:05,007\nHết\n");
});

test("toTranscript chỉ giữ từ, bỏ khoảng trắng và tiếng động", () => {
  const t = toTranscript({
    language_code: "vie",
    text: "Xin chào",
    words: [
      { text: "Xin", start: 0.1, end: 0.3, type: "word" },
      { text: " ", start: 0.3, end: 0.35, type: "spacing" },
      { text: "(cười)", start: 0.35, end: 0.6, type: "audio_event" },
      { text: "chào", start: 0.6, end: 0.9, type: "word" },
    ],
  }, "vi");
  assert.deepEqual(t.words, [w("Xin", 0.1, 0.3), w("chào", 0.6, 0.9)]);
});
