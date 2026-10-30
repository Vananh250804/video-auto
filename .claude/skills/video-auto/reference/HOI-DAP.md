# Hỏi đáp thường gặp

Khi khách hỏi về cài đặt, khóa, lỗi, trả lời theo đây bằng lời thường. Không có đáp án ở đây thì chạy `npm run setup -- check all`, đọc kết quả và giải thích.

## A. Bắt đầu

**Cần chuẩn bị gì?** Máy Windows 10/11 hoặc macOS, Node.js 20.12 trở lên, FFmpeg, Git, Claude Code (đã đăng nhập), khóa ElevenLabs. Tùy chọn: bot Telegram, Google Drive.

**Lấy project thế nào, cập nhật thế nào?** Lấy: `git clone` repo được bàn giao. Cập nhật: `git pull` rồi `npm install`. Khóa nằm trong `.env`, không bị ghi đè khi cập nhật.

**Mở project trong Claude Code thế nào?** Ứng dụng Claude → Code → chọn thư mục video-auto, hoặc mở dòng lệnh ở thư mục đó rồi gõ `claude`. Gõ `/video-auto` để bắt đầu.

**Gõ `/video-auto` không thấy gì?** Chưa mở đúng thư mục project (thư mục có `.claude/skills/video-auto`). Mở lại đúng thư mục, hoặc mở phiên mới.

**Đang cài dở thì tắt máy?** Không sao. Gõ `/video-auto` lần nữa, mình đọc tiến độ và làm tiếp từ bước còn thiếu.

## B. Cài phần mềm

**Báo "node / ffmpeg is not recognized" (không nhận lệnh)?** Vừa cài xong thì đóng hẳn cửa sổ dòng lệnh và mở lại. Vẫn không được: điền đường dẫn đầy đủ vào `.env`, ví dụ `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`, `FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe`. Rồi `npm run setup -- check ffmpeg`.

**`npm install` báo lỗi?** Kiểm Node ≥ 20.12 (`node -v`). Lỗi mạng thì chạy lại. Lỗi quyền ghi thì chọn thư mục project nằm trong thư mục cá nhân, không để trong thư mục hệ thống. Nếu vẫn lỗi, gửi nguyên văn dòng lỗi cho mình.

**Lần render đầu rất lâu?** Remotion đang tải trình duyệt Chrome Headless (khoảng 100 MB). Chỉ tải một lần, cần mạng.

**Máy yếu có chạy được không?** Được. Mọi xử lý nặng (nhận giọng, giọng đọc) chạy trên ElevenLabs. Máy chỉ dựng video bằng FFmpeg và Remotion, video 1 phút mất vài phút.

## C. Claude Code

**Claude Code báo hết lượt dùng?** Chờ đến khi hết giới hạn hoặc nâng gói. Việc đang dở lưu ở `workspace/jobs/<id>/`, lần sau tiếp tục.

**Bot Telegram không trả lời?** Bot gọi Claude bằng tài khoản đã đăng nhập trên máy. Kiểm `npm run setup -- check claude`, `npm run bot:status`. Máy phải đang bật.

## D. Khóa API và dịch vụ

**Khóa lưu ở đâu, có bị gửi đi đâu không?** Chỉ nằm trong file `.env` trên máy này, không commit. Project **không gửi báo cáo** hay dữ liệu nào về người bàn giao. Khóa chỉ đi tới chính dịch vụ của nó (ElevenLabs, Telegram, Google).

**Nhập hoặc đổi khóa thế nào cho an toàn?** `npm run setup -- open-env`, dán giá trị sau dấu `=`, lưu file. Hoặc nhờ mình ghi (khóa sẽ đi qua khung chat).

**Cần sao lưu gì?** File `.env`. Xóa project hay clone lại là mất khóa.

**`check elevenlabs` báo khóa sai?** Tạo khóa mới ở elevenlabs.io → Developers → API Keys, dán lại.

**Báo thiếu ELEVENLABS_VOICE_ID hoặc Voice ID không đúng?** Vào Voices, thêm giọng vào My Voices rồi bấm Copy voice ID.

**Gói ElevenLabs nào?** Gói Free **không được dùng thương mại** và phải ghi nguồn. Chạy quảng cáo bán hàng thì dùng gói trả phí. Mỗi lần nhận giọng hay tạo giọng đọc tốn credit.

**Âm thanh hiệu ứng (sfx) lấy đâu?** Có sẵn 24 file trong `assets/sfx/`. Tạo thêm bằng `npm run sfx -- generate` (tốn credit, nên hỏi trước). Xem `assets/licenses/sfx.md` về quyền sử dụng.

**Telegram `telegram-chat` không thấy chat?** Chưa bấm Start với bot. Mở bot, gõ `/start`, chạy lại.

**Video gửi qua Telegram bị từ chối?** Bot chỉ tải được ≤ 20 MB và gửi lại ≤ 50 MB. Video lớn hơn thì dùng Google Drive hoặc thư mục `workspace/inbox`.

**Google Drive báo 403?** Chưa bật Google Drive API cho ứng dụng. Xem mục Google Drive trong `docs/setup.md`.

## E. Chất lượng video

**Phụ đề sai chữ?** Máy nhận giọng nghe sai tên, số, tiếng lóng. Nói mình biết chữ đúng, mình sửa trong `captions.json` rồi render lại.

**Chữ che mặt người nói?** Nói mình biết, mình đổi vị trí chữ (top, center, bottom) rồi render lại.

**Zoom nhiều quá / ít quá?** Nói mức khách muốn, mình sửa `zooms` trong `edit.json`.

**Video có từ bị chặn quảng cáo?** Mình báo khi thấy ("tốt nhất", "đảm bảo", từ thô tục...). Khách quyết cắt hay giữ.

**Video bị to / nhỏ tiếng?** `npm run loudnorm` đưa về -14 LUFS, mức hợp với TikTok.
