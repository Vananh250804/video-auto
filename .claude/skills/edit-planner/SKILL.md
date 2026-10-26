---
name: edit-planner
description: Biến yêu cầu edit tự do bằng tiếng Việt (chữ highlight, kiểu phụ đề, sfx, nhạc, âm lượng) thành file edit.json để remotion-render dựng video. Không có yêu cầu thì dùng mặc định của workflow (shop-ads, faceless, dubbing).
---

# edit-planner

Đọc video + phụ đề + yêu cầu → hỏi Claude (`claude -p`) → làm sạch và kiểm tra → ghi `edit.json`.

## Cách chạy

```bash
# Theo mặc định của workflow
npm run plan -- "workspace/jobs/<id>/cut.mp4" --captions "workspace/jobs/<id>/captions.json" --workflow shop-ads --out "workspace/jobs/<id>/edit.json"

# Có yêu cầu riêng, render luôn
npm run plan -- "<video>" --captions "<captions.json>" --workflow shop-ads \
  --request "làm nổi giá 199k và chữ freeship, phụ đề nền đen, thêm tiếng pop" \
  --out "workspace/jobs/<id>/edit.json" --render "workspace/jobs/<id>/final.mp4"
```

Kết quả in ra: `notes` (Claude đã làm gì), `dropped` (đề xuất bị bỏ vì sai thời gian, file không có).

## Khi đang chat trong Claude Code

Bạn (Claude) có thể tự viết `edit.json` theo `schemas/edit.schema.json` thay vì gọi `npm run plan`, rồi chạy `remotion-render`. Dùng `npm run plan` khi chạy tự động (bot Telegram).

## Quy tắc

- Video truyền vào phải là bản cuối về thời gian (đã cắt, đã ghép giọng) và `captions.json` khớp video đó.
- Workflow: `shop-ads` (quảng cáo quay thật), `faceless` (giọng AI, bỏ tiếng gốc), `dubbing` (lồng tiếng, giữ tiếng gốc nhỏ). Mặc định từng loại ở `workflows/<tên>/workflow.yaml`.
- Claude chỉ được dùng sfx, nhạc có trong `assets/sfx`, `assets/music`. Muốn có sfx, chép file vào đó trước.
- Prompt nằm ở `prompts/edit-planner/plan.md`. Sửa prompt để đổi phong cách mặc định.
- Nếu `dropped` không rỗng, báo người dùng những gì bị bỏ.
