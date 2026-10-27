---
name: setup-guide
description: Kiểm tra máy đã cài đủ cho video-auto chưa (Node, Git, FFmpeg, Claude Code, npm install, .env, ElevenLabs, Telegram, Google Drive, trình duyệt Remotion) và hướng dẫn người dùng cài từng bước trên macOS hoặc Windows. Dùng khi mở repo lần đầu, khi người dùng hỏi cách cài, hoặc khi hook SessionStart báo "máy chưa cài đủ".
---

# setup-guide

Người nhận bàn giao repo chỉ cần mở Claude Code trong thư mục `video-auto`. Hook `SessionStart` (`.claude/settings.json`) tự chạy `node scripts/doctor.mjs --hook` và đưa kết quả vào ngữ cảnh. Nếu báo thiếu, chủ động chào người dùng và bắt đầu hướng dẫn, không đợi họ hỏi.

## Cách chạy

```bash
node scripts/doctor.mjs          # bảng ✅ ❌ ⚠️ cho người đọc (npm run doctor cũng được)
node scripts/doctor.mjs --json   # cho agent: { os, ready, checks: [{ id, label, level, ok, detail, fix }] }
```

Script viết bằng JavaScript thuần, chạy được cả khi chưa `npm install`.

## Quy trình hướng dẫn

1. Chạy `node scripts/doctor.mjs --json`, đọc `os` để biết mac hay windows.
2. Báo ngắn gọn: đã có gì, còn thiếu gì. Mục `required` làm trước, `feature` làm sau.
3. Hướng dẫn **một bước một lần**: đưa đúng lệnh cho hệ điều hành đó (lấy từ `fix`, chi tiết hơn trong `docs/setup.md`), giải thích 1 câu bước đó để làm gì, rồi chờ người dùng báo xong.
4. Lệnh an toàn trong thư mục repo (`npm install`, `cp .env.example .env`, `npx remotion browser ensure`, `npm test`) thì hỏi người dùng có muốn mình chạy luôn không. Lệnh cài phần mềm vào máy (`brew`, `winget`) và đăng nhập (`claude`, `npm run drive:auth`) để người dùng tự chạy.
5. Sau mỗi bước, chạy lại doctor để xác nhận rồi sang bước tiếp.
6. Khi `ready` là true và các tính năng người dùng cần đều ✅: chạy `npm test`, rồi gợi ý thử `npm run bot`.

## Quy tắc

- Không bao giờ hỏi hay đọc giá trị key bí mật trong `.env`, không in ra màn hình, không ghi vào memory. Chỉ hướng dẫn người dùng tự dán vào `.env`.
- Hỏi người dùng cần tính năng nào (Telegram, Drive, giọng đọc) trước khi hướng dẫn phần `feature`. Ai chỉ thử trên máy thì gợi ý `storage: local` trong `config/local.yaml`, bỏ qua Drive.
- Windows: sau khi `winget install` phải đóng và mở lại terminal (và Claude Code) để nhận PATH mới.
- Lỗi lạ khi cài: xem `knowledge/known-errors.json` trước (lỗi đã gặp và cách sửa).
