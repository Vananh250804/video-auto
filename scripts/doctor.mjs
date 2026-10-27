#!/usr/bin/env node
// Kiểm tra máy đã cài đủ để chạy video-auto chưa, thiếu gì thì chỉ cách cài.
// Viết bằng JavaScript thuần, không cần npm install, để chạy được ngay sau khi clone.
//   node scripts/doctor.mjs          bảng kết quả cho người đọc
//   node scripts/doctor.mjs --json   cho agent đọc
//   node scripts/doctor.mjs --hook   ngắn gọn, dùng trong hook SessionStart của Claude Code
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const OS = isWin ? "windows" : process.platform === "darwin" ? "mac" : "linux";

// Đọc .env đơn giản (KEY=VALUE), không cần thư viện
export function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

function readEnv() {
  const file = resolve(ROOT, ".env");
  return existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : null;
}

// Chạy lệnh lấy phiên bản. Trên Windows lệnh cài qua npm là file .cmd nên cần shell (tham số cố định, an toàn).
function version(bin, args = ["--version"]) {
  const r = spawnSync(bin, args, { encoding: "utf8", shell: isWin, timeout: 15000, windowsHide: true });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || r.stderr).split(/\r?\n/)[0].trim();
}

function storageMode() {
  for (const f of ["config/local.yaml", "config/default.yaml"]) {
    const file = resolve(ROOT, f);
    if (!existsSync(file)) continue;
    const m = readFileSync(file, "utf8").match(/^\s*storage:\s*([\w-]+)/m);
    if (m) return m[1];
  }
  return "google-drive";
}

const INSTALL = {
  node: { mac: "brew install node", windows: "winget install OpenJS.NodeJS.LTS", linux: "Cài Node.js 20 LTS từ https://nodejs.org" },
  git: { mac: "brew install git", windows: "winget install Git.Git", linux: "sudo apt install git" },
  ffmpeg: { mac: "brew install ffmpeg", windows: "winget install Gyan.FFmpeg (đóng và mở lại terminal sau khi cài)", linux: "sudo apt install ffmpeg" },
  claude: { mac: "Cài Claude Code: https://code.claude.com/docs/en/setup , rồi gõ `claude` để đăng nhập", windows: "Cài Claude Code: https://code.claude.com/docs/en/setup , rồi gõ `claude` để đăng nhập", linux: "Cài Claude Code: https://code.claude.com/docs/en/setup" },
};

// level: required = thiếu thì không chạy được; feature = thiếu thì mất một tính năng
export function runChecks({ env = readEnv(), probe = version, root = ROOT, storage = storageMode() } = {}) {
  const checks = [];
  const add = (id, label, level, ok, detail, fix) => checks.push({ id, label, level, ok, detail, fix: ok ? undefined : fix });
  const e = env ?? {};

  const [major, minor] = process.versions.node.split(".").map(Number);
  add("node", "Node.js 20.12+", "required", major > 20 || (major === 20 && minor >= 12), `đang có ${process.versions.node}`,
    `Cần Node.js 20.12 trở lên. ${INSTALL.node[OS]}`);

  const git = probe("git");
  add("git", "Git", "required", Boolean(git), git ?? "không tìm thấy", INSTALL.git[OS]);

  const ffmpeg = probe(e.FFMPEG_PATH || "ffmpeg", ["-version"]);
  const ffprobe = probe(e.FFPROBE_PATH || "ffprobe", ["-version"]);
  add("ffmpeg", "FFmpeg + ffprobe", "required", Boolean(ffmpeg && ffprobe), ffmpeg ? ffmpeg.slice(0, 40) : "không tìm thấy",
    `${INSTALL.ffmpeg[OS]}. Đã cài mà vẫn báo thiếu: điền đường dẫn đầy đủ vào .env, FFMPEG_PATH=... và FFPROBE_PATH=...`);

  add("npm-install", "Thư viện (npm install)", "required", existsSync(resolve(root, "node_modules/tsx")) && existsSync(resolve(root, "node_modules/remotion")),
    existsSync(resolve(root, "node_modules")) ? "thiếu một phần" : "chưa cài", "Chạy `npm install` trong thư mục video-auto.");

  add("env-file", "File .env", "required", env !== null, env ? "có" : "chưa có",
    isWin ? "Chạy `copy .env.example .env` rồi điền từng mục theo docs/setup.md." : "Chạy `cp .env.example .env` rồi điền từng mục theo docs/setup.md.");

  const claude = probe(e.CLAUDE_PATH || "claude");
  add("claude", "Claude Code (lệnh claude)", "required", Boolean(claude), claude ?? "không tìm thấy",
    `${INSTALL.claude[OS]}. Đã cài mà bot không thấy: chạy \`${isWin ? "where" : "which"} claude\`, dán đường dẫn vào .env: CLAUDE_PATH=...`);

  // Remotion tải Chrome Headless Shell vào node_modules/.remotion lần đầu render
  add("remotion-browser", "Trình duyệt render (Remotion)", "feature", existsSync(resolve(root, "node_modules/.remotion")),
    existsSync(resolve(root, "node_modules/.remotion")) ? "có" : "chưa tải", "Chạy `npx remotion browser ensure` (tải khoảng 100 MB, một lần).");

  add("elevenlabs", "ElevenLabs (phụ đề + giọng đọc)", "feature", Boolean(e.ELEVENLABS_API_KEY && e.ELEVENLABS_VOICE_ID),
    e.ELEVENLABS_API_KEY ? (e.ELEVENLABS_VOICE_ID ? "đủ" : "thiếu ELEVENLABS_VOICE_ID") : "thiếu ELEVENLABS_API_KEY",
    "Xem docs/setup.md mục ElevenLabs: tạo API key và copy voice ID tiếng Việt vào .env.");

  add("telegram", "Bot Telegram", "feature", Boolean(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_ALLOWED_CHAT_IDS),
    e.TELEGRAM_BOT_TOKEN ? (e.TELEGRAM_ALLOWED_CHAT_IDS ? "đủ" : "thiếu TELEGRAM_ALLOWED_CHAT_IDS") : "thiếu TELEGRAM_BOT_TOKEN",
    "Xem docs/setup.md mục Bot Telegram: lấy token từ @BotFather, chạy `npm run bot` để biết chat id.");

  if (storage === "local") {
    add("drive", "Google Drive", "feature", true, "không dùng (storage: local)");
  } else {
    const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_DRIVE_INPUT_FOLDER_ID", "GOOGLE_DRIVE_OUTPUT_FOLDER_ID"].filter((k) => !e[k]);
    add("drive", "Google Drive", "feature", missing.length === 0, missing.length ? `thiếu ${missing.join(", ")}` : "đủ",
      missing.length === 1 && missing[0] === "GOOGLE_REFRESH_TOKEN"
        ? "Chạy `npm run drive:auth` để đăng nhập Drive."
        : "Xem docs/setup.md mục Google Drive (khoảng 10 phút). Chưa cần Drive thì đặt `storage: local` trong config/local.yaml.");
  }

  return checks;
}

function main() {
  const mode = process.argv.includes("--json") ? "json" : process.argv.includes("--hook") ? "hook" : "text";
  const checks = runChecks();
  const missingRequired = checks.filter((c) => !c.ok && c.level === "required");
  const missingFeature = checks.filter((c) => !c.ok && c.level === "feature");

  if (mode === "json") {
    console.log(JSON.stringify({ os: OS, ready: missingRequired.length === 0, checks }, null, 2));
  } else if (mode === "hook") {
    // Hook in ra stdout thì Claude Code đưa vào ngữ cảnh. Đủ hết thì chỉ một dòng.
    if (missingRequired.length + missingFeature.length === 0) console.log("video-auto: máy đã cài đủ (npm run doctor).");
    else {
      console.log(`video-auto doctor (${OS}): máy chưa cài đủ. Dùng skill setup-guide để hướng dẫn người dùng từng bước.`);
      for (const c of [...missingRequired, ...missingFeature]) console.log(`- [${c.level === "required" ? "bắt buộc" : "tính năng"}] ${c.label}: ${c.detail}. Cách sửa: ${c.fix}`);
    }
  } else {
    for (const c of checks) console.log(`${c.ok ? "✅" : c.level === "required" ? "❌" : "⚠️ "} ${c.label}: ${c.detail}${c.ok ? "" : `\n   → ${c.fix}`}`);
    console.log("");
    if (missingRequired.length) console.log(`Còn ${missingRequired.length} mục bắt buộc chưa xong. Làm lần lượt từ trên xuống rồi chạy lại: npm run doctor`);
    else if (missingFeature.length) console.log(`Chạy được rồi. Còn ${missingFeature.length} tính năng chưa nối (⚠️), làm khi cần.`);
    else console.log("Đã cài đủ. Thử: npm test");
  }
  // Hook không được làm hỏng phiên Claude Code nên luôn thoát 0
  process.exitCode = mode !== "hook" && missingRequired.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
