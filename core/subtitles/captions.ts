import type { Word } from "../contracts/providers.ts";

export interface Caption {
  start: number;
  end: number;
  text: string;
  words: Word[]; // giữ thời điểm từng từ để Remotion làm hiệu ứng highlight
}

export interface CaptionOptions {
  maxCharsPerLine: number;
  maxDurationSec: number;
  pauseBreakSec: number;
}

const SENTENCE_END = /[.!?…]["”')\]]*$/;
const CLAUSE_END = /[,;:]["”')\]]*$/;
const FILL_GAP_SEC = 0.3;

// Gom từng ký tự (TTS trả về) thành từ, tách theo khoảng trắng.
export function wordsFromCharAlignment(chars: string[], starts: number[], ends: number[]): Word[] {
  const words: Word[] = [];
  let text = "";
  let start = 0;
  let end = 0;
  chars.forEach((c, i) => {
    if (/\s/.test(c)) {
      if (text) words.push({ text, start, end });
      text = "";
      return;
    }
    if (!text) start = starts[i];
    text += c;
    end = ends[i];
  });
  if (text) words.push({ text, start, end });
  return words;
}

// Chia từ thành các dòng phụ đề: ngắt khi hết câu, khi người nói ngừng, khi dòng quá dài hoặc quá lâu.
export function buildCaptions(words: Word[], opts: CaptionOptions): Caption[] {
  const captions: Caption[] = [];
  let current: Word[] = [];

  const flush = () => {
    if (current.length === 0) return;
    captions.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: current.map((w) => w.text).join(" "),
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    if (current.length > 0) {
      const prev = current[current.length - 1];
      const length = current.reduce((n, w) => n + w.text.length + 1, 0) + word.text.length - 1;
      const tooLong = length > opts.maxCharsPerLine;
      const tooSlow = word.end - current[0].start > opts.maxDurationSec;
      const paused = word.start - prev.end > opts.pauseBreakSec;
      const sentenceDone = SENTENCE_END.test(prev.text);
      const clauseDone = CLAUSE_END.test(prev.text) && length > opts.maxCharsPerLine / 2;
      if (tooLong || tooSlow || paused || sentenceDone || clauseDone) flush();
    }
    current.push(word);
  }
  flush();

  // Lấp khoảng trống ngắn giữa hai dòng để phụ đề không bị nháy
  for (let i = 0; i < captions.length - 1; i++) {
    const gap = captions[i + 1].start - captions[i].end;
    if (gap > 0 && gap < FILL_GAP_SEC) captions[i].end = captions[i + 1].start;
  }
  return captions;
}

function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(ms % 1000, 3)}`;
}

export function toSrt(captions: Caption[]): string {
  return captions
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}
