import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { StorageProvider, StoredFile } from "../../../core/contracts/providers.ts";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";

export interface DriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  inputFolderId?: string;
  outputFolderId?: string;
  retryDelaysMs?: number[]; // chờ giữa các lần thử lại khi mất mạng
}

const RETRY_DELAYS_MS = [3_000, 10_000, 30_000];

// fetch báo "fetch failed" khi mất kết nối, lý do thật nằm trong err.cause
function networkCause(err: unknown): string | null {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === "TimeoutError") return "hết thời gian chờ";
  if (e?.name === "TypeError" && /fetch failed/i.test(e.message ?? "")) return e.cause?.code ?? e.cause?.message ?? "fetch failed";
  return null;
}

// Mạng chập chờn thì thử lại cả thao tác từ đầu; lỗi Drive trả về (403, 404...) thì báo luôn
export async function retryOnNetworkError<T>(fn: () => Promise<T>, delays = RETRY_DELAYS_MS): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const cause = networkCause(err);
      if (!cause) throw err;
      if (attempt >= delays.length) {
        throw new Error(`Mất kết nối tới Google Drive sau ${attempt + 1} lần thử (${cause}). Kiểm tra mạng rồi gửi /retry.`);
      }
      console.warn(`Google Drive mất kết nối (${cause}), thử lại sau ${delays[attempt] / 1000}s...`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

// Lấy id từ link Drive: /file/d/<id>, /folders/<id>, ?id=<id>, hoặc id trần
export function parseDriveRef(ref: string): string | null {
  const s = ref.trim();
  if (!s) return null;
  const m = s.match(/\/(?:file\/d|folders|document\/d)\/([\w-]{10,})/) ?? s.match(/[?&]id=([\w-]{10,})/);
  if (m) return m[1];
  if (/^[\w-]{10,}$/.test(s)) return s;
  throw new Error(`Không đọc được link Google Drive: ${ref}`);
}

// Tên file an toàn trên cả Windows và macOS
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/^\.+/, "").trim();
  return cleaned.slice(0, 150) || "video.mp4";
}

export class GoogleDriveStorage implements StorageProvider {
  readonly name = "google-drive";
  private token: { value: string; expiresAt: number } | null = null;
  constructor(private cfg: DriveConfig) {}

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        refresh_token: this.cfg.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Google từ chối đăng nhập (${data.error ?? res.status}). Chạy lại: npm run drive:auth`);
    this.token = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private async api(url: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${await this.accessToken()}` } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 404) throw new Error("Không tìm thấy file trên Drive, hoặc tài khoản đã đăng nhập không có quyền xem.");
      throw new Error(`Google Drive ${res.status}: ${body.slice(0, 300)}`);
    }
    return res;
  }

  private async meta(id: string): Promise<{ id: string; name: string; mimeType: string }> {
    return (await this.api(`${API}/files/${id}?fields=id,name,mimeType&supportsAllDrives=true`)).json() as any;
  }

  private async newestVideo(folderId: string): Promise<{ id: string; name: string; mimeType: string }> {
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'video/' and trashed = false`);
    const data: any = await (await this.api(`${API}/files?q=${q}&orderBy=createdTime desc&pageSize=1&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true`)).json();
    if (!data.files?.length) throw new Error("Thư mục Drive không có video nào.");
    return data.files[0];
  }

  async download(ref: string, destDir: string): Promise<StoredFile> {
    return retryOnNetworkError(() => this.downloadOnce(ref, destDir), this.cfg.retryDelaysMs);
  }

  private async downloadOnce(ref: string, destDir: string): Promise<StoredFile> {
    const id = parseDriveRef(ref) ?? this.cfg.inputFolderId;
    if (!id) throw new Error("Chưa có link video, và chưa đặt GOOGLE_DRIVE_INPUT_FOLDER_ID trong .env.");
    let file = await this.meta(id);
    if (file.mimeType === FOLDER) file = await this.newestVideo(file.id);
    if (!file.mimeType.startsWith("video/")) throw new Error(`"${file.name}" không phải video (${file.mimeType}).`);

    const name = safeFileName(file.name);
    const path = join(destDir, name);
    const res = await this.api(`${API}/files/${file.id}?alt=media&supportsAllDrives=true`);
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(path));
    return { path, name };
  }

  async upload(file: string, name: string): Promise<{ url: string }> {
    return retryOnNetworkError(() => this.uploadOnce(file, name), this.cfg.retryDelaysMs);
  }

  private async uploadOnce(file: string, name: string): Promise<{ url: string }> {
    const { size } = await stat(file);
    // Upload kiểu resumable: hỏi chỗ upload trước, rồi gửi nội dung file
    const init = await this.api(`${UPLOAD}/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(size) },
      body: JSON.stringify({ name, ...(this.cfg.outputFolderId ? { parents: [this.cfg.outputFolderId] } : {}) }),
    });
    const location = init.headers.get("location");
    if (!location) throw new Error("Google Drive không trả địa chỉ upload.");
    const res = await this.api(location, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
      body: Readable.toWeb(createReadStream(file)) as any,
      duplex: "half",
    } as RequestInit);
    const data: any = await res.json();
    return { url: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view` };
  }
}
