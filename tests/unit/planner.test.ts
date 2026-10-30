import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, fillTemplate } from "../../core/planner/json.ts";
import { sanitizePlan } from "../../core/planner/edit-planner.ts";
import { loadWorkflow, listWorkflows } from "../../core/planner/workflows.ts";
import { checkScript, countWords } from "../../core/review/script-checks.ts";

const ctx = {
  duration: 10,
  captionStyles: ["tiktok", "box", "karaoke"],
  sfxFiles: ["assets/sfx/pop.mp3"],
  musicFiles: ["assets/music/vui.mp3"],
  defaults: { captionStyle: "tiktok", originalVolume: 1 },
};

test("extractJson đọc được JSON có lời dẫn và ```json", () => {
  assert.deepEqual(extractJson('Đây là kế hoạch:\n```json\n{"a": 1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('ok {"a": {"b": 2}} xong'), { a: { b: 2 } });
  assert.throws(() => extractJson("không có gì"), /Không tìm thấy JSON/);
});

test("fillTemplate thay biến", () => {
  assert.equal(fillTemplate("Xin {{name}}, {{missing}}!", { name: "chào" }), "Xin chào, !");
});

test("sanitizePlan kẹp thời gian, bỏ file và preset lạ", () => {
  const { plan, dropped } = sanitizePlan({
    captionStyle: "neon",
    originalVolume: 3,
    overlays: [
      { text: "SALE 50%", start: 1, end: 3, position: "left" },
      { text: "Cuối", start: 9, end: 15 },
      { text: "Sai", start: 5, end: 4 },
    ],
    sfx: [{ file: "assets/sfx/pop.mp3", at: 1 }, { file: "C:/Windows/a.wav", at: 2 }],
    music: { file: "assets/music/vui.mp3", volume: 0.9 },
  }, ctx);
  assert.equal(plan.captionStyle, "tiktok");
  assert.equal(plan.originalVolume, 1);
  assert.deepEqual(plan.overlays, [
    { text: "SALE 50%", start: 1, end: 3, position: "top" },
    { text: "Cuối", start: 9, end: 10, position: "top" },
  ]);
  assert.deepEqual(plan.sfx, [{ file: "assets/sfx/pop.mp3", at: 1, volume: 1 }]);
  assert.deepEqual(plan.music, { file: "assets/music/vui.mp3", volume: 0.4 });
  assert.equal(dropped.length, 3);
});

test("workflow mặc định có đủ 3 loại", () => {
  assert.deepEqual(listWorkflows().sort(), ["dubbing", "faceless", "shop-ads"]);
  assert.ok(loadWorkflow("faceless").steps.includes("script"));
  assert.throws(() => loadWorkflow("../x"), /không hợp lệ/);
});

test("checkScript ước lượng độ dài và bắt lỗi số tiền, từ cấm", () => {
  const text = "Túi xách tốt nhất thị trường, giá chỉ 299k. Còn bản cao cấp 1tr thôi!";
  const r = checkScript(text, { targetSec: 30, wordsPerSecond: 3.2 });
  assert.equal(r.words, countWords(text));
  const msgs = r.issues.map((i) => i.message).join("\n");
  assert.match(msgs, /"299k" nên viết "299 nghìn"/);
  assert.match(msgs, /"1tr" nên viết "1 triệu"/);
  assert.match(msgs, /tốt nhất/);
  assert.ok(r.issues.some((i) => i.type === "length"));
});

test("checkScript không báo nhầm từ thường", () => {
  const r = checkScript("Sản phẩm có giá trị sử dụng lâu dài, mình rất thích.", { wordsPerSecond: 3.2 });
  assert.deepEqual(r.issues, []);
});

test("danh mục sfx đọc được và mô tả đi kèm file cho prompt", async () => {
  const { loadSfxCatalog, describeSfxFiles } = await import("../../core/audio/sfx.ts");
  const catalog = loadSfxCatalog();
  assert.ok(catalog.length > 0);
  for (const e of catalog) {
    assert.match(e.file, /^assets\/sfx\/[a-z]+-[a-z0-9-]+\.mp3$/);
    assert.ok(e.duration >= 0.5 && e.duration <= 30, e.file);
    assert.ok(e.prompt && e.use, e.file);
  }
  const text = describeSfxFiles([catalog[0].file, "assets/sfx/la.wav"]);
  assert.ok(text.includes(`${catalog[0].file}: ${catalog[0].use}`));
  assert.ok(text.includes("assets/sfx/la.wav"));
});

test("sanitizePlan: zoom bỏ cái ngắn/chồng, kẹp scale; overlay giá cần was > now", () => {
  const { plan, dropped } = sanitizePlan({
    overlays: [
      { kind: "price", was: 299000, now: 199000, start: 2, end: 5, position: "center" },
      { kind: "price", was: 100000, now: 150000, start: 6, end: 8 },
    ],
    zooms: [{ start: 4, end: 6, scale: 2 }, { start: 1, end: 3 }, { start: 5, end: 7 }, { start: 8, end: 8.3 }],
  }, ctx);
  assert.deepEqual(plan.overlays, [{ kind: "price", was: 299000, now: 199000, start: 2, end: 5, position: "center" }]);
  assert.deepEqual(plan.zooms, [{ start: 1, end: 3, scale: 1.12 }, { start: 4, end: 6, scale: 1.3 }]);
  assert.equal(dropped.length, 3);
});

test("gói đánh giá: khoảng không lời, câu đệm, giá, từ rủi ro, CTA", async () => {
  const { analyzeCaptions, transcriptMarkdown, frameTimes } = await import("../../core/review/video-pack.ts");
  const cap = (start: number, end: number, text: string) => ({ start, end, text, words: [] });
  const caps = [
    cap(0.5, 2, "Loa này chỉ 199k thôi anh em ạ"),
    cap(2, 4, "Nó của nhà Minifun, ngon vãi anh em ạ"),
    cap(10, 12, "Bấm giỏ hàng nhé, mình đảm bảo"),
  ];
  const s = analyzeCaptions(caps, 14);
  assert.deepEqual(s.gaps, [{ start: 4, end: 10, sec: 6 }, { start: 12, end: 14, sec: 2 }]);
  assert.deepEqual(s.priceMentions.map((p) => p.at), [0.5]); // "của" không bị nhầm là "củ"
  assert.deepEqual(s.ctaMentions.map((p) => p.at), [10]);
  assert.deepEqual(s.risky.map((r) => r.phrase).sort(), ["vãi", "đảm bảo"]);
  assert.deepEqual(s.fillers, [{ phrase: "anh em ạ", count: 2 }]);
  assert.match(transcriptMarkdown(caps, s), /N02 \[2\.00–4\.00\][^\n]*\n— không có lời 4\.00–10\.00 \(6s\) —\nN03/);
  assert.deepEqual(frameTimes(10), [0, 0.5, 1, 1.5, 2, 3, 6, 9, 9.9]);
});

test("reviewForPrompt chỉ lấy phần việc sửa của báo cáo", async () => {
  const { reviewForPrompt } = await import("../../core/planner/edit-planner.ts");
  const report = "# ĐÁNH GIÁ\n## Hook\nchi tiết dài\n## 3 việc sửa ưu tiên\n1. chữ từ 0s\n## Kết luận: CHỈNH_NHẸ\n";
  const out = reviewForPrompt(report);
  assert.ok(out.includes("chữ từ 0s") && out.includes("CHỈNH_NHẸ"));
  assert.ok(!out.includes("chi tiết dài"));
});
