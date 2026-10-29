# Tham khảo: iart-ai skills (MIT)

Một số quy tắc và hiệu ứng trong dự án được viết lại dựa trên ý tưởng từ các repo của iart.ai, giấy phép MIT:

- https://github.com/iart-ai/tiktok-video-skills (`short-form-video`, `caption-animation`): vùng an toàn 9:16, nhịp thay đổi hình 2 đến 4 giây, câu mở đầu hiện chữ từ giây 0, zoom giật (punch-in), từ đang đọc nảy lên.
- https://github.com/iart-ai/ecommerce-video-skills (`promo-video`): giá cũ bị gạch → giá mới nhảy số, % giảm tính từ dữ liệu.
- https://github.com/iart-ai/ad-video-skills (`ad-creative-video`): các kiểu câu hook, bố cục quảng cáo hook → vấn đề → sản phẩm → bằng chứng → kêu gọi.
- Cách kiểm tra bằng ảnh ghép nhiều khung hình (`contact-sheet`) dùng ở `npm run qa -- --sheet`.

Không chép nguyên văn mã nguồn; code trong `renderers/remotion/shared/` và `core/qa/contact-sheet.ts` được viết riêng cho dự án.

Copyright (c) iart.ai. MIT License: được dùng, sửa, phân phối, kèm thông báo bản quyền này.
