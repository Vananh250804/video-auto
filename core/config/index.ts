import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

export interface AppConfig {
  workspace_dir: string;
  language: string;
  cut: {
    silence_threshold_db: number;
    min_silence_sec: number;
    padding_sec: number;
    min_segment_sec: number;
  };
  subtitles: {
    max_chars_per_line: number;
    max_duration_sec: number;
    pause_break_sec: number;
  };
  voiceover: {
    original_volume: number;
  };
  providers: {
    tts: string;
    asr: string;
    llm: string;
    storage: string;
  };
  claude: {
    model: string;
  };
  plan: {
    auto_highlight: boolean;
  };
  script: {
    words_per_second: number;
  };
  elevenlabs: {
    tts_model: string;
    asr_model: string;
    voice_id: string;
  };
}

const ROOT = resolve(import.meta.dirname, "../..");

function deepMerge(base: any, override: any): any {
  if (!override || typeof override !== "object" || Array.isArray(override)) return override ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) out[k] = deepMerge(base?.[k], v);
  return out;
}

function readYaml(file: string): any {
  return existsSync(file) ? parse(readFileSync(file, "utf8")) ?? {} : {};
}

let cached: AppConfig | null = null;

// config/default.yaml, ghi đè bởi config/local.yaml (không commit). Key bí mật lấy từ .env.
export function loadConfig(): AppConfig {
  if (cached) return cached;
  const envFile = resolve(ROOT, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  cached = deepMerge(readYaml(resolve(ROOT, "config/default.yaml")), readYaml(resolve(ROOT, "config/local.yaml")));
  return cached!;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu ${name} trong file .env (xem .env.example).`);
  return value;
}

export const projectRoot = () => ROOT;
