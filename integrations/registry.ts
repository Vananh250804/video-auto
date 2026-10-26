import { loadConfig } from "../core/config/index.ts";
import { resolve } from "node:path";
import { projectRoot } from "../core/config/index.ts";
import type { AsrProvider, LlmProvider, StorageProvider, TtsProvider } from "../core/contracts/providers.ts";
import { GoogleDriveStorage } from "./storage/google-drive/index.ts";
import { LocalStorage } from "./storage/local/index.ts";
import { ClaudeCli } from "./llm/claude/index.ts";
import { ElevenLabsAsr } from "./asr/elevenlabs/index.ts";
import { ElevenLabsTts } from "./tts/elevenlabs/index.ts";

// Chọn provider theo tên, mặc định lấy từ config/default.yaml (providers.tts / providers.asr).
export function getAsr(name?: string): AsrProvider {
  const cfg = loadConfig();
  const pick = name || cfg.providers.asr;
  switch (pick) {
    case "elevenlabs":
      return new ElevenLabsAsr(cfg.elevenlabs.asr_model);
    default:
      throw new Error(`ASR "${pick}" chưa được hỗ trợ. Hiện có: elevenlabs.`);
  }
}

export function getTts(name?: string): TtsProvider {
  const cfg = loadConfig();
  const pick = name || cfg.providers.tts;
  switch (pick) {
    case "elevenlabs":
      return new ElevenLabsTts({ model: cfg.elevenlabs.tts_model, voiceId: cfg.elevenlabs.voice_id });
    default:
      throw new Error(`TTS "${pick}" chưa được hỗ trợ. Hiện có: elevenlabs. Vbee, Saydi cần tài liệu API và key.`);
  }
}

export function getLlm(name?: string): LlmProvider {
  const cfg = loadConfig();
  const pick = name || cfg.providers.llm;
  switch (pick) {
    case "claude":
      return new ClaudeCli({ model: cfg.claude?.model || undefined });
    default:
      throw new Error(`LLM "${pick}" chưa được hỗ trợ. Hiện có: claude.`);
  }
}

export function getStorage(name?: string): StorageProvider {
  const cfg = loadConfig();
  const pick = name || cfg.providers.storage;
  switch (pick) {
    case "google-drive": {
      const env = process.env;
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
        throw new Error("Chưa nối Google Drive: thiếu GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET hoặc GOOGLE_REFRESH_TOKEN trong .env (xem docs/setup.md).");
      }
      return new GoogleDriveStorage({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GOOGLE_REFRESH_TOKEN,
        inputFolderId: env.GOOGLE_DRIVE_INPUT_FOLDER_ID || undefined,
        outputFolderId: env.GOOGLE_DRIVE_OUTPUT_FOLDER_ID || undefined,
      });
    }
    case "local": {
      const ws = resolve(projectRoot(), cfg.workspace_dir);
      return new LocalStorage({ inputDir: resolve(ws, "inbox"), outputDir: resolve(ws, "outbox") });
    }
    default:
      throw new Error(`Storage "${pick}" chưa được hỗ trợ. Hiện có: google-drive, local.`);
  }
}
