import { test, before } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LlmProvider } from "../../core/contracts/providers.ts";
import { ffmpegBin, run } from "../../core/media/ffmpeg.ts";
import { planEdit } from "../../core/planner/edit-planner.ts";
import { reviseScript, writeScript } from "../../core/planner/script-writer.ts";
import { readReview, setStatus } from "../../core/review/review-state.ts";
import { ClaudeCli } from "../../integrations/llm/claude/index.ts";

let dir = "";
let video = "";
let captions = "";

// LLM giả: trả lần lượt các câu trả lời, ghi lại prompt đã nhận
function fakeLlm(answers: string[]): LlmProvider & { prompts: string[] } {
  const prompts: string[] = [];
  return { name: "fake", prompts, async complete(p) { prompts.push(p); return answers.shift() ?? ""; } };
}

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "video-auto-plan-"));
  video = join(dir, "v.mp4");
  captions = join(dir, "captions.json");
  await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", "testsrc2=size=540x960:rate=30:duration=5", "-c:v", "libx264", "-pix_fmt", "yuv420p", video]);
  await writeFile(captions, JSON.stringify([{ start: 0.5, end: 2, text: "Giảm 50% hôm nay", words: [] }]));
});

test("planEdit gửi phụ đề + yêu cầu cho Claude, trả edit.json hợp lệ", async () => {
  const llm = fakeLlm([JSON.stringify({ captionStyle: "box", originalVolume: 0.5, overlays: [{ text: "GIẢM 50%", start: 0.5, end: 2.5 }], sfx: [], music: null, notes: "ok" })]);
  const r = await planEdit({ video, captions, workflow: "shop-ads", request: "chữ to, phụ đề nền đen", llm });
  assert.match(llm.prompts[0], /\[0\.50-2\.00\] Giảm 50% hôm nay/);
  assert.match(llm.prompts[0], /chữ to, phụ đề nền đen/);
  assert.match(llm.prompts[0], /dài 5 giây/);
  assert.equal(r.edit.captionStyle, "box");
  assert.equal(r.edit.overlays?.[0].text, "GIẢM 50%");
  assert.equal(r.edit.video, video);
});

test("planEdit thử lại khi Claude trả sai, gửi kèm lỗi", async () => {
  const llm = fakeLlm(["xin lỗi tôi không hiểu", JSON.stringify({ overlays: [], sfx: [] })]);
  const r = await planEdit({ video, workflow: "faceless", llm });
  assert.equal(llm.prompts.length, 2);
  assert.match(llm.prompts[1], /Lần trước bị lỗi/);
  assert.equal(r.edit.captionStyle, "tiktok");
  assert.equal(r.edit.originalVolume, 0);
});

test("planEdit báo lỗi sau 2 lần sai", async () => {
  await assert.rejects(planEdit({ video, workflow: "shop-ads", llm: fakeLlm(["a", "b"]) }), /không hợp lệ 2 lần/);
});

test("kịch bản: viết → góp ý → viết lại → duyệt", async () => {
  const job = await mkdtemp(join(dir, "job-"));
  const llm = fakeLlm([
    JSON.stringify({ script: "Túi này giá 299k thôi các bạn.", notes: "n1" }),
    JSON.stringify({ script: "Túi này giá 299 nghìn thôi các bạn ơi.", notes: "n2" }),
  ]);
  const first = await writeScript({ dir: job, brief: "túi xách", workflow: "faceless", targetSec: 3, llm });
  assert.equal(first.state.status, "pending");
  assert.ok(first.state.check.issues.some((i) => i.type === "money"));

  const second = await reviseScript({ dir: job, feedback: "viết số tiền rõ", workflow: "faceless", llm });
  assert.match(llm.prompts[1], /Túi này giá 299k/);
  assert.match(llm.prompts[1], /viết số tiền rõ/);
  assert.equal(second.state.check.issues.filter((i) => i.type === "money").length, 0);

  await setStatus(job, "approved");
  const state = await readReview(job);
  assert.equal(state.status, "approved");
  assert.deepEqual(state.history.map((h) => h.action), ["written", "revised", "approved"]);
  assert.equal(await readFile(join(job, "script.txt"), "utf8"), "Túi này giá 299 nghìn thôi các bạn ơi.");
});

test("ClaudeCli gửi prompt qua stdin, đọc kết quả JSON", { skip: process.platform === "win32" }, async () => {
  const bin = join(dir, "fake-claude");
  await writeFile(bin, `#!/usr/bin/env node
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const args = process.argv.slice(2).join(" ");
  if (input.includes("lỗi")) { console.log(JSON.stringify({ is_error: true, result: "hết lượt" })); process.exit(1); }
  console.log(JSON.stringify({ type: "result", is_error: false, result: "nhận: " + input + " | " + args }));
});
`);
  await chmod(bin, 0o755);
  const llm = new ClaudeCli({ bin, model: "sonnet" });
  assert.equal(await llm.complete('xin chào "test" $HOME'), 'nhận: xin chào "test" $HOME | -p --output-format json --model sonnet');
  await assert.rejects(llm.complete("lỗi"), /Claude báo lỗi: hết lượt/);
  await assert.rejects(new ClaudeCli({ bin: join(dir, "khong-co") }).complete("x"), /Không tìm thấy lệnh/);
});
