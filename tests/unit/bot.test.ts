import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommand } from "../../bot/commands.ts";
import { parseDriveRef, safeFileName } from "../../integrations/storage/google-drive/index.ts";
import { SerialQueue } from "../../core/queue/queue.ts";
import { parseDetections, parseLoudness } from "../../core/qa/video-qa.ts";

test("parseCommand đọc lệnh, link và yêu cầu", () => {
  assert.deepEqual(parseCommand("/ads https://drive.google.com/file/d/abc123XYZ_-/view làm nổi giá 199k"), {
    kind: "job", workflow: "shop-ads", source: "https://drive.google.com/file/d/abc123XYZ_-/view", text: "làm nổi giá 199k",
  });
  assert.deepEqual(parseCommand("/ads"), { kind: "job", workflow: "shop-ads", source: "", text: "" });
  assert.deepEqual(parseCommand("/faceless@video_bot Giới thiệu túi da"), { kind: "job", workflow: "faceless", source: "", text: "Giới thiệu túi da" });
  const dub = parseCommand("/dub https://drive.google.com/x?id=1234567890ab\nCâu một.\nCâu hai.");
  assert.equal(dub.kind === "job" && dub.text, "Câu một.\nCâu hai.");
  assert.deepEqual(parseCommand("/retry 20261026-1-ab"), { kind: "retry", jobId: "20261026-1-ab" });
  assert.equal(parseCommand("/help").kind, "help");
  assert.equal(parseCommand("xin chào").kind, "unknown");
  assert.equal(parseCommand("/xoa").kind, "unknown");
});

test("parseDriveRef nhận đủ kiểu link Drive", () => {
  assert.equal(parseDriveRef("https://drive.google.com/file/d/1AbC-def_GHIjkl/view?usp=sharing"), "1AbC-def_GHIjkl");
  assert.equal(parseDriveRef("https://drive.google.com/drive/folders/1FolderIdXYZ123"), "1FolderIdXYZ123");
  assert.equal(parseDriveRef("https://drive.google.com/open?id=1OpenIdABCDEF"), "1OpenIdABCDEF");
  assert.equal(parseDriveRef("1BareIdABCDEFG"), "1BareIdABCDEFG");
  assert.equal(parseDriveRef(""), null);
  assert.throws(() => parseDriveRef("https://example.com/video.mp4"), /Không đọc được link/);
});

test("safeFileName bỏ ký tự cấm trên Windows và đường dẫn", () => {
  assert.equal(safeFileName('../../a:b*c?.mp4'), "_.._a_b_c_.mp4");
  assert.equal(safeFileName("Túi xách đẹp.mp4"), "Túi xách đẹp.mp4");
  assert.equal(safeFileName(""), "video.mp4");
});

test("SerialQueue chạy lần lượt, lỗi không chặn job sau", async () => {
  const q = new SerialQueue();
  const order: string[] = [];
  const a = q.push(async () => { await new Promise((r) => setTimeout(r, 30)); order.push("a"); });
  const b = q.push(async () => { order.push("b"); throw new Error("x"); });
  const c = q.push(async () => { order.push("c"); });
  await a; await assert.rejects(b); await c;
  assert.deepEqual(order, ["a", "b", "c"]);
});

test("đọc log blackdetect, freezedetect, ebur128", () => {
  assert.deepEqual(parseDetections("[blackdetect @ 0x] black_start:0 black_end:2.04 black_duration:2.04", "black"), [{ start: 0, end: 2.04 }]);
  assert.deepEqual(parseDetections("lavfi.freezedetect.freeze_start: 1.5\nlavfi.freezedetect.freeze_end: 5", "freeze"), [{ start: 1.5, end: 5 }]);
  assert.equal(parseLoudness("  Integrated loudness:\n    I:         -16.2 LUFS\n"), -16.2);
  assert.equal(parseLoudness("  Integrated loudness:\n    I:         -inf LUFS\n"), -Infinity);
});

test("tin nhắn duyệt kịch bản hiện điểm hook tự chấm", async () => {
  const { scriptMessage } = await import("../../bot/bot.ts");
  const msg = scriptMessage("Câu 1.", { words: 2, estimatedSec: 1, issues: [] }, { type: "Gọi đúng người", score: 8, question: "Loa này hít có chắc không?" });
  assert.match(msg, /Hook: Gọi đúng người · 8\/10/);
  assert.match(msg, /Loa này hít có chắc không\?/);
});
