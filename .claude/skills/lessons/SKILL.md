---
name: lessons
description: Kho bài học của hệ thống: ghi nhớ góp ý và yêu cầu sửa của người dùng thành quy tắc tự áp dụng cho video sau, và ghi lỗi đã gặp kèm cách sửa. Dùng khi người dùng sửa, chê, góp ý kết quả (kể cả khi nói chuyện trực tiếp với Claude Code), khi job lỗi, hoặc khi người dùng hỏi hệ thống đã học được gì.
---

# lessons

Mọi thứ nằm trong `knowledge/` và được commit lên git, nên người nhận bàn giao cũng dùng được:

| File | Nội dung | Ai ghi |
|---|---|---|
| `knowledge/lessons.json` | quy tắc từ góp ý, `scope` = `script` (kịch bản) hoặc `edit` (phụ đề, chữ, sfx, nhạc) | bot tự ghi, hoặc `npm run lessons -- add` |
| `knowledge/known-errors.json` | `{ match: regex, fix }` lỗi đã gặp và cách sửa | agent bổ sung |
| `knowledge/styles/*.json` | phong cách học từ video mẫu | skill `style-learn` |

Quy tắc trong `lessons.json` được chèn tự động vào prompt viết kịch bản và lên hiệu ứng (`lessonsForPrompt` trong `core/knowledge/lessons.ts`), tối đa 40 quy tắc mới nhất mỗi loại.

## Học từ góp ý

- Telegram: bấm ✏️ Sửa kịch bản rồi gửi góp ý, hoặc `/sua <mã job> <yêu cầu>` cho video đã xong. Bot nhờ Claude rút thành quy tắc chung (prompt `prompts/learning/lesson.md`), lưu, rồi báo lại kèm mã. `/baihoc` xem, `/quen <mã>` bỏ.
- Trong Claude Code: khi người dùng sửa hoặc chê kết quả, sau khi làm theo, tự rút thành 1 quy tắc chung (bỏ chi tiết riêng của video đó) và lưu:

```bash
npm run lessons -- add --scope edit --rule "Chữ highlight dùng nền vàng chữ đen"
npm run lessons -- add --scope script --rule "Câu hook không quá 10 từ" --workflow faceless
npm run lessons -- list
npm run lessons -- forget <mã>
```

Báo người dùng quy tắc vừa lưu. Góp ý chỉ dành cho một video thì không lưu.

## Học từ lỗi

- Job lỗi được ghi vào `workspace/logs/errors.jsonl`. Lỗi khớp `known-errors.json` thì bot gửi kèm "💡 Cách sửa".
- Định kỳ hoặc khi người dùng hỏi: chạy `npm run lessons -- errors` để xem lỗi chưa có cách sửa, tìm nguyên nhân, sửa code nếu là lỗi code, và thêm mục vào `knowledge/known-errors.json` nếu là lỗi cài đặt hay thao tác (regex ngắn, khớp đúng thông báo lỗi; `fix` 1 đến 2 câu, nói rõ lệnh cần chạy).

## Quy tắc

- Quy tắc là câu mệnh lệnh ngắn, kiểm tra được. Không ghi key bí mật, tên khách hàng, giá cụ thể.
- Hai quy tắc mâu thuẫn: giữ cái mới, `forget` cái cũ.
- Nhắc người dùng commit `knowledge/` để lưu lên git.
