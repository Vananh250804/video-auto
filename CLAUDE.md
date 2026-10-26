# video-auto

Hệ thống edit video tự động: nhận video thô từ Google Drive qua lệnh Telegram, cắt, thêm phụ đề tiếng Việt, giọng đọc AI, hiệu ứng chữ, render bằng FFmpeg + Remotion, trả kết quả lên Drive.

## Quy tắc làm việc

- Trả lời bằng tiếng Việt, ngắn gọn, đúng trọng tâm.
- Thiếu thông tin thì hỏi, không tự suy diễn.
- Trước khi làm việc lớn, đưa kế hoạch 3 đến 5 bước để người dùng duyệt.
- Không bao giờ sửa hoặc ghi đè video gốc. File tạm và kết quả nằm trong `workspace/jobs/<id>/`.
- Code phải chạy được trên cả Windows và macOS: dùng `node:path`, gọi FFmpeg bằng `spawn` với mảng tham số (không ghép chuỗi lệnh shell).

## Cấu trúc

- `.claude/skills/`: mỗi skill là một bước edit, có `SKILL.md` (hướng dẫn) và `scripts/` (lệnh chạy). Skill là nguồn hướng dẫn chính.
- `core/`: logic dùng chung. `core/media/` gọi ffmpeg/ffprobe.
- `integrations/`: mỗi nhà cung cấp một thư mục (tts, asr, llm, storage, delivery). Provider mặc định chọn trong `config/default.yaml`.
- `workflows/`: thứ tự các bước cho từng loại video (shop-ads, faceless, dubbing).
- `renderers/remotion/`: template theo tỉ lệ 9:16, 16:9, 1:1.
- `presets/`, `assets/`, `schemas/`, `prompts/` (chỉ cho lời gọi API trực tiếp).
- `bot/`: Telegram bot nhận lệnh, bot gọi Claude bằng `claude -p` (dùng tài khoản đã đăng nhập).
- `workspace/`: dữ liệu chạy, không commit.

## Lệnh

```bash
npm install
npm run probe -- <video>              # thông tin + tỉ lệ khung hình
npm run cut -- <video> --out <file>   # cắt khoảng lặng
npm test                              # cần ffmpeg
npm run typecheck
```

## Skill đã có

- `video-probe`: đọc tỉ lệ, độ dài, xoay
- `video-cut`: cắt khoảng lặng

Đang làm: `vn-subtitle`, `voiceover`, `script-review`, `edit-planner`, `remotion-render`, `video-qa`.
