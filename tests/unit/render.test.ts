import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEdit } from "../../core/render/edit-spec.ts";
import { loadCaptionStyle, outputSize } from "../../core/render/render.ts";

test("validateEdit nhận edit.json hợp lệ", () => {
  const spec = validateEdit({ video: "a.mp4", overlays: [{ text: "SALE", start: 1, end: 2, position: "top" }], sfx: [{ file: "pop.mp3", at: 1 }] });
  assert.equal(spec.video, "a.mp4");
});

test("validateEdit liệt kê đủ lỗi bằng tiếng Việt", () => {
  assert.throws(
    () => validateEdit({ overlays: [{ text: "", start: 3, end: 2, position: "left" }], sfx: [{ at: -1 }], music: { volume: 5 } }),
    (err: Error) => {
      for (const s of ["video phải là chuỗi", "overlays[0].text", "overlays[0].end phải lớn hơn start", "overlays[0].position", "sfx[0].file", "sfx[0].at", "music.file", "music.volume"]) {
        assert.ok(err.message.includes(s), `thiếu lỗi: ${s}\n${err.message}`);
      }
      return true;
    },
  );
});

test("validateEdit chặn tên preset có ký tự đường dẫn", () => {
  assert.throws(() => validateEdit({ video: "a.mp4", captionStyle: "../../etc" }), /captionStyle/);
});

test("outputSize giới hạn cạnh ngắn và luôn chẵn", () => {
  assert.deepEqual(outputSize(2160, 3840, 1080), { width: 1080, height: 1920 });
  assert.deepEqual(outputSize(720, 1280, 1080), { width: 720, height: 1280 });
  assert.deepEqual(outputSize(1081, 1921, 1080), { width: 1080, height: 1920 });
  assert.deepEqual(outputSize(3840, 2160, 1080), { width: 1920, height: 1080 });
});

test("loadCaptionStyle nạp preset, none thì không in phụ đề", async () => {
  const tiktok = await loadCaptionStyle("tiktok");
  assert.equal(tiktok?.uppercase, true);
  assert.equal(await loadCaptionStyle("none"), null);
  await assert.rejects(loadCaptionStyle("khong-co"), /Không có preset/);
});

test("validateEdit: overlay giá và zoom", () => {
  validateEdit({ video: "a.mp4", overlays: [{ kind: "price", was: 299000, now: 199000, start: 1, end: 4 }], zooms: [{ start: 1, end: 2, scale: 1.1 }] });
  assert.throws(
    () => validateEdit({ video: "a.mp4", overlays: [{ kind: "price", was: 100, now: 200, start: 1, end: 2 }, { kind: "gif", text: "x", start: 1, end: 2 }], zooms: [{ start: 3, end: 2, scale: 5 }] }),
    (err: Error) => ["now phải nhỏ hơn was", "kind", "zooms[0].end", "zooms[0].scale"].every((s) => err.message.includes(s)),
  );
});

test("sheetTimes chụp mở đầu, giữa và cuối, không vượt độ dài", async () => {
  const { sheetTimes } = await import("../../core/qa/contact-sheet.ts");
  assert.deepEqual(sheetTimes(20), [0.3, 1.5, 5, 10, 15, 19.8]);
  assert.ok(sheetTimes(1).every((t) => t >= 0 && t < 1));
});
