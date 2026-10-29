---
name: sfx-library
description: Tạo và quản lý thư viện sfx cho video one-shot (whoosh, riser, pop, ding, click, bước chân, chạm, thở, bass drop, sub-hit, thud) bằng ElevenLabs Sound Effects. Dùng khi cần thêm sfx mới, tạo lại sfx chưa ưng, hoặc xem đang có sfx nào.
---

# sfx-library

Danh mục `assets/sfx/catalog.yaml` → ElevenLabs Sound Effects tạo bản nháp → người dùng nghe, chọn → chép vào `assets/sfx/`. `edit-planner` đọc mô tả `use` trong danh mục để biết khi nào dùng file nào.

## Cách chạy

```bash
npm run sfx -- list                                   # danh mục, file nào đã có
npm run sfx -- generate --variants 2                  # tạo nháp còn thiếu (tốn credit)
npm run sfx -- generate --only ui-pop,impact-thud --force   # tạo lại vài cái
npm run sfx -- pick ui-pop 2                          # chọn bản 2 cho ui-pop
npm run sfx -- pick all 1                             # bản 1 cho mọi sfx chưa chọn
```

Nháp nằm ở `workspace/sfx-drafts/<nhóm>-<tên>/v1.mp3`. Mở `workspace/sfx-drafts/index.html` để nghe so sánh.

## Thêm sfx mới

1. Thêm mục vào `assets/sfx/catalog.yaml`: `duration` (0.5 đến 30 giây), `prompt` (tiếng Anh, mô tả cụ thể, ghi "no music"), `use` (tiếng Việt, khi nào dùng).
2. `npm run sfx -- generate --only <nhóm>-<tên>`, nghe, rồi `pick`.

## Quy tắc

- Mỗi lần `generate` gọi API là tốn credit ElevenLabs. Không chạy `--force` cho cả bộ khi chưa hỏi người dùng.
- Không tự `pick` thay người dùng, trừ khi người dùng bảo chọn hộ.
- Sfx đã cắt lặng đầu/cuối và chuẩn hóa đỉnh -1 dBFS, nên `at` trong `edit.json` là đúng lúc tiếng vang.
- Chỉ dùng thương mại khi tạo bằng gói ElevenLabs trả phí. Ghi nguồn ở `assets/licenses/sfx.md`.
- Model, độ bám mô tả: `config/default.yaml` (`elevenlabs.sfx_model`, `elevenlabs.sfx_prompt_influence`).
