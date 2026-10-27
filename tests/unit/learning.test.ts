import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCommand } from "../../bot/commands.ts";
import { addLessons, hintForError, learnFromFeedback, lessonsForPrompt, loadLessons, removeLesson } from "../../core/knowledge/lessons.ts";
import { transcriptLines } from "../../core/knowledge/style-learn.ts";
import { parseSceneTimes, shotsFromCuts } from "../../core/media/scenes.ts";
import { parseEnv, runChecks } from "../../scripts/doctor.mjs";

const tmp = () => mkdtemp(join(tmpdir(), "knowledge-"));

test("parseCommand: /sua, /baihoc, /quen, /hocvideo, style:", () => {
  assert.deepEqual(parseCommand("/sua 20261027-091500-ab12 chữ to hơn"), { kind: "fix", jobId: "20261027-091500-ab12", request: "chữ to hơn" });
  assert.deepEqual(parseCommand("/sua bỏ nhạc nền"), { kind: "fix", request: "bỏ nhạc nền" });
  assert.deepEqual(parseCommand("/baihoc"), { kind: "lessons" });
  assert.deepEqual(parseCommand("/quen a1b2c3"), { kind: "forget", lessonId: "a1b2c3" });
  assert.deepEqual(parseCommand("/hocvideo doi-thu-a https://drive.google.com/file/d/abc/view học hook"), { kind: "learn", name: "doi-thu-a", source: "https://drive.google.com/file/d/abc/view", note: "học hook" });
  assert.deepEqual(parseCommand("/hocvideo doi-thu-a"), { kind: "learn", name: "doi-thu-a", source: "", note: "" });
  assert.deepEqual(parseCommand("/ads style:doi-thu-a làm nổi giá"), { kind: "job", workflow: "shop-ads", source: "", text: "làm nổi giá", style: "doi-thu-a" });
  const dub = parseCommand("/dub style:x\nCâu một.\nCâu hai.");
  assert.equal(dub.kind === "job" && dub.text, "Câu một.\nCâu hai.");
});

test("bài học: thêm, bỏ trùng, lọc theo workflow, xóa", async () => {
  const dir = await tmp();
  const added = await addLessons([
    { scope: "edit", rule: "Chữ highlight nền vàng chữ đen.", source: "manual" },
    { scope: "edit", rule: "chữ highlight  nền vàng, chữ đen", source: "manual" },
    { scope: "script", rule: "Hook dưới 10 từ.", source: "manual", workflow: "faceless" },
  ], dir);
  assert.equal(added.length, 2);
  assert.match(await lessonsForPrompt("edit", { workflow: "shop-ads", dir }), /nền vàng chữ đen/);
  assert.equal(await lessonsForPrompt("script", { workflow: "shop-ads", dir }), "");
  assert.match(await lessonsForPrompt("script", { workflow: "faceless", dir }), /Hook dưới 10 từ/);
  assert.ok(await removeLesson(added[0].id, dir));
  assert.equal((await loadLessons(dir)).length, 1);
});

test("phong cách đã học được chèn vào prompt, tên lạ thì báo lỗi", async () => {
  const dir = await tmp();
  await mkdir(join(dir, "styles"));
  await writeFile(join(dir, "styles", "doi-thu-a.json"), JSON.stringify({ name: "doi-thu-a", summary: "nhanh, hài", rules: { script: ["Mở đầu bằng câu hỏi."], edit: ["Chữ highlight mỗi 3 giây."] } }));
  assert.match(await lessonsForPrompt("script", { style: "doi-thu-a", dir }), /doi-thu-a[\s\S]*Mở đầu bằng câu hỏi/);
  assert.doesNotMatch(await lessonsForPrompt("script", { style: "doi-thu-a", dir }), /mỗi 3 giây/);
  await assert.rejects(lessonsForPrompt("edit", { style: "khong-co", dir }), /Chưa có phong cách/);
});

test("learnFromFeedback lưu quy tắc Claude rút ra, gắn workflow nếu không áp dụng chung", async () => {
  const dir = await tmp();
  let prompt = "";
  const llm = { name: "fake", complete: async (p: string) => { prompt = p; return '```json\n{"rules":[{"rule":"Không dùng nhạc nền.","all_workflows":true},{"rule":"Câu kết rủ bấm giỏ hàng.","all_workflows":false}]}\n```'; } };
  const added = await learnFromFeedback({ llm, scope: "script", workflow: "faceless", feedback: "bỏ nhạc, kết rủ mua", context: "Bản cũ.", dir });
  assert.match(prompt, /bỏ nhạc, kết rủ mua/);
  assert.deepEqual(added.map((l) => [l.rule, l.workflow]), [["Không dùng nhạc nền.", undefined], ["Câu kết rủ bấm giỏ hàng.", "faceless"]]);
});

test("hintForError khớp lỗi đã biết trong knowledge/known-errors.json", () => {
  assert.match(hintForError("Google Drive 403: Google Drive API has not been used in project 123")!, /Enable/);
  assert.match(hintForError('Không tìm thấy lệnh "claude". Cài Claude Code')!, /CLAUDE_PATH/);
  assert.equal(hintForError("lỗi gì đó chưa gặp"), undefined);
});

test("đọc điểm chuyển cảnh, chia cảnh, gộp cảnh quá ngắn", () => {
  const log = "[Parsed_showinfo_1 @ 0x] n:0 pts:45000 pts_time:1.5 duration:3000\n[Parsed_showinfo_1 @ 0x] n:1 pts:90000 pts_time:3.0 duration:3000\nn:2 pts_time:3.1";
  assert.deepEqual(parseSceneTimes(log), [1.5, 3, 3.1]);
  assert.deepEqual(shotsFromCuts([1.5, 3, 3.1], 5), [{ start: 0, end: 1.5 }, { start: 1.5, end: 3.1 }, { start: 3.1, end: 5 }]);
  assert.deepEqual(shotsFromCuts([], 4), [{ start: 0, end: 4 }]);
});

test("transcriptLines gom từ thành câu theo khoảng ngừng", () => {
  const words = [{ text: "Chào", start: 0, end: 0.3 }, { text: "các", start: 0.35, end: 0.5 }, { text: "bạn", start: 0.55, end: 0.8 }, { text: "Hôm", start: 2, end: 2.2 }, { text: "nay", start: 2.25, end: 2.5 }];
  assert.deepEqual(transcriptLines({ language: "vi", text: "", words }), ["[0.0-0.8] Chào các bạn", "[2.0-2.5] Hôm nay"]);
});

test("doctor: đọc .env, báo thiếu kèm cách sửa, storage local thì bỏ qua Drive", async () => {
  assert.deepEqual(parseEnv("# c\nA=1\nB='x y'\nC=\n"), { A: "1", B: "x y", C: "" });
  const root = await tmp();
  const checks = runChecks({ env: { ELEVENLABS_API_KEY: "k" }, probe: (bin) => (bin === "claude" ? null : "v1"), root, storage: "local" });
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(by.ffmpeg.ok, true);
  assert.equal(by.claude.ok, false);
  assert.match(by.claude.fix!, /CLAUDE_PATH/);
  assert.equal(by["npm-install"].ok, false);
  assert.equal(by.elevenlabs.detail, "thiếu ELEVENLABS_VOICE_ID");
  assert.equal(by.drive.ok, true);
  const noEnv = runChecks({ env: null, probe: () => "v", root, storage: "google-drive" });
  assert.equal(noEnv.find((c) => c.id === "env-file")!.ok, false);
  assert.match(noEnv.find((c) => c.id === "drive")!.detail, /GOOGLE_CLIENT_ID/);
});
