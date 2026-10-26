# Cài đặt

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

- Lần đầu Remotion tự tải Chrome Headless Shell (khoảng 100 MB).
- `npm run studio` mở trình duyệt để xem và chỉnh giao diện phụ đề, chữ highlight.
- Giấy phép Remotion: miễn phí cho cá nhân và công ty tối đa 3 người. Đông hơn cần mua license tại remotion.pro.

## Dùng với Claude Code

Mở Claude Code trong thư mục `video-auto`, nói ví dụ: "cắt khoảng lặng video này: <đường dẫn>". Claude tự đọc skill trong `.claude/skills/` để làm.
