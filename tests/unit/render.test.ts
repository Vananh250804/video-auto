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
