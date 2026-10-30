# Cài đặt lần đầu: kịch bản hướng dẫn khách

Chạy file này khi `npm run setup -- status` trả `"onboarded": false`. Đi **đúng thứ tự** các bước dưới đây, **mỗi lượt chỉ một bước**: nói ngắn, hỏi một câu, chờ khách trả lời rồi mới sang bước sau. Dùng công cụ hỏi lựa chọn (AskUserQuestion) khi bước có phương án sẵn. Giọng thân thiện, rõ ràng, không thuật ngữ thừa; khách có thể là người mới.

Khách bỏ ngang giữa chừng thì lần sau đọc `status` và **tiếp từ `nextStep`**, không hỏi lại từ đầu. Mỗi bước xong thì ghi nhận bằng `npm run setup -- step <tên>`. Bước tùy chọn mà khách không muốn thì `step <tên> --skip`.

Máy chạy Windows hay macOS đều được. Mọi lệnh dưới đây là `npm run`, chạy ở thư mục gốc project.

---

## Bước 1 · hello: chào hỏi

- Chào khách, tự giới thiệu là **trợ lý dựng video của video-auto**.
- Hỏi **tên** và **muốn được gọi thế nào** (anh/chị/bạn + tên).
- Lưu: `npm run setup -- init --name "<tên>" --call "<cách gọi>"`. Từ đây luôn gọi khách theo cách đó.
- Giới thiệu 4 đến 5 dòng: video-auto nhận video thô, cắt đoạn thừa, thêm phụ đề tiếng Việt, chữ nhấn mạnh, tiếng động, âm lượng chuẩn, giọng đọc AI nếu cần. Có hai kiểu hay dùng: video một shot bán hàng, và video faceless dùng giọng đọc.
- Nói trước sẽ cần: một **khóa ElevenLabs** (nhận giọng nói, giọng đọc, tiếng động), tùy chọn **bot Telegram** và **Google Drive**.

## Bước 2 · machine: kiểm máy

Tự làm, chỉ báo kết quả ngắn. Đọc phần `machine` trong `status`, hoặc chạy `npm run setup -- check node`, `check ffmpeg`, `check deps`.

- **Node 20.12 trở lên:** thiếu thì chỉ tải bản LTS ở nodejs.org (Windows: `winget install OpenJS.NodeJS.LTS`, macOS: `brew install node`).
- **FFmpeg:** thiếu thì `winget install Gyan.FFmpeg` (Windows), `brew install ffmpeg` (macOS). Cài xong **đóng và mở lại cửa sổ dòng lệnh**. Vẫn không nhận thì điền đường dẫn đầy đủ vào `FFMPEG_PATH`, `FFPROBE_PATH` trong `.env`.
- **Thư viện:** `deps` báo chưa có thì chạy `npm install` (vài phút, báo khách chờ).
- **Claude Code:** `npm run setup -- check claude`. Chỉ cần khi dùng bot Telegram hoặc lệnh `plan`. Báo kết quả, chưa cài được thì ghi nhận và vẫn đi tiếp.
- Lần render đầu tiên Remotion tự tải trình duyệt Chrome Headless (khoảng 100 MB), cần mạng. Báo trước cho khách.
- Thiếu gì chưa cài được thì ghi nhận, **vẫn đi tiếp** các bước sau. Xong thì `step machine`.

## Bước 3 · voice: khóa ElevenLabs

1. Hướng dẫn: đăng ký ở elevenlabs.io, vào **Developers → API Keys**, tạo khóa. Nói rõ: **gói Free không được dùng thương mại**, nếu chạy quảng cáo bán hàng nên dùng gói trả phí.
2. **Nhập khóa an toàn** (mục cuối file). Tên khóa: `ELEVENLABS_API_KEY`.
3. Vào **Voices**, chọn hoặc thêm một giọng tiếng Việt vào My Voices, bấm **Copy voice ID**, nhập vào `ELEVENLABS_VOICE_ID` (giống cách trên).
4. Kiểm: `npm run setup -- check elevenlabs`. Lỗi thì đọc `message`, giải thích bằng lời thường (sai khóa, chưa thêm giọng vào My Voices), cho thử lại.
5. Đọc thử: `npm run setup -- test-voice`, báo đường dẫn file để khách mở nghe. Chưa ưng giọng thì đổi voice ID và thử lại.
6. Xong thì `step voice`.

## Bước 4 · telegram: bot Telegram (tùy chọn)

Hỏi: **"Bạn có muốn gửi video về chat Telegram và ra lệnh dựng video bằng Telegram không?"** (nút: Có / Không).

- **Không** → `step telegram --skip`, nói video sẽ nằm trong `workspace/jobs/<id>/output/`.
- **Có** → hướng dẫn **từng bước, chờ khách xác nhận xong mỗi bước**:
  1. Mở Telegram, tìm **@BotFather** (có dấu tích xanh), bấm **Start**.
  2. Gõ `/newbot`, đặt tên hiển thị, rồi username kết thúc bằng `bot`.
  3. BotFather trả một dòng token dạng `123456789:AA…`: đây là **mật khẩu của bot**, không chia sẻ cho ai.
  4. Nhập vào `TELEGRAM_BOT_TOKEN` (mục "Nhập khóa an toàn").
  5. Khách bấm link `t.me/<username>` BotFather đưa, bấm **Start**.
  6. `npm run setup -- telegram-chat` lấy chat id, nhập vào `TELEGRAM_ALLOWED_CHAT_IDS` (chỉ chat trong danh sách này dùng được bot).
  7. `npm run setup -- check telegram`.
  8. Muốn bot chạy nền, tự bật khi đăng nhập máy: `npm run bot:install`. Bot cần Claude Code đã đăng nhập (`check claude`).
- Lưu ý cho khách: bot chỉ tải được video ≤ 20 MB và gửi lại ≤ 50 MB; file lớn hơn thì gửi qua link Google Drive hoặc đặt file vào thư mục.

## Bước 5 · storage: nơi nhận và trả video (tùy chọn)

Hỏi chọn một:
- **Thư mục trên máy** (mặc định, đơn giản): bỏ video vào `workspace/inbox`, kết quả ra `workspace/outbox`. `step storage --skip`.
- **Google Drive:** cần tài khoản Google, một ứng dụng OAuth (Google Cloud Console), và hai thư mục Drive (nhận, trả). Hướng dẫn từng bước theo mục Drive trong [docs/setup.md](../../../docs/setup.md) nếu có, nhập `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, id hai thư mục; chạy `npm run drive:auth` để đăng nhập một lần; `npm run setup -- check drive`; rồi đặt `providers.storage: google-drive` trong `config/local.yaml`.

Xong thì `step storage` (hoặc `--skip`).

## Bước 6 · sample: edit video đầu tiên

1. Nhờ khách gửi **một video ngắn** có người nói (điện thoại quay cũng được, dưới 1 phút). Khách không có thì `step sample --skip` và nói khi nào có video thì gõ `/video-auto`.
2. Làm đúng vòng làm việc ở SKILL.md mục 2, nhưng **gọn**: probe, nhận giọng, `qa --sheet`, kế hoạch edit, render, `qa`, `loudnorm`. Hỏi khách trước khi tốn credit nhận giọng.
3. Gửi video, hỏi khách thấy thế nào, ghi nhận xét vào `workspace/ghi-nho.md`.
4. `step sample`.

## Bước 7 · hoàn tất

1. `npm run setup -- done`.
2. Tóm tắt cấu hình bằng một bảng ngắn (máy · ElevenLabs · Telegram · lưu trữ · video thử) và **không in khóa**.
3. Hướng dẫn cách dùng: "Gửi video và nói **edit video này** là mình bắt đầu."
4. Nhắc: muốn đổi khóa hay dịch vụ thì nói "đổi cấu hình".
5. Nhắc sao lưu file `.env`: clone lại project hay xóa thư mục sẽ mất khóa.

---

## Nhập khóa an toàn

Ưu tiên cách 1. Không bao giờ nhắc lại khóa trong câu trả lời, không ghi khóa vào file nào khác ngoài `.env`.

1. **Khách tự dán vào file (khuyên dùng):** chạy `npm run setup -- open-env`. File `.env` mở trong trình soạn thảo, khách dán giá trị sau dấu `=` của đúng dòng, lưu file, báo "xong". Khóa không đi qua cuộc trò chuyện.
2. **Khách dán khóa vào khung chat:** ghi bằng stdin, không đặt khóa trong tham số dòng lệnh:
   ```bash
   # macOS / Git Bash
   printf '%s' '<khóa>' | npm run setup -- set-key ELEVENLABS_API_KEY
   ```
   ```powershell
   # Windows PowerShell
   '<khóa>' | npm run setup -- set-key ELEVENLABS_API_KEY
   ```
   Sau đó nhắc khách: khóa đã đi qua cuộc trò chuyện; nếu muốn chặt chẽ hơn thì tạo khóa mới và dán theo cách 1.
