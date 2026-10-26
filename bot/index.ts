import { resolve } from "node:path";
import { loadConfig, projectRoot, requireEnv } from "../core/config/index.ts";
import { TelegramClient } from "../integrations/delivery/telegram/index.ts";
import { getAsr, getLlm, getStorage, getTts } from "../integrations/registry.ts";
import { VideoBot } from "./bot.ts";

const cfg = loadConfig();
const allowed = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "").split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n !== 0),
);

const bot = new VideoBot({
  tg: new TelegramClient(requireEnv("TELEGRAM_BOT_TOKEN")),
  allowedChats: allowed,
  jobsDir: resolve(projectRoot(), cfg.workspace_dir, "jobs"),
  runnerDeps: { llm: () => getLlm(), tts: () => getTts(), asr: () => getAsr(), storage: getStorage() },
});

const resumed = bot.resumeUnfinished();
console.log(`Bot đang chạy. Chat được phép: ${allowed.size ? [...allowed].join(", ") : "(chưa có, nhắn bot để lấy chat id)"}. Đã kiểm tra ${resumed} job cũ.`);
console.log("Nhấn Ctrl+C để dừng.");
process.on("SIGINT", () => {
  bot.stop();
  process.exit(0);
});
await bot.start();
