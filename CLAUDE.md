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
npm run subtitle -- <video>           # phụ đề tiếng Việt (SRT + captions.json)
npm run voiceover -- <video> --script <file.txt>   # giọng đọc AI + phụ đề
npm run script -- write --brief "..." --seconds 30   # Claude viết kịch bản, chờ duyệt
npm run plan -- <video> --captions <captions.json> --workflow shop-ads --request "..." --out <edit.json>
npm run render -- <edit.json> --out <file.mp4>     # render thành phẩm (Remotion)
npm run studio                        # xem template Remotion
npm test                              # cần ffmpeg
npm run typecheck
```

## Skill đã có

- `video-probe`: đọc tỉ lệ, độ dài, xoay
- `video-cut`: cắt khoảng lặng
- `vn-subtitle`: phụ đề tiếng Việt từ lời nói
- `voiceover`: giọng đọc AI theo kịch bản, ghép vào video, phụ đề khớp giọng
- `remotion-render`: render từ `edit.json` (phụ đề kiểu TikTok, chữ highlight, sfx, nhạc)
- `edit-planner`: yêu cầu tự do → `edit.json` (Claude qua `claude -p`)
- `script-review`: Claude viết kịch bản, tự kiểm tra, chờ người dùng duyệt

Đang làm: `video-qa`, bot Telegram + Google Drive.

## Render

- `edit.json` là đầu vào duy nhất của render (schema `schemas/edit.schema.json`, kiểm tra trong `core/render/edit-spec.ts`). `edit-planner` sẽ sinh file này.
- Remotion: `renderers/remotion/`. Font Be Vietnam Pro nằm sẵn trong `assets/fonts/`, không tải từ mạng.
- Tất cả package `remotion` và `@remotion/*` phải cùng một phiên bản, ghi chính xác (không có `^`).

## Provider

- Giao diện chung: `core/contracts/providers.ts`. Thêm provider: viết class trong `integrations/<loại>/<tên>/`, đăng ký trong `integrations/registry.ts`.
- Hiện có: ElevenLabs (TTS + ASR), Claude (LLM, qua lệnh `claude -p`, chạy trong thư mục tạm để không nạp CLAUDE.md này). Vbee, Saydi, Whisper chờ thêm.
- Prompt gọi Claude tự động nằm trong `prompts/`. Claude phải trả JSON; code tự làm sạch, kiểm tra và hỏi lại 1 lần nếu sai.
