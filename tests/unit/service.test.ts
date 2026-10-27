import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlist, buildWindowsCmd, buildWindowsVbs, LABEL } from "../../bot/service.ts";

const mac = { root: "/Users/mac/video & auto", node: "/opt/homebrew/bin/node", logFile: "/Users/mac/video & auto/workspace/logs/bot.log", path: "/opt/homebrew/bin:/usr/bin" };

test("plist macOS: chạy bot qua caffeinate, tự chạy lại, giữ PATH", () => {
  const p = buildPlist(mac);
  assert.match(p, new RegExp(`<string>${LABEL}</string>`));
  assert.match(p, /<string>\/usr\/bin\/caffeinate<\/string>\s*<string>-i<\/string>\s*<string>\/opt\/homebrew\/bin\/node<\/string>/);
  assert.match(p, /video &amp; auto\/bot\/index\.ts/);
  assert.match(p, /<key>PATH<\/key><string>\/opt\/homebrew\/bin:\/usr\/bin<\/string>/);
  assert.match(p, /<key>KeepAlive<\/key><true\/>/);
  assert.doesNotMatch(p, /video & auto/);
});

test("Windows: file .cmd lặp lại bot, .vbs chạy ẩn", () => {
  const win = { root: "C:\\Users\\Vanh\\video-auto", node: "C:\\Program Files\\nodejs\\node.exe", logFile: "C:\\Users\\Vanh\\video-auto\\workspace\\logs\\bot.log", path: "" };
  const cmd = buildWindowsCmd(win);
  assert.match(cmd, /cd \/d "C:\\Users\\Vanh\\video-auto"/);
  assert.match(cmd, /"C:\\Program Files\\nodejs\\node.exe" ".*cli\.mjs" ".*index\.ts" >> ".*bot\.log" 2>&1/);
  assert.match(cmd, /goto loop/);
  assert.ok(cmd.includes("\r\n"));
  assert.equal(buildWindowsVbs("C:\\a b\\bot-start.cmd"), `CreateObject("WScript.Shell").Run """C:\\a b\\bot-start.cmd""", 0, False\r\n`);
});
