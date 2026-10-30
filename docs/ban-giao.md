# Bàn giao video-auto

Tài liệu này cho **người bàn giao** (chủ project) và **khách nhận**. Khách chỉ cần làm 3 việc: lấy code, mở bằng Claude Code, gõ `/video-auto`. Phần còn lại Claude dẫn từng bước.

## 1. Cách bàn giao: GitHub (private), không dùng zip

- Mời tài khoản GitHub của khách vào repo private (Settings → Collaborators), hoặc chuyển repo sang tài khoản của khách (Settings → Transfer ownership).
- Khách chạy:

  ```bash
  git clone https://github.com/<tài-khoản>/video-auto.git
  cd video-auto
  npm install
  ```
- Cập nhật sau này: `git pull` rồi `npm install`.
- Không dùng zip: không biết file nào đổi, mỗi lần cập nhật phải gửi lại cả bộ, dễ lọt `.env` (khóa API) hoặc `node_modules` (khoảng 1 GB).

## 2. Cái gì đi theo repo, cái gì không

| Có trong repo | Không có trong repo (khách tự tạo) |
|---|---|
| Code, skill (`.claude/skills/`), 2 agent đánh giá (`.claude/agents/`) | File `.env` (khóa ElevenLabs, token Telegram, Google) |
| **Kinh nghiệm edit** (`.claude/skills/video-auto/reference/KINH-NGHIEM-EDIT.md`), hỏi đáp, quy trình | `workspace/` (video, kết quả, tiến độ cài đặt, `ghi-nho.md`) |
| 24 sfx trong `assets/sfx/` và danh mục `catalog.yaml` | `config/local.yaml` (ghi đè cấu hình trên máy) |
| Font Be Vietnam Pro, preset phụ đề | Sổ tay riêng của Claude trên máy chủ project (`~/.claude/...`), **không** chuyển được |

Kinh nghiệm đã học từ chủ project được viết lại thành tài liệu trong repo, nên máy nào clone về cũng dùng được. Mỗi khách ghi nhận xét riêng của mình vào `workspace/ghi-nho.md`.

## 3. Việc khách phải tự làm

1. Cài Node.js 20.12+, FFmpeg, Git, Claude Code và đăng nhập Claude Code.
2. Tạo tài khoản **ElevenLabs**, lấy khóa API và voice ID. **Dùng gói trả phí** nếu chạy quảng cáo (gói Free không được dùng thương mại).
3. Tùy chọn: tạo bot Telegram (qua @BotFather), tạo ứng dụng Google OAuth nếu dùng Drive.
4. Sao lưu file `.env` (clone lại hoặc xóa thư mục là mất khóa).

Claude hướng dẫn đủ các việc này khi khách gõ `/video-auto`. Khách không cần đọc tài liệu.

## 4. Lưu ý trước khi bàn giao (người bàn giao kiểm tra)

- **Sfx:** 24 file trong `assets/sfx/` tạo bằng tài khoản ElevenLabs của chủ project (xem `assets/licenses/sfx.md`). Kiểm tra điều khoản ElevenLabs hiện hành xem khách có được dùng thương mại các file này không. Nếu không chắc, xóa các file `.mp3` trong `assets/sfx/` và để khách tạo lại bằng tài khoản của họ: `npm run sfx -- generate` (tốn credit, tạo bản nháp rồi `npm run sfx -- pick all 1`).
- **Mã nguồn bên thứ ba:** `assets/licenses/` ghi nguồn các font, ý tưởng tham khảo (MIT). Giữ nguyên các file này.
- **Không dùng thông tin cá nhân trong repo:** kiểm tra `git log` và các file không chứa khóa, email riêng, tên video của khách khác. `.env` và `workspace/` đã nằm trong `.gitignore`.
- **Video thử:** đừng đưa video của người khác (tải từ mạng) vào repo.

## 5. Kiểm tra sau khi bàn giao

Khách chạy `npm run setup -- status` thấy `machine` đều `ok: true`, rồi `npm test` thấy `fail 0`. Hoặc gõ `/video-auto`, Claude sẽ tự kiểm tra và làm tiếp.
