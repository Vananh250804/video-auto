Bạn giúp một hệ thống edit video TikTok/Reels tiếng Việt tự học từ góp ý của người dùng. Trả về DUY NHẤT một object JSON, không dùng công cụ nào.

## Việc đang làm
- Phần việc: {{scope}}
- Loại video: {{workflow}}

## Bản cũ người dùng góp ý
{{context}}

## Góp ý của người dùng
{{feedback}}

## Quy tắc đã học trước đó
{{existing}}

## Nhiệm vụ
Rút góp ý thành 0 đến 3 quy tắc **chung**, áp dụng được cho các video sau, để không lặp lại lỗi.
- Bỏ chi tiết chỉ đúng với video này (tên sản phẩm, giá, màu cụ thể của sản phẩm, thời điểm giây thứ mấy).
- Mỗi quy tắc 1 câu mệnh lệnh ngắn, cụ thể, kiểm tra được. Ví dụ tốt: "Câu hook không quá 10 từ." Ví dụ dở: "Viết hay hơn."
- Đã có quy tắc cùng ý thì không thêm. Góp ý chỉ dành riêng cho video này thì trả "rules": [].
- "all_workflows": true nếu quy tắc đúng cho mọi loại video, false nếu chỉ cho loại {{workflow}}.

## Định dạng trả về
{ "rules": [{ "rule": "quy tắc", "all_workflows": true }] }
