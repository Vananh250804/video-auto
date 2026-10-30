import { test } from "node:test";
import assert from "node:assert/strict";
import { STEPS, markStep, nextStep, nodeVersionOk, presentKeys, setEnvValue, type SetupState } from "../../core/setup/setup.ts";

const fresh = (): SetupState => ({ done: [], skipped: [], onboarded: false });

test("setEnvValue thay đúng dòng, thêm dòng mới, giữ nguyên phần còn lại", () => {
  const env = "# ghi chú\nFFMPEG_PATH=\nELEVENLABS_API_KEY=cu\n";
  const a = setEnvValue(env, "ELEVENLABS_API_KEY", "moi");
  assert.equal(a, "# ghi chú\nFFMPEG_PATH=\nELEVENLABS_API_KEY=moi\n");
  const b = setEnvValue(env, "TELEGRAM_BOT_TOKEN", "123:AA");
  assert.ok(b.endsWith("ELEVENLABS_API_KEY=cu\nTELEGRAM_BOT_TOKEN=123:AA\n"));
  assert.equal(setEnvValue("", "FFMPEG_PATH", "C:\\ff\\ffmpeg.exe"), "FFMPEG_PATH=C:\\ff\\ffmpeg.exe\n"); // $ và \\ trong giá trị không bị hiểu nhầm
  assert.equal(setEnvValue("ELEVENLABS_API_KEY=x\n", "ELEVENLABS_API_KEY", "a$&b"), "ELEVENLABS_API_KEY=a$&b\n");
});

test("setEnvValue chặn tên khóa lạ và giá trị nhiều dòng", () => {
  assert.throws(() => setEnvValue("", "PATH", "x"), /Không được phép ghi/);
  assert.throws(() => setEnvValue("", "ELEVENLABS_API_KEY", "a\nPATH=b"), /xuống dòng/);
});

test("presentKeys chỉ trả đúng/sai, không lộ giá trị", () => {
  const out = presentKeys("ELEVENLABS_API_KEY=bi-mat\nELEVENLABS_VOICE_ID=\nTELEGRAM_BOT_TOKEN=  \n");
  assert.equal(out.ELEVENLABS_API_KEY, true);
  assert.equal(out.ELEVENLABS_VOICE_ID, false);
  assert.equal(out.TELEGRAM_BOT_TOKEN, false);
  assert.ok(!JSON.stringify(out).includes("bi-mat"));
});

test("nextStep đi lần lượt, bước bỏ qua coi như qua, tiếp từ chỗ dở", () => {
  let s = fresh();
  assert.equal(nextStep(s), "hello");
  s = markStep(s, "hello");
  s = markStep(s, "machine");
  assert.equal(nextStep(s), "voice");
  s = markStep(markStep(s, "voice"), "telegram", "skipped");
  assert.equal(nextStep(s), "storage");
  s = markStep(markStep(s, "storage", "skipped"), "sample");
  assert.equal(nextStep(s), null);
  assert.deepEqual([...s.done, ...s.skipped].sort(), [...STEPS].sort());
  // làm lại một bước đã bỏ qua thì chuyển sang đã xong
  s = markStep(s, "telegram");
  assert.ok(s.done.includes("telegram") && !s.skipped.includes("telegram"));
});

test("nodeVersionOk cần 20.12 trở lên", () => {
  assert.equal(nodeVersionOk("20.11.1"), false);
  assert.equal(nodeVersionOk("20.12.0"), true);
  assert.equal(nodeVersionOk("22.4.0"), true);
  assert.equal(nodeVersionOk("18.20.0"), false);
});
