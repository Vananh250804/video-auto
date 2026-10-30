// Kiểm tra kịch bản không cần AI: độ dài so với thời lượng, cách viết số tiền, từ dễ bị TikTok chặn quảng cáo.

export interface ScriptIssue {
  type: "length" | "money" | "claim" | "sentence";
  message: string;
}

export interface ScriptCheck {
  words: number;
  estimatedSec: number;
  issues: ScriptIssue[];
}

// Cụm từ quảng cáo tuyệt đối hoặc công dụng y tế, dễ bị từ chối khi chạy ads
export const RISKY_PHRASES = [
  "tốt nhất", "số 1", "số một", "rẻ nhất", "duy nhất", "100%", "cam kết", "đảm bảo",
  "chữa khỏi", "chữa bệnh", "điều trị", "đặc trị", "khỏi hẳn", "thần kỳ", "giảm cân", "vĩnh viễn",
];

const MONEY_ABBR = /(\d+(?:[.,]\d+)?)\s?(k|K|tr)(?![\p{L}])/gu;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function checkScript(text: string, opts: { targetSec?: number; wordsPerSecond: number }): ScriptCheck {
  const issues: ScriptIssue[] = [];
  const words = countWords(text);
  const estimatedSec = Math.round((words / opts.wordsPerSecond) * 10) / 10;

  if (opts.targetSec) {
    const ratio = estimatedSec / opts.targetSec;
    if (ratio > 1.15) issues.push({ type: "length", message: `Kịch bản dài khoảng ${estimatedSec}s, vượt mục tiêu ${opts.targetSec}s. Nên bớt khoảng ${Math.ceil(words - opts.targetSec * opts.wordsPerSecond)} từ.` });
    else if (ratio < 0.7) issues.push({ type: "length", message: `Kịch bản chỉ khoảng ${estimatedSec}s, ngắn hơn nhiều so với ${opts.targetSec}s.` });
  }

  for (const m of text.matchAll(MONEY_ABBR)) {
    const unit = m[2] === "tr" ? "triệu" : "nghìn";
    issues.push({ type: "money", message: `"${m[0]}" nên viết "${m[1]} ${unit}" để giọng AI đọc đúng.` });
  }

  const lower = text.toLowerCase();
  for (const phrase of RISKY_PHRASES) {
    if (lower.includes(phrase)) issues.push({ type: "claim", message: `Có cụm "${phrase}": dễ bị TikTok từ chối quảng cáo, nên đổi cách nói.` });
  }

  for (const sentence of text.split(/[.!?…\n]+/)) {
    const n = countWords(sentence);
    if (n > 30) issues.push({ type: "sentence", message: `Câu quá dài (${n} từ): "${sentence.trim().slice(0, 40)}...". Nên tách câu cho giọng đọc ngắt nghỉ tự nhiên.` });
  }
  return { words, estimatedSec, issues };
}
