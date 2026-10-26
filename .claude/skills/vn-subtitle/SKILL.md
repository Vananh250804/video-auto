---
name: vn-subtitle
description: Tạo phụ đề tiếng Việt từ lời nói trong video (nhận giọng nói, chia dòng theo từ, xuất SRT và captions.json có thời điểm từng từ). Dùng khi video có người nói cần thêm sub.
---

# vn-subtitle

Tách tiếng → nhận giọng nói (mặc định ElevenLabs Scribe v2) → chia dòng phụ đề → xuất file.

## Cách chạy

```bash
npm run subtitle -- "video.mp4"
npm run subtitle -- "video.mp4" --out-dir "workspace/jobs/<id>/work"
```

Kết quả trong thư mục job:

- `subtitles.srt`: mở được bằng CapCut, Premiere, VLC
- `captions.json`: từng dòng kèm thời điểm từng từ, dùng cho `remotion-render` làm hiệu ứng highlight chữ
- `transcript.json`: toàn bộ lời nói gốc từ ASR

## Cần có

- `ELEVENLABS_API_KEY` trong `.env`
- Provider đổi trong `config/default.yaml` (`providers.asr`) hoặc `--asr <tên>`

## Quy tắc

- Chạy `video-probe` trước. `hasAudio` là `false` thì không làm phụ đề, đề nghị dùng `voiceover`.
- Nên chạy sau `video-cut`, để thời gian phụ đề khớp video đã cắt.
- Sau khi chạy, đọc `text` trong kết quả và báo người dùng các chỗ nghi sai: tên sản phẩm, tên shop, số tiền, từ lóng. Sửa trong `captions.json` và `subtitles.srt` nếu người dùng yêu cầu.
- Độ dài dòng chỉnh trong `config/default.yaml` (`subtitles.max_chars_per_line`): 9:16 nên 28 đến 32 ký tự, 16:9 có thể 42.
