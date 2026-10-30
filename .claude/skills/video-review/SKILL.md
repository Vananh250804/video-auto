---
name: video-review
description: Đánh giá nội dung video bán hàng / faceless trước hoặc sau khi edit - hook 3 giây đầu có hay không (chấm /10 theo PM2), có lan man không, hình có rõ sản phẩm không, lời và hình có khớp không. Hai sub-agent đánh giá chéo độc lập (lời nói và hình ảnh) rồi ghép thành một báo cáo có kết luận và việc sửa cụ thể. Dùng khi người dùng gửi video và hỏi hook có hay không, video có lan man không, hoặc trước khi lên edit.json cho video one-shot.
---

# video-review

Luật chấm: `references/pm2-shop-ads.md` (PM2 bản bán hàng). Bản gốc: `references/pm2-original.md` (dùng nguyên cho kịch bản faceless/kể chuyện).

## Cách chạy

1. **Tạo gói đánh giá** (lời nói có mốc giây, số liệu, khung hình 0–3s dày + mỗi 3 giây):

```bash
# Đã có phụ đề (vn-subtitle) thì truyền vào, khỏi nhận giọng lại
npm run review -- "<video>" --captions "<captions.json>" --out-dir "workspace/jobs/<id>/review" \
  --brief "sản phẩm, giá thật, ưu đãi, điều người bán muốn nhấn"

# Chưa có phụ đề: tự nhận giọng (tốn credit ElevenLabs)
npm run review -- "<video>" --out-dir "workspace/jobs/<id>/review"
```

Kết quả: `transcript.md`, `stats.json` (tỉ lệ có lời, từ/giây, đoạn không lời, câu đệm, từ rủi ro, lần nhắc giá, CTA), `frames/`, `sheet.png`, `brief.txt`.

2. **Gọi 2 sub-agent song song, trong cùng một lượt** (Agent tool, mỗi agent chỉ nhận đường dẫn thư mục gói + brief, không kể cho agent này nghe agent kia thấy gì, để hai bên độc lập):
   - `hook-content-critic`: chỉ đọc lời nói.
   - `visual-critic`: chỉ xem khung hình.

   Nếu agent chưa nạp được (vừa tạo file, phiên chưa khởi động lại), dùng `general-purpose` và dặn nó đọc rồi làm đúng theo `.claude/agents/<tên>.md`.

3. **Đối chiếu chéo** (bạn tự làm, không gọi thêm agent): trả lời các mục "Cần đối chiếu hình" của agent lời bằng khung hình, và "Cần đối chiếu lời" của agent hình bằng `transcript.md`. Tìm chỗ lệch:
   - Lời nói tính năng ở `a s` mà hình chưa thấy (`VISUAL_VOICE_MISMATCH`).
   - Đoạn không lời agent lời nghi thừa nhưng agent hình thấy có demo (giữ lại, có thể rút).
   - Hook lời mạnh nhưng hình 0–3s yếu, hoặc ngược lại.
   - Hai agent đề xuất kết luận khác nhau: chọn kết luận **nặng hơn** nếu lỗi đó là lỗi chặn (giá, quảng cáo), nếu không thì nêu cả hai và lý do chọn.

4. **Viết báo cáo** theo mẫu D2 vào `<gói>/report.md`, trình người dùng bản tóm tắt: điểm hook, 3 việc sửa, kết luận. Cuối báo cáo có mục "Gợi ý cho edit-planner" (các chữ highlight, zoom, cắt) để dùng ngay.

## Dùng kết quả

- Đưa vào planner: `npm run plan -- <video> --captions <captions.json> --workflow shop-ads --review "<gói>/report.md" --out <edit.json>`. Planner đọc mục "3 việc sửa ưu tiên" và "Gợi ý cho edit-planner".
- Việc cắt / đảo đoạn: làm bằng ffmpeg trước khi plan, rồi dời thời gian `captions.json` theo (hoặc nhận giọng lại trên video đã cắt).
- Sau render: chạy lại `npm run review` trên bản cuối (có chữ highlight) để kiểm chữ che, CTA trên hình.

## Quy tắc

- Không đoán retention/viral. Không khẳng định đã xem video khi chỉ có khung hình tĩnh.
- Lỗi nhận giọng ở số tiền, tiếng lóng, tên thương hiệu: hỏi người dùng, không tự sửa (xem sổ tay `video-edit-checklist`).
- Kết luận `QUAY_LẠI` / `DỰNG_LẠI` cần người dùng đồng ý trước khi cắt.
- Video faceless chưa có hình (chỉ có kịch bản): dùng thang hook /10 trong `script-review`, không cần gói này.
