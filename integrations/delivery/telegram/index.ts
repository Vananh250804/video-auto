// Gọi Telegram Bot API trực tiếp bằng fetch, không cần thư viện.
import { createWriteStream, openAsBlob } from "node:fs";
import { basename } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// Giới hạn của Bot API: bot chỉ tải được file tối đa 20 MB, gửi đi tối đa 50 MB
export const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export interface TgFile {
  file_id: string;
  file_size?: number;
  file_name?: string;
  mime_type?: string;
}

export interface TgButton {
  text: string;
  callback_data: string;
}

export interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
    caption?: string; // chữ đi kèm video gửi thẳng
    video?: TgFile;
    document?: TgFile; // video gửi dạng file
  };
  callback_query?: { id: string; from: { id: number }; data?: string; message?: { message_id: number; chat: { id: number } } };
}

export interface TelegramApi {
  getUpdates(offset: number, timeoutSec: number): Promise<TgUpdate[]>;
  sendMessage(chatId: number, text: string, buttons?: TgButton[][]): Promise<void>;
  answerCallback(id: string, text?: string): Promise<void>;
  clearButtons(chatId: number, messageId: number): Promise<void>;
  downloadFile(fileId: string, dest: string): Promise<void>;
  sendVideo(chatId: number, file: string, caption?: string): Promise<void>;
}

const MAX_LEN = 4000;

export class TelegramClient implements TelegramApi {
  constructor(private token: string) {}

  private async call(method: string, body: Record<string, unknown>, timeoutMs = 60_000): Promise<any> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
    return data.result;
  }

  getUpdates(offset: number, timeoutSec: number): Promise<TgUpdate[]> {
    return this.call("getUpdates", { offset, timeout: timeoutSec, allowed_updates: ["message", "callback_query"] }, (timeoutSec + 15) * 1000);
  }

  async sendMessage(chatId: number, text: string, buttons?: TgButton[][]): Promise<void> {
    const body = text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}\n…` : text;
    await this.call("sendMessage", {
      chat_id: chatId,
      text: body,
      link_preview_options: { is_disabled: true },
      ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
    });
  }

  async answerCallback(id: string, text?: string): Promise<void> {
    await this.call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
  }

  async clearButtons(chatId: number, messageId: number): Promise<void> {
    await this.call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(() => undefined);
  }

  async downloadFile(fileId: string, dest: string): Promise<void> {
    const file = await this.call("getFile", { file_id: fileId });
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`);
    if (!res.ok || !res.body) throw new Error(`Không tải được video từ Telegram (${res.status}).`);
    await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
  }

  async sendVideo(chatId: number, file: string, caption?: string): Promise<void> {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("video", await openAsBlob(file, { type: "video/mp4" }), basename(file));
    form.append("supports_streaming", "true");
    if (caption) form.append("caption", caption.slice(0, 1000));
    const res = await fetch(`https://api.telegram.org/bot${this.token}/sendVideo`, { method: "POST", body: form, signal: AbortSignal.timeout(10 * 60_000) });
    const data: any = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(`Telegram sendVideo: ${data.description ?? res.status}`);
  }
}
