import { loadConfig } from "../core/config/index.ts";
import type { AsrProvider, LlmProvider, TtsProvider } from "../core/contracts/providers.ts";
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
