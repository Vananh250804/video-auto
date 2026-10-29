---
name: remotion-render
description: Render video thành phẩm bằng Remotion từ file edit.json - in phụ đề kiểu TikTok (từ đang đọc đổi màu), chữ highlight nổi lên, sfx, nhạc nền, tự chọn template theo tỉ lệ 9:16/16:9/1:1. Dùng ở bước cuối sau cut, subtitle, voiceover.
---

# remotion-render

Đọc `edit.json` → dựng props → Remotion render ra mp4 (H.264 + AAC). Template chọn theo tỉ lệ video (`video-probe`).

## Cách chạy

```bash
# Nhanh: video + phụ đề
npm run render -- --video "workspace/jobs/<id>/voiceover.mp4" --captions "workspace/jobs/<id>/captions.json" --style tiktok --out "workspace/jobs/<id>/final.mp4"

# Đầy đủ: theo edit.json
npm run render -- "workspace/jobs/<id>/edit.json" --out "workspace/jobs/<id>/final.mp4"

# Xem và chỉnh template trực quan
npm run studio
```

## edit.json

Schema: `schemas/edit.schema.json`. Đường dẫn tương đối tính từ thư mục gốc project.

```json
{
  "video": "workspace/jobs/abc/voiceover.mp4",
  "captions": "workspace/jobs/abc/captions.json",
  "captionStyle": "tiktok",
  "originalVolume": 1,
  "overlays": [
    { "text": "GIẢM 50%", "start": 1.2, "end": 3.5, "position": "top" },
    { "text": "Freeship toàn quốc", "start": 5, "end": 7, "position": "center", "background": "#00B14F" },
    { "kind": "price", "text": "CHỈ CÒN", "was": 299000, "now": 199000, "start": 8, "end": 11.5, "position": "center" }
  ],
  "zooms": [{ "start": 2.4, "end": 4.6, "scale": 1.12 }],
  "sfx": [{ "file": "assets/sfx/pop.mp3", "at": 1.2, "volume": 0.8 }],
  "music": { "file": "assets/music/vui-tuoi.mp3", "volume": 0.12 }
}
```

- `captionStyle`: `tiktok` (chữ hoa đậm, viền đen, từ đang đọc màu vàng), `box` (nền đen mờ, dễ đọc), `karaoke` (chữ mờ sáng dần theo giọng), `none`. Thêm preset mới: tạo file trong `presets/captions/`.
- `overlays`: thời gian tính bằng giây trên video nền. `position`: `top`, `center`, `bottom`.
- `kind: "price"`: giá cũ bị gạch, rồi giá mới nhảy số xuống và nảy nhẹ, kèm nhãn `-33%` tự tính. `was`, `now` là số đồng, `now < was`. Không gõ % giảm bằng tay.
- `zooms`: zoom giật vào khung hình (punch-in) từ `start` tới `end`, rồi cắt về khung gốc. `scale` 1.08 đến 1.15 là vừa. Dùng để tạo nhịp cho video quay một shot.
- `maxShortSide`: mặc định 1080 (video 4K tự hạ xuống 1080p).

## Quy tắc

- Video nền phải là bản cuối cùng về thời gian (đã cắt, đã ghép giọng). `captions.json` phải được tạo từ chính video đó, nếu không phụ đề lệch.
- Chữ highlight: ngắn, tối đa 4 đến 5 từ, mỗi cái hiện 1.5 đến 3 giây, không chồng lên nhau cùng vị trí.
- Phụ đề đang ở giữa-dưới khung hình; overlay nên để `top` để không đè phụ đề.
- Video dọc: vị trí chữ đã nằm trong vùng an toàn TikTok/Reels (`renderers/remotion/templates/portrait-9x16/layout.ts`). Không đưa chữ xuống dưới ~83% chiều cao, đó là chỗ TikTok hiện tên, nhạc, nút.
- Nhịp: cứ 2 đến 4 giây một thay đổi (chữ, zoom, sfx), khoảng cách không đều; câu mở đầu hiện chữ từ giây 0.
- Sau khi render, chạy `npm run qa -- <video> --sheet` và xem ảnh ghép.
- Chỉ dùng sfx, nhạc có trong `assets/` hoặc người dùng đưa, và có quyền dùng (ghi nguồn vào `assets/licenses/`).
- Lần render đầu tiên Remotion tự tải Chrome Headless Shell (khoảng 100 MB), cần mạng.
