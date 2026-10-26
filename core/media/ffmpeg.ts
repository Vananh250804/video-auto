import { spawn } from "node:child_process";

export const ffmpegBin = () => process.env.FFMPEG_PATH || "ffmpeg";
export const ffprobeBin = () => process.env.FFPROBE_PATH || "ffprobe";

export interface RunResult {
  stdout: string;
  stderr: string;
}

// Chạy một lệnh, không qua shell, nên đường dẫn có dấu cách hay tiếng Việt vẫn an toàn trên Windows và macOS.
export function run(bin: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new Error(`Không tìm thấy "${bin}". Cài FFmpeg (xem docs/setup.md) hoặc đặt FFMPEG_PATH/FFPROBE_PATH trong .env.`));
      } else {
        reject(err);
      }
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} thoát với mã ${code}:\n${stderr.slice(-2000)}`));
    });
  });
}
