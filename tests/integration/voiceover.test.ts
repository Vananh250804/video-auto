import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AsrProvider, TtsProvider } from "../../core/contracts/providers.ts";
import { ffmpegBin, run } from "../../core/media/ffmpeg.ts";
import { probe } from "../../core/media/probe.ts";
import { voiceoverVideo } from "../../core/pipeline/voiceover.ts";
import { subtitleVideo } from "../../core/pipeline/subtitles.ts";
import { ElevenLabsTts } from "../../integrations/tts/elevenlabs/index.ts";
import { ElevenLabsAsr } from "../../integrations/asr/elevenlabs/index.ts";

let dir = "";
let video = "";

// Giả lập TTS: tạo tiếng bíp dài 0.4s mỗi từ, chia đều thời gian từng từ
const fakeTts = (withWords: boolean): TtsProvider => ({
  name: "fake",
  async synthesize(text, outFile) {
    const words = text.split(/\s+/);
    const seconds = words.length * 0.4;
    await run(ffmpegBin(), ["-hide_banner", "-y", "-f", "lavfi", "-i", `sine=frequency=330:duration=${seconds}`, "-c:a", "libmp3lame", outFile]);
    return {
      audioFile: outFile,
      words: withWords ? words.map((t, i) => ({ text: t, start: i * 0.4, end: i * 0.4 + 0.35 })) : undefined,
    };
  },
});

const fakeAsr: AsrProvider = {
  name: "fake",
  async transcribe() {
    return { language: "vi", text: "một hai ba", words: [{ text: "một", start: 0, end: 0.4 }, { text: "hai", start: 0.4, end: 0.8 }, { text: "ba.", start: 0.8, end: 1.2 }] };
  },
};

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "video-auto-vo-"));
  video = join(dir, "dọc.mp4");
  await run(ffmpegBin(), [
    "-hide_banner", "-y",
    "-f", "lavfi", "-i", "testsrc2=size=540x960:rate=30:duration=3",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
    video,
  ]);
  process.env.ELEVENLABS_API_KEY = "test-key";
});

after(() => mock.restoreAll());

test("voiceover dài hơn video thì giữ khung cuối, xuất phụ đề", async () => {
  const script = "Chào các bạn. Hôm nay mình giới thiệu chiếc túi xách siêu xinh này nhé!";
  const out = await mkdtemp(join(dir, "job-"));
  const result = await voiceoverVideo({ video, script, dir: out, tts: fakeTts(true), asr: () => fakeAsr, language: "vi", originalVolume: 0 });
  const info = await probe(result.output);
  assert.ok(result.extendedSec > 1, `extendedSec ${result.extendedSec}`);
  assert.ok(Math.abs(info.durationSec - result.durationSec) < 0.2, `${info.durationSec} vs ${result.durationSec}`);
  assert.equal(info.aspectRatio, "9:16");
  assert.equal(result.captions[0].text, "Chào các bạn.");
  assert.match(await readFile(result.srt, "utf8"), /^1\n00:00:00,000 --> /);
});

test("voiceover giữ tiếng gốc nhỏ, TTS không có timestamp thì dùng ASR", async () => {
  const out = await mkdtemp(join(dir, "job-"));
  const result = await voiceoverVideo({ video, script: "một hai ba", dir: out, tts: fakeTts(false), asr: () => fakeAsr, language: "vi", originalVolume: 0.15 });
  assert.equal(result.extendedSec, 0);
  assert.equal(result.captions.length, 1);
  const info = await probe(result.output);
  assert.ok(info.hasAudio);
  assert.ok(Math.abs(info.durationSec - 3) < 0.2);
});

test("subtitleVideo tách tiếng, nhận giọng nói, xuất SRT", async () => {
  const out = await mkdtemp(join(dir, "job-"));
  const result = await subtitleVideo(video, out, fakeAsr, "vi");
  assert.equal(result.captions.length, 1);
  assert.equal(result.captions[0].text, "một hai ba.");
  assert.ok((await probe(video)).hasAudio);
});

test("ElevenLabs TTS gửi đúng request và đọc timestamp", async () => {
  let url = "";
  let body: any;
  mock.method(globalThis, "fetch", async (u: string, init: any) => {
    url = u;
    body = JSON.parse(init.body);
    assert.equal(init.headers["xi-api-key"], "test-key");
    const chars = [..."Xin chào"];
    return new Response(JSON.stringify({
      audio_base64: Buffer.from("fake-mp3").toString("base64"),
      alignment: { characters: chars, character_start_times_seconds: chars.map((_, i) => i * 0.1), character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1) },
    }));
  });
  const tts = new ElevenLabsTts({ model: "eleven_v3", voiceId: "voice123" });
  const out = join(dir, "el.mp3");
  const r = await tts.synthesize("Xin chào", out, { language: "vi" });
  assert.equal(url, "https://api.elevenlabs.io/v1/text-to-speech/voice123/with-timestamps?output_format=mp3_44100_128");
  assert.deepEqual(body, { text: "Xin chào", model_id: "eleven_v3", language_code: "vi" });
  assert.equal(await readFile(out, "utf8"), "fake-mp3");
  assert.deepEqual(r.words?.map((x) => x.text), ["Xin", "chào"]);
  mock.restoreAll();
});

test("ElevenLabs ASR gửi file, mã ngôn ngữ vie, model scribe_v2", async () => {
  let form: FormData | undefined;
  mock.method(globalThis, "fetch", async (_u: string, init: any) => {
    form = init.body;
    return new Response(JSON.stringify({ language_code: "vie", text: "chào", words: [{ text: "chào", start: 0, end: 0.5, type: "word" }] }));
  });
  const asr = new ElevenLabsAsr("scribe_v2");
  const t = await asr.transcribe(video, { language: "vi" });
  assert.equal(form?.get("model_id"), "scribe_v2");
  assert.equal(form?.get("language_code"), "vie");
  assert.equal(form?.get("timestamps_granularity"), "word");
  assert.ok(form?.get("file") instanceof Blob);
  assert.equal(t.words.length, 1);
  mock.restoreAll();
});

test("ElevenLabs báo lỗi rõ ràng khi API trả lỗi", async () => {
  mock.method(globalThis, "fetch", async () => new Response("invalid api key", { status: 401, statusText: "Unauthorized" }));
  await assert.rejects(new ElevenLabsAsr("scribe_v2").transcribe(video, { language: "vi" }), /ElevenLabs 401/);
  mock.restoreAll();
});
