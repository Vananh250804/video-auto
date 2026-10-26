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

## Dùng với Claude Code

Mở Claude Code trong thư mục `video-auto`, nói ví dụ: "cắt khoảng lặng video này: <đường dẫn>". Claude tự đọc skill trong `.claude/skills/` để làm.
