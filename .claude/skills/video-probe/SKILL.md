---
name: video-probe
description: Đọc thông tin video (tỉ lệ khung hình 9:16/16:9/1:1, độ phân giải, độ dài, fps, có âm thanh không). Dùng trước mọi bước edit để chọn template và preset đúng tỉ lệ.
---

# video-probe

Đọc thông số video bằng ffprobe và tự nhận tỉ lệ khung hình.

## Cách chạy

```bash
npm run probe -- "đường/dẫn/video.mp4"
```

Kết quả là JSON, các trường quan trọng:

- `aspectRatio`: tỉ lệ chuẩn gần nhất (`9:16`, `16:9`, `1:1`, `4:5`, `3:4`, `4:3`)
- `orientation`: `portrait`, `landscape` hoặc `square`
- `width`, `height`: đã tính cả xoay (video quay dọc bằng điện thoại có `rotation` 90 hoặc 270)
- `durationSec`, `fps`, `hasAudio`

## Quy tắc

- Luôn chạy probe trước khi cắt, làm sub hay render.
- Chọn template Remotion theo `aspectRatio`: `9:16` → `portrait-9x16`, `16:9` → `landscape-16x9`, `1:1` → `square-1x1`. Tỉ lệ `4:5`, `3:4` dùng `portrait-9x16`; `4:3` dùng `landscape-16x9`.
- Nếu `hasAudio` là `false` thì bỏ qua bước cắt khoảng lặng và bước nhận giọng nói.
- Không sửa file gốc.
