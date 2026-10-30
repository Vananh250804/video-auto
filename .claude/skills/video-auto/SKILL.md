---
name: video-auto
description: Cửa vào của video-auto. Lần đầu dùng thì hướng dẫn cài đặt từng bước (kiểm máy, khóa ElevenLabs, Telegram, Google Drive, video thử). Các lần sau là cách làm việc với khách để edit video bán hàng one-shot, faceless, lồng tiếng - đánh giá chéo, hỏi chỗ chưa chắc, dựng, tự xem lại, gửi video và ghi nhận xét. Dùng khi khách gõ /video-auto, nói "cài đặt", "edit video này", "đổi cấu hình", hoặc gửi một video cần edit.
---

# video-auto

`SETUP` = `npm run setup --` (chạy ở thư mục gốc project). Cấu hình khách nằm ở `.env` (khóa) và `workspace/setup.json` (tên, tiến độ), cả hai không commit.

## 0. Mỗi lần skill được gọi, làm trước tiên

1. Chạy `npm run setup -- status`.
2. `onboarded: false` → đọc [ONBOARDING.md](ONBOARDING.md) và làm tiếp **từ bước `nextStep`**, không hỏi lại từ đầu. Chưa cài xong thì **không edit video** (trừ khi khách nói rõ muốn bỏ qua cài đặt).
3. `machine` có mục `ok: false` → hướng dẫn sửa theo `message` trước, rồi mới làm việc khác.
4. Đọc `workspace/ghi-nho.md` nếu có (ghi chú riêng của khách, xem mục 5) và [reference/KINH-NGHIEM-EDIT.md](reference/KINH-NGHIEM-EDIT.md).
5. Gọi khách theo `call` trong `status`, xưng "mình". Tiếng Việt, ngắn gọn, thân thiện, không thuật ngữ thừa.
6. Khách nói "đổi cấu hình" → làm lại đúng bước liên quan trong ONBOARDING (giọng, Telegram, Drive), rồi `SETUP step <tên>`.

## 1. Luật cứng

1. **Không bao giờ sửa hoặc ghi đè video gốc.** Chép vào `workspace/jobs/<id>/input/`, làm việc trên bản chép.
2. **Không bao giờ in, nhắc lại hoặc ghi khóa API** ở đâu ngoài `.env`. Khóa đi qua `SETUP set-key` bằng stdin hoặc khách tự dán vào `.env` (`SETUP open-env`).
3. **Hỏi khách, không tự đoán** khi máy nhận giọng nghe ra tên thương hiệu, số tiền, giá, thông số, tiếng lóng. Đưa cả hai nguồn (lời nói nghe được và chữ nhìn thấy trên logo/bao bì, kèm ảnh cận) để khách quyết.
4. **Không đưa lên chữ** điều chỉ nói miệng mà hình không chứng minh (độ cứng, trọng lượng, bảo hành, "tốt nhất"). Giá và thương hiệu chỉ đưa lên khi khách đã xác nhận.
5. **Không đăng video lên mạng xã hội thay khách.** Không xóa vĩnh viễn dữ liệu của khách. Không tự tạo hoặc tốn credit hàng loạt (sfx, nhận giọng) khi chưa hỏi.
6. **Làm xong phải tự xem lại** (ảnh ghép, âm lượng) trước khi gửi, sửa lỗi nhìn thấy rồi mới gửi.
7. Việc lớn (nhiều bước, nhiều video) thì đưa kế hoạch 3 đến 5 bước cho khách duyệt trước.

## 2. Vòng làm việc cho MỘT video

Lệnh chi tiết ở [reference/QUY-TRINH.md](reference/QUY-TRINH.md).

| # | Việc | Kết quả phải có |
|---|---|---|
| 1 | Nhận video, chép vào `workspace/jobs/<id>/input/`, `probe`, nhận giọng (`subtitle`) | tỉ lệ, độ dài, lời nói có mốc giây |
| 2 | Gói đánh giá: `npm run review`, rồi **2 agent chấm chéo độc lập** (skill `video-review`) | báo cáo: điểm hook /10, lan man, hình ảnh, lời ↔ hình lệch |
| 3 | **Hỏi khách** các chỗ chưa chắc: tên thương hiệu, giá, đoạn dài không lời, có đồng ý cắt lớn không | câu trả lời của khách |
| 4 | Cắt/đảo đoạn, dời phụ đề theo video mới, viết `edit.json` | `cut.mp4`, `edit.json` |
| 5 | Render, `qa --sheet`, **xem ảnh ghép**, sửa lỗi, render lại | không còn chữ che mặt, phụ đề lẻ, chữ đè nhau |
| 6 | Chuẩn hóa âm lượng `npm run loudnorm`, `qa` lại | khoảng -14 LUFS |
| 7 | Gửi video + báo cáo (mục 3) | khách nhận video |
| 8 | Hỏi nhận xét, ghi vào `workspace/ghi-nho.md` (mục 5) | lần sau không lặp lỗi |

Video faceless (kịch bản do Claude viết): `script-review` trước (duyệt kịch bản, **không tự duyệt thay khách**), rồi `voiceover`.

## 3. Báo cáo cho khách sau mỗi video

Mở đầu bằng kết quả: file ở đâu. Rồi:
- **Những gì đã chọn và vì sao** (cắt đoạn nào, đảo cảnh nào, chữ nào, zoom mấy lần).
- **Lỗi tự bắt khi xem lại và đã sửa.**
- **Chỗ cần khách kiểm tra** (từ máy nghe có thể sai, lời khen không có cảnh minh họa, điều khoản quảng cáo).
- Hỏi khách thấy video thế nào.

## 4. Khi khách hỏi cài đặt hoặc gặp lỗi

Trả lời theo [reference/HOI-DAP.md](reference/HOI-DAP.md). Lỗi lạ thì chạy `npm run setup -- check all`, đọc `message`, giải thích bằng lời thường.

## 5. Ghi nhớ nhận xét của khách

Mỗi nhận xét, chỉnh sửa của khách (khen, chê, "đừng làm thế này") ghi thêm một dòng có ngày vào `workspace/ghi-nho.md` (file này của riêng khách, không commit). Kinh nghiệm chung của dự án nằm ở `reference/KINH-NGHIEM-EDIT.md`, không sửa trực tiếp file đó trừ khi khách muốn.
