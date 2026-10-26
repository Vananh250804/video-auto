---
name: script-review
description: Viết kịch bản thuyết minh tiếng Việt cho video faceless/quảng cáo, tự kiểm tra (độ dài, cách viết số tiền, từ dễ bị TikTok chặn quảng cáo), lưu trạng thái chờ người dùng duyệt, viết lại theo góp ý. Dùng trước voiceover khi kịch bản do Claude viết.
---

# script-review

Kịch bản do Claude viết **phải được người dùng duyệt** trước khi đọc giọng. Trạng thái lưu ở `<job>/review.json`, kịch bản ở `<job>/script.txt`.

## Cách chạy

```bash
# 1. Viết kịch bản (trạng thái: pending)
npm run script -- write --brief "Túi da nữ màu kem, giá 299 nghìn, freeship, tặng ví cho 50 đơn đầu" --seconds 25 --dir "workspace/jobs/<id>"

# 2a. Người dùng góp ý → viết lại (vẫn pending)
npm run script -- revise --dir "workspace/jobs/<id>" --feedback "bớt dài, thêm câu hỏi ở đầu"

# 2b. Người dùng đồng ý → duyệt
npm run script -- approve --dir "workspace/jobs/<id>"

# 3. Đọc giọng bằng kịch bản đã duyệt
npm run voiceover -- "<video>" --script "workspace/jobs/<id>/script.txt" --out-dir "workspace/jobs/<id>"

# Chỉ kiểm tra một kịch bản có sẵn (không gọi Claude)
npm run script -- check "kich-ban.txt" --seconds 30
```

## Kiểm tra tự động (`check.issues`)

- `length`: ước lượng theo `script.words_per_second` trong config (mặc định 3.2 từ/giây)
- `money`: `199k`, `1tr` → nên viết `199 nghìn`, `1 triệu` để giọng AI đọc đúng
- `claim`: tốt nhất, số 1, cam kết, điều trị... dễ bị từ chối quảng cáo
- `sentence`: câu quá 30 từ

## Quy tắc

- Không bao giờ chạy `approve` thay người dùng. Chỉ duyệt khi người dùng nói rõ là đồng ý.
- Khi trình kịch bản cho người dùng, kèm `check.issues` và thời lượng ước tính.
- Kịch bản người dùng tự đưa (workflow `dubbing`) không cần qua bước này.
- Prompt: `prompts/script-review/write.md`.
