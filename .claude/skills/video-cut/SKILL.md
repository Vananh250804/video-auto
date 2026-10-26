---
name: video-cut
description: Tự cắt khoảng lặng, đoạn thừa trong video có người nói, rồi nối lại liền mạch. Dùng khi cần làm gọn video quay thô (quảng cáo shop, review) trước khi thêm sub, giọng đọc, hiệu ứng.
---

# video-cut

Phát hiện khoảng lặng bằng FFmpeg `silencedetect`, giữ lại các đoạn có tiếng, nối lại và render lại (H.264 + AAC, cắt chính xác từng khung hình).

## Cách chạy

```bash
# Xem trước sẽ cắt những đoạn nào, chưa render
npm run cut -- "input.mp4" --dry-run

# Cắt thật
npm run cut -- "input.mp4" --out "workspace/jobs/<id>/work/cut.mp4"
```

## Tham số (mặc định giống `config/default.yaml`)

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--threshold` | `-35` | dB. Nhỏ hơn mức này coi là im lặng. Phòng ồn thì tăng lên `-30` |
| `--min-silence` | `0.6` | giây. Lặng ngắn hơn thì giữ lại (nhịp nói tự nhiên) |
| `--padding` | `0.12` | giây chừa trước/sau mỗi đoạn nói, tránh mất đầu/cuối chữ |
| `--min-segment` | `0.3` | giây. Đoạn giữ lại ngắn hơn thì bỏ (tiếng động lẻ) |

## Quy tắc

- Chạy `video-probe` trước. Video không có âm thanh thì không cắt.
- Luôn chạy `--dry-run` trước nếu người dùng yêu cầu khác mặc định, báo tổng thời lượng sẽ bỏ (`removedSec`).
- Nếu `removedSec` lớn hơn 50% `originalSec`, dừng lại và hỏi người dùng: có thể ngưỡng sai hoặc video có nhạc nền.
- Video quảng cáo một shot có nhạc nền thì không dùng cắt khoảng lặng.
- Ghi file vào `workspace/jobs/<id>/work/`, không ghi đè file gốc.
