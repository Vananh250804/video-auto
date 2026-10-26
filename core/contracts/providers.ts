// Giao diện chung cho các nhà cung cấp. Thêm provider mới = viết một class theo giao diện này
// trong integrations/<loại>/<tên>/ rồi đăng ký trong integrations/registry.ts.

export interface Word {
  text: string;
  start: number; // giây
  end: number;
}

export interface Transcript {
  language: string;
  text: string;
  words: Word[];
}

export interface AsrProvider {
  readonly name: string;
  transcribe(audioFile: string, opts: { language: string }): Promise<Transcript>;
}

export interface TtsOptions {
  language: string;
  voiceId?: string;
  model?: string;
}

export interface TtsResult {
  audioFile: string;
  // Thời điểm từng từ nếu provider trả về. Không có thì chạy ASR trên file giọng đọc.
  words?: Word[];
}

export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, outFile: string, opts: TtsOptions): Promise<TtsResult>;
}
