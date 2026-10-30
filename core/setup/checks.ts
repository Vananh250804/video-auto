import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadConfig, projectRoot } from "../config/index.ts";
import { ffmpegBin, ffprobeBin, run } from "../media/ffmpeg.ts";
import { getTts } from "../../integrations/registry.ts";
import { nodeVersionOk } from "./setup.ts";

// Mỗi lệnh kiểm trả { ok, message }. Message viết bằng tiếng Việt dễ hiểu, không bao giờ chứa khóa.
export interface CheckResult {
  ok: boolean;
  message: string;
}

export type CheckName = "node" | "ffmpeg" | "deps" | "claude" | "elevenlabs" | "telegram" | "drive";
export const CHECK_NAMES: CheckName[] = ["node", "ffmpeg", "deps", "claude", "elevenlabs", "telegram", "drive"];

const ok = (message: string): CheckResult => ({ ok: true, message });
const fail = (message: string): CheckResult => ({ ok: false, message });

async function fetchStatus(url: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function runCheck(name: CheckName): Promise<CheckResult> {
  loadConfig(); // nạp .env
  try {
    switch (name) {
      case "node":
        return nodeVersionOk() ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} quá cũ, cần 20.12 trở lên. Tải bản LTS tại nodejs.org.`);

      case "ffmpeg": {
        await run(ffmpegBin(), ["-version"]);
        await run(ffprobeBin(), ["-version"]);
        return ok("ffmpeg và ffprobe chạy được");
      }

      case "deps":
        return existsSync(resolve(projectRoot(), "node_modules/remotion")) ? ok("Đã cài thư viện (npm install)") : fail("Chưa cài thư viện. Chạy: npm install (vài phút).");

      case "claude": {
        const bin = process.env.CLAUDE_PATH || "claude";
        const { stdout } = await run(bin, ["--version"]);
        return ok(`Claude Code ${stdout.trim().split("\n")[0]}`);
      }

      case "elevenlabs": {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) return fail("Chưa có ELEVENLABS_API_KEY.");
        const user = await fetchStatus("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": key } });
        if (user.status === 401) return fail("Khóa ElevenLabs sai hoặc đã bị thu hồi. Tạo khóa mới và dán lại.");
        if (user.status !== 200) return fail(`ElevenLabs trả lỗi ${user.status}. Thử lại sau ít phút.`);
        const tier = user.body?.subscription?.tier;
        const voice = process.env.ELEVENLABS_VOICE_ID || loadConfig().elevenlabs.voice_id;
        if (!voice) return fail("Khóa ElevenLabs đúng, nhưng chưa có ELEVENLABS_VOICE_ID (Voices → Copy voice ID).");
        const v = await fetchStatus(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voice)}`, { headers: { "xi-api-key": key } });
        if (v.status === 404 || v.status === 400) return fail("Voice ID không đúng hoặc chưa thêm vào My Voices.");
        const free = tier === "free" ? " Gói Free: không được dùng thương mại và cần ghi nguồn, nên nâng gói trả phí nếu chạy quảng cáo." : "";
        return ok(`ElevenLabs hoạt động (gói ${tier ?? "không rõ"}).${free}`);
      }

      case "telegram": {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return fail("Chưa có TELEGRAM_BOT_TOKEN (tùy chọn, chỉ cần nếu muốn dùng bot).");
        const me = await fetchStatus(`https://api.telegram.org/bot${token}/getMe`);
        if (me.status !== 200) return fail("Token bot Telegram sai. Lấy lại từ @BotFather.");
        const ids = process.env.TELEGRAM_ALLOWED_CHAT_IDS;
        return ok(`Bot @${me.body?.result?.username} hoạt động.${ids ? "" : " Chưa có TELEGRAM_ALLOWED_CHAT_IDS, chạy: npm run setup -- telegram-chat"}`);
      }

      case "drive": {
        const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REFRESH_TOKEN: refresh } = process.env;
        if (!id || !secret) return fail("Chưa có GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (tùy chọn, chỉ cần nếu dùng Google Drive).");
        if (!refresh) return fail("Chưa đăng nhập Drive. Chạy: npm run drive:auth");
        const res = await fetchStatus("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
        });
        return res.status === 200 ? ok("Google Drive đăng nhập được") : fail("Đăng nhập Drive hết hạn hoặc sai. Chạy lại: npm run drive:auth");
      }
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (name === "ffmpeg") return fail("Không chạy được ffmpeg/ffprobe. Cài FFmpeg (xem docs/setup.md) hoặc điền FFMPEG_PATH, FFPROBE_PATH trong .env.");
    if (name === "claude") return fail("Không chạy được lệnh claude. Cài Claude Code và đăng nhập, hoặc điền CLAUDE_PATH trong .env.");
    return fail(`Không kiểm được (${msg.split("\n")[0].slice(0, 120)}). Kiểm tra kết nối mạng.`);
  }
}

// Đọc thử một câu bằng giọng đã chọn, ghi ra workspace/test-voice.mp3
export async function testVoice(text: string): Promise<string> {
  const cfg = loadConfig();
  const out = resolve(projectRoot(), cfg.workspace_dir, "test-voice.mp3");
  await mkdir(dirname(out), { recursive: true });
  await getTts().synthesize(text, out, { language: cfg.language });
  return out;
}

// Lấy các chat đã nhắn cho bot (khách phải gửi /start cho bot trước)
export async function findTelegramChats(): Promise<{ id: number; name: string }[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Chưa có TELEGRAM_BOT_TOKEN.");
  const res = await fetchStatus(`https://api.telegram.org/bot${token}/getUpdates?timeout=0`);
  if (res.status !== 200) throw new Error("Token bot Telegram sai.");
  const seen = new Map<number, string>();
  for (const u of res.body?.result ?? []) {
    const chat = u.message?.chat ?? u.channel_post?.chat;
    if (chat) seen.set(chat.id, chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "(không tên)");
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}
