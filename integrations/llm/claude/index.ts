import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { LlmProvider } from "../../../core/contracts/providers.ts";

// Gọi Claude Code ở chế độ không tương tác (claude -p), dùng tài khoản Claude đã đăng nhập trên máy, không cần API key.
// Prompt gửi qua stdin nên không lo ký tự đặc biệt. Chạy trong thư mục tạm để không nạp CLAUDE.md của project.
export class ClaudeCli implements LlmProvider {
  readonly name = "claude";
  constructor(private opts: { bin?: string; model?: string; timeoutMs?: number } = {}) {}

  complete(prompt: string): Promise<string> {
    const bin = this.opts.bin || process.env.CLAUDE_PATH || "claude";
    const args = ["-p", "--output-format", "json", ...(this.opts.model ? ["--model", this.opts.model] : [])];
    // Trên Windows, claude cài qua npm là file claude.cmd, phải chạy qua shell. Tham số cố định nên an toàn.
    const shell = process.platform === "win32";

    return new Promise((resolve, reject) => {
      const child = spawn(bin, args, { cwd: tmpdir(), shell, windowsHide: true });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Claude không trả lời sau ${(this.opts.timeoutMs ?? 300_000) / 1000} giây.`));
      }, this.opts.timeoutMs ?? 300_000);
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", (err: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        reject(err.code === "ENOENT"
          ? new Error(`Không tìm thấy lệnh "${bin}". Cài Claude Code và đăng nhập (xem docs/setup.md), hoặc đặt CLAUDE_PATH trong .env.`)
          : err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        try {
          const data = JSON.parse(stdout);
          if (data.is_error || code !== 0) return reject(new Error(`Claude báo lỗi: ${data.result ?? stderr}`));
          resolve(String(data.result ?? ""));
        } catch {
          reject(new Error(`Claude thoát với mã ${code}: ${(stderr || stdout).slice(-1000)}`));
        }
      });
      child.stdin.end(prompt);
    });
  }
}
