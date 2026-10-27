---
name: style-learn
description: Học phong cách từ video mẫu (video đối thủ): đo số cảnh và nhịp cắt, tách lời thuyết minh, lấy khung hình, nhờ Claude rút ra hook, cấu trúc, giọng văn, chuyển cảnh, chữ trên màn hình, rồi lưu thành quy tắc trong knowledge/styles/. Dùng khi người dùng đưa video để học theo, hoặc muốn edit "giống video này".
---

# style-learn

Đầu vào là **file video** người dùng đưa (gửi Telegram, link Drive, hoặc đường dẫn trên máy). Không tải từ link TikTok. Video mẫu không bị sửa, file tạm nằm trong `workspace/jobs/<tên>-<thời-gian>/`.

## Cách chạy

```bash
npm run learn-style -- learn "video-doi-thu.mp4" --name doi-thu-a --note "học cách mở đầu và nhịp nói"
npm run learn-style -- list
npm run learn-style -- show doi-thu-a
```

Telegram: gửi video kèm chú thích `/hocvideo doi-thu-a`, hoặc `/hocvideo doi-thu-a <link Drive>`.

## Các bước bên trong (`core/knowledge/style-learn.ts`)

1. `probe`: tỉ lệ, độ dài
2. Dò chuyển cảnh bằng ffmpeg `select='gt(scene,0.3)'` → danh sách cảnh, độ dài trung bình, số lần cắt mỗi phút (`core/media/scenes.ts`)
3. Tách lời bằng ASR (ElevenLabs) → lời thuyết minh có thời gian, tốc độ nói
4. Lấy tối đa 12 khung hình (giữa mỗi cảnh, rộng 360px)
5. `claude -p` xem số liệu + lời + ảnh (prompt `prompts/learning/style.md`), trả `summary`, `analysis`, `rules.script`, `rules.edit`
6. Lưu `knowledge/styles/<tên>.json`

## Dùng phong cách đã học

- Telegram: thêm `style:<tên>` vào lệnh, ví dụ `/ads style:doi-thu-a làm nổi giá`, `/faceless style:doi-thu-a Giới thiệu túi da...`
- Dòng lệnh: `npm run job -- <video> --workflow faceless --brief "..." --style doi-thu-a`
- `rules.script` được chèn vào prompt viết kịch bản, `rules.edit` vào prompt lên hiệu ứng.

## Quy tắc

- Học phong cách, không chép lời. Không dùng lại nguyên câu của đối thủ trong kịch bản.
- Hệ thống chưa ghép nhiều cảnh hay làm hiệu ứng chuyển cảnh, nên phần quay và chuyển cảnh chỉ nằm trong `analysis.shooting_tips` để người quay tham khảo.
- Trình kết quả cho người dùng bằng tóm tắt ngắn (như `styleSummary`). Người dùng muốn chỉnh thì sửa trực tiếp `rules` trong file JSON.
- File trong `knowledge/` được commit lên git: nhắc người dùng commit sau khi học xong.
