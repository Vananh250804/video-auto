# Cài đặt

## Cách nhanh nhất: để Claude hướng dẫn

1. Cài [Claude Code](https://code.claude.com/docs/en/setup) và đăng nhập (gõ `claude` trong terminal)
2. Lấy code (`git clone`, xem bên dưới), mở Claude Code trong thư mục `video-auto`
3. Claude tự chạy kiểm tra máy và hướng dẫn cài từng bước còn thiếu. Lần đầu mở, Claude Code hỏi có tin thư mục này không: chọn Yes để bước kiểm tra tự chạy.

Tự kiểm tra bất cứ lúc nào: `node scripts/doctor.mjs` (hoặc `npm run doctor`). ✅ là xong, ❌ là bắt buộc phải làm, ⚠️ là tính năng chưa nối.

## Cài tay

Cần 3 thứ: **Node.js 20+**, **FFmpeg**, **Git**. Sau đó là **Claude Code** để dùng skill.

## macOS

```bash
# 1. Cài Homebrew nếu chưa có: https://brew.sh
brew install node ffmpeg git

# 2. Lấy code
cd ~
git clone https://github.com/Vananh250804/video-auto.git
cd video-auto
npm install
cp .env.example .env
```

## Windows

Mở **PowerShell** và chạy:

```powershell
# 1. Cài công cụ (đóng và mở lại PowerShell sau khi cài)
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git

# 2. Lấy code
cd $HOME
git clone https://github.com/Vananh250804/video-auto.git
cd video-auto
npm install
copy .env.example .env
```

## Kiểm tra

```bash
ffmpeg -version
node -v
npm test
```

`npm test` tự tạo video mẫu, kiểm tra nhận tỉ lệ và cắt khoảng lặng. Thấy `fail 0` là ổn.

Nếu báo không tìm thấy `ffmpeg`: điền đường dẫn đầy đủ vào `.env`, ví dụ Windows `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe` và `FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe`.

## Dùng thử

```bash
npm run probe -- "video-cua-ban.mp4"
npm run cut -- "video-cua-ban.mp4" --dry-run
npm run cut -- "video-cua-ban.mp4" --out "workspace/cut.mp4"
```

## ElevenLabs (phụ đề + giọng đọc)

1. Đăng ký tại [elevenlabs.io](https://elevenlabs.io), vào **Developers → API Keys**, tạo key, dán vào `.env`: `ELEVENLABS_API_KEY=...`
2. Vào **Voices**, chọn hoặc thêm một giọng tiếng Việt vào My Voices, bấm **Copy voice ID**, dán vào `.env`: `ELEVENLABS_VOICE_ID=...`
3. Thử:

```bash
npm run subtitle -- "video-co-nguoi-noi.mp4"
npm run voiceover -- "video.mp4" --text "Chào các bạn, đây là giọng đọc thử."
```

Kết quả nằm trong `workspace/jobs/<tên-video>-<thời-gian>/`.

## Render thành phẩm (Remotion)

![Mẫu phụ đề tiktok + chữ highlight](images/render-mau-tiktok.png)

```bash
npm run render -- --video "video.mp4" --captions "workspace/jobs/<id>/captions.json" --style tiktok --out "workspace/final.mp4"
```

- Lần đầu Remotion tự tải Chrome Headless Shell (khoảng 100 MB). Nên tải trước bằng `npx remotion browser ensure`, nếu không `npm test` có thể báo hết giờ ở bài test render.
- `npm run studio` mở trình duyệt để xem và chỉnh giao diện phụ đề, chữ highlight.
- Giấy phép Remotion: miễn phí cho cá nhân và công ty tối đa 3 người. Đông hơn cần mua license tại remotion.pro.

## Claude tự động (kịch bản, hiểu yêu cầu)

Bot gọi lệnh `claude -p` trên máy, dùng tài khoản Claude bạn đã đăng nhập, không cần API key.

1. Cài Claude Code: xem [hướng dẫn chính thức](https://code.claude.com/docs/en/setup)
2. Mở terminal, gõ `claude`, đăng nhập một lần
3. Thử:

```bash
npm run script -- write --brief "Túi da nữ màu kem, giá 299 nghìn, freeship" --seconds 25
```

Mỗi lần gọi tính vào hạn mức tài khoản Claude của bạn.

Bot báo không tìm thấy lệnh `claude`: mở terminal gõ `which claude` (Windows: `where claude`), dán đường dẫn vào `.env`, ví dụ `CLAUDE_PATH=/Users/mac/.local/bin/claude`, rồi chạy lại bot.

## Bot Telegram

1. Trên Telegram, nhắn [@BotFather](https://t.me/BotFather): `/newbot`, đặt tên, nhận **token**. Dán vào `.env`: `TELEGRAM_BOT_TOKEN=...`
2. Chạy `npm run bot`, nhắn bất kỳ cho bot. Bot trả lời **chat id** của bạn. Dán vào `.env`: `TELEGRAM_ALLOWED_CHAT_IDS=<chat id>` (nhiều người thì cách nhau dấu phẩy)
3. Tắt bot (Ctrl+C) và chạy lại `npm run bot`. Gõ `/help` để xem lệnh.

Hai cách gửi video:
- **Gửi thẳng vào chat** (video dưới 20 MB), ghi lệnh ở phần chú thích: `/ads làm nổi giá và chữ freeship`
- **Video lớn hơn**: up lên Drive, gửi tin nhắn chữ `/ads <link Drive> làm nổi giá`

Video đã edit dưới 50 MB được bot gửi thẳng về chat, kèm link Drive. Đây là giới hạn của Telegram cho bot.

### Cho bot tự chạy nền

Test ổn với `npm run bot` rồi thì tắt nó (Ctrl+C) và cài chạy nền, để bot tự bật mỗi khi đăng nhập máy và tự chạy lại nếu bị tắt:

```bash
npm run bot:install     # cài và bật luôn
npm run bot:status      # xem bot có đang chạy không
npm run bot:uninstall   # gỡ
```

- Nhật ký bot ghi vào `workspace/logs/bot.log`. Bot im lặng thì mở file này xem lỗi.
- Sau khi `git pull` code mới hoặc sửa `.env`: chạy lại `npm run bot:install` để bot nạp bản mới.
- Đã cài chạy nền thì không chạy thêm `npm run bot`, vì Telegram chỉ cho một nơi nhận tin của bot.
- Máy phải bật và không ngủ. macOS: bot tự giữ máy thức khi đang chạy (vẫn ngủ khi gập máy). Windows: Settings → System → Power → Sleep: Never (khi cắm sạc).
- Cài đặt nhớ đường dẫn của `ffmpeg` và `claude` lúc bạn chạy lệnh, nên chạy `bot:install` từ Terminal mà `npm run bot` đã chạy được.

## Google Drive

Làm một lần, khoảng 10 phút:

1. Vào [Google Cloud Console](https://console.cloud.google.com), tạo project mới (ví dụ `video-auto`)
2. **APIs & Services → Library**: tìm **Google Drive API**, bấm Enable. Quên bước này thì job báo `Google Drive 403: Google Drive API has not been used in project...`: mở link trong lỗi, bấm Enable, đợi 1 đến 2 phút rồi gửi `/retry <mã job>`
3. **APIs & Services → OAuth consent screen** (Google Auth Platform): chọn External, điền tên app và email. Ở mục **Audience**, thêm email của bạn vào Test users, rồi bấm **Publish app** (chuyển sang In production). Nếu để Testing, đăng nhập sẽ hết hạn sau 7 ngày
4. **Clients → Create client**: loại **Desktop app**. Copy Client ID và Client secret vào `.env`: `GOOGLE_CLIENT_ID=...`, `GOOGLE_CLIENT_SECRET=...`
5. Chạy `npm run drive:auth`, mở link hiện ra, đăng nhập. Google báo "app chưa xác minh" thì bấm Advanced → Go to video-auto (đây là app của chính bạn). Token tự lưu vào `.env`
6. Trên Drive, tạo 2 thư mục `Video gốc` và `Video đã edit`. Mở từng thư mục, copy phần id cuối link (`drive.google.com/drive/folders/<id>`) vào `.env`: `GOOGLE_DRIVE_INPUT_FOLDER_ID=...`, `GOOGLE_DRIVE_OUTPUT_FOLDER_ID=...`

Chưa muốn nối Drive: đặt `storage: local` trong `config/local.yaml`, bỏ video vào `workspace/inbox`, kết quả ra `workspace/outbox`.

## Chạy cả luồng không cần Telegram

```bash
npm run job -- "https://drive.google.com/file/d/.../view" --workflow shop-ads --request "làm nổi giá 199k"
npm run job -- "video.mp4" --storage local --workflow dubbing --script "Câu thuyết minh..."
npm run job -- --resume "workspace/jobs/<id>"   # chạy tiếp job bị lỗi
```

## Học từ góp ý, lỗi và video mẫu

Hệ thống ghi nhớ vào thư mục `knowledge/` (có commit lên git, người nhận bàn giao cũng dùng được):

- **Góp ý**: khi bấm ✏️ Sửa kịch bản, hoặc gửi `/sua <mã job> <yêu cầu>` cho video đã xong (bỏ mã job = job gần nhất), bot làm lại video và nhờ Claude rút góp ý thành quy tắc chung. Các video sau tự làm theo. `/baihoc` xem, `/quen <mã>` bỏ quy tắc sai.
- **Lỗi**: job lỗi được ghi vào `workspace/logs/errors.jsonl`. Lỗi đã gặp (có trong `knowledge/known-errors.json`) thì bot gửi kèm cách sửa. Trong Claude Code, nói "xem các lỗi gần đây" để Claude rà và bổ sung cách sửa.
- **Video đối thủ**: gửi video vào bot kèm chú thích `/hocvideo doi-thu-a` (hoặc `/hocvideo doi-thu-a <link Drive>`). Bot đo nhịp cắt, tách lời, xem khung hình, rồi gửi lại tóm tắt phong cách. Dùng: `/ads style:doi-thu-a làm nổi giá`, `/faceless style:doi-thu-a <nội dung>`.

Hệ thống chưa ghép nhiều cảnh hay làm hiệu ứng chuyển cảnh, nên phần cách quay và chuyển cảnh của đối thủ được gửi thành "Gợi ý khi quay" để bạn tham khảo.

Bot ghi vào `knowledge/` trên máy chạy bot. Thỉnh thoảng lưu lên git:

```bash
git add knowledge && git commit -m "Cập nhật bài học" && git push
```

## Dùng với Claude Code

Mở Claude Code trong thư mục `video-auto`, nói ví dụ: "cắt khoảng lặng video này: <đường dẫn>". Claude tự đọc skill trong `.claude/skills/` để làm.
