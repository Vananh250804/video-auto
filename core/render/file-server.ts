import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { extname } from "node:path";
import type { AddressInfo } from "node:net";

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg",
};

// Phục vụ file local qua http://127.0.0.1 để Remotion đọc video, sfx mà không phải copy file lớn.
export async function serveFiles(files: string[]): Promise<{ urls: string[]; close: () => Promise<void> }> {
  const server: Server = createServer(async (req, res) => {
    const index = Number(req.url?.match(/^\/f\/(\d+)/)?.[1]);
    const file = files[index];
    if (file === undefined) {
      res.writeHead(404).end();
      return;
    }
    try {
      const { size } = await stat(file);
      const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : size - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        res.writeHead(206, { "Content-Type": type, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes" });
        if (req.method === "HEAD") return res.end();
        createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes" });
        if (req.method === "HEAD") return res.end();
        createReadStream(file).pipe(res);
      }
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    urls: files.map((f, i) => `http://127.0.0.1:${port}/f/${i}${extname(f)}`),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
