// Cài bot chạy nền, tự bật khi đăng nhập máy và tự chạy lại nếu bị tắt.
// macOS: LaunchAgent (launchd). Windows: file .vbs trong thư mục Startup, chạy ẩn một file .cmd lặp lại bot.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, projectRoot } from "../core/config/index.ts";

export const LABEL = "com.video-auto.bot";

export interface ServiceOptions {
  root: string; // thư mục project
  node: string; // đường dẫn node đang chạy
  logFile: string;
  path: string; // PATH hiện tại, để bot tìm thấy ffmpeg và claude
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildPlist(o: ServiceOptions): string {
  // caffeinate -i giữ máy không ngủ khi đang cắm bot
  const args = ["/usr/bin/caffeinate", "-i", o.node, join(o.root, "node_modules", "tsx", "dist", "cli.mjs"), join(o.root, "bot", "index.ts")];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args.map((a) => `    <string>${xml(a)}</string>`).join("\n")}
  </array>
  <key>WorkingDirectory</key><string>${xml(o.root)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${xml(o.path)}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>${xml(o.logFile)}</string>
  <key>StandardErrorPath</key><string>${xml(o.logFile)}</string>
</dict>
</plist>
`;
}

export function buildWindowsCmd(o: ServiceOptions): string {
  // Bot thoát thì đợi 15 giây rồi chạy lại
  return [
    "@echo off",
    "chcp 65001 >nul",
    `cd /d "${o.root}"`,
    ":loop",
    `"${o.node}" "${join(o.root, "node_modules", "tsx", "dist", "cli.mjs")}" "${join(o.root, "bot", "index.ts")}" >> "${o.logFile}" 2>&1`,
    "timeout /t 15 /nobreak >nul",
    "goto loop",
    "",
  ].join("\r\n");
}

export function buildWindowsVbs(cmdFile: string): string {
  // Chạy file .cmd ẩn, không hiện cửa sổ đen
  return `CreateObject("WScript.Shell").Run """${cmdFile}""", 0, False\r\n`;
}

function sh(bin: string, args: string[]) {
  const r = spawnSync(bin, args, { encoding: "utf8", windowsHide: true });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

function paths() {
  const root = projectRoot();
  const logDir = join(root, loadConfig().workspace_dir, "logs");
  return {
    root,
    logDir,
    logFile: join(logDir, "bot.log"),
    plist: join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`),
    cmd: join(root, loadConfig().workspace_dir, "bot-start.cmd"),
    vbs: join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "video-auto-bot.vbs"),
  };
}

function macDomain(): string {
  return `gui/${process.getuid!()}`;
}

function install() {
  const p = paths();
  mkdirSync(p.logDir, { recursive: true });
  const opts: ServiceOptions = { root: p.root, node: process.execPath, logFile: p.logFile, path: process.env.PATH ?? "" };
  if (process.platform === "darwin") {
    mkdirSync(join(homedir(), "Library", "LaunchAgents"), { recursive: true });
    sh("launchctl", ["bootout", `${macDomain()}/${LABEL}`]); // cài lại thì tắt bản cũ trước
    writeFileSync(p.plist, buildPlist(opts));
    const r = sh("launchctl", ["bootstrap", macDomain(), p.plist]);
    if (!r.ok) throw new Error(`launchctl báo lỗi: ${r.out}`);
  } else if (process.platform === "win32") {
    stopWindows();
    writeFileSync(p.cmd, buildWindowsCmd(opts));
    writeFileSync(p.vbs, buildWindowsVbs(p.cmd));
    const r = sh("wscript.exe", [p.vbs]);
    if (!r.ok) throw new Error(`Không chạy được bot: ${r.out}`);
  } else {
    throw new Error("Chỉ hỗ trợ macOS và Windows.");
  }
  console.log(`Đã cài. Bot đang chạy nền và tự bật mỗi khi đăng nhập máy.\nNhật ký: ${p.logFile}`);
  console.log("Không chạy thêm `npm run bot` cùng lúc, Telegram chỉ cho một bot nhận tin.");
}

// Tắt các tiến trình bot chạy từ file .cmd (vòng lặp và node bên trong)
function stopWindows() {
  const filter = "CommandLine like '%bot-start.cmd%' or CommandLine like '%bot\\\\index.ts%'";
  sh("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "${filter}" | Where-Object { $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`]);
}

function uninstall() {
  const p = paths();
  if (process.platform === "darwin") {
    sh("launchctl", ["bootout", `${macDomain()}/${LABEL}`]);
    rmSync(p.plist, { force: true });
  } else if (process.platform === "win32") {
    rmSync(p.vbs, { force: true });
    stopWindows();
    rmSync(p.cmd, { force: true });
  }
  console.log("Đã gỡ. Bot không còn tự bật nữa.");
}

function status() {
  const p = paths();
  if (process.platform === "darwin") {
    const r = sh("launchctl", ["print", `${macDomain()}/${LABEL}`]);
    const state = r.out.match(/state = (\w+)/)?.[1];
    console.log(r.ok ? `Đã cài, trạng thái: ${state === "running" ? "đang chạy" : state}` : "Chưa cài (chạy npm run bot:install).");
  } else if (process.platform === "win32") {
    console.log(existsSync(p.vbs) ? "Đã cài, tự bật khi đăng nhập." : "Chưa cài (chạy npm run bot:install).");
  }
  console.log(`Nhật ký: ${p.logFile}`);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  try {
    if (action === "install") install();
    else if (action === "uninstall") uninstall();
    else if (action === "status") status();
    else console.log("Dùng: npm run bot:install | bot:uninstall | bot:status");
  } catch (err) {
    console.error(`❌ ${(err as Error).message}`);
    process.exit(1);
  }
}
