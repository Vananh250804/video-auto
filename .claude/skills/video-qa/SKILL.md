---
name: video-qa
description: Kiểm tra video thành phẩm trước khi giao - màn hình đen, hình đứng yên, mất tiếng, tiếng quá nhỏ/to (LUFS), sai độ dài. Dùng sau remotion-render hoặc khi người dùng hỏi video có lỗi không.
---

# video-qa

## Cách chạy

```bash
npm run qa -- "workspace/jobs/<id>/output/final.mp4"
npm run qa -- "final.mp4" --expect-duration 28.5   # báo lỗi nếu lệch quá 0.5s
npm run qa -- "final.mp4" --no-audio               # video không cần tiếng
```

Thoát mã `0` nếu đạt, `2` nếu có lỗi nặng. Kết quả JSON: `ok`, `loudnessLufs`, `issues` (mỗi cái có `level`: `error` hoặc `warning`).

## Ngưỡng

| Kiểm tra | Mức |
|---|---|
| Màn hình đen | dài hơn 1 giây → warning |
| Hình đứng yên | dài hơn 3 giây → warning (video faceless giữ khung cuối khi giọng dài hơn, là bình thường) |
| Không có tiếng / im lặng hoàn toàn | error |
| Âm lượng | dưới -24 LUFS: nhỏ; trên -8 LUFS: quá to. TikTok nên khoảng -14 |
| Độ dài | lệch quá 0.5 giây so với mong đợi → error |

## Quy tắc

- Báo người dùng mọi warning bằng lời dễ hiểu, kèm thời điểm.
- Có error thì không giao video, tìm nguyên nhân ở bước trước (cut, voiceover, render).
