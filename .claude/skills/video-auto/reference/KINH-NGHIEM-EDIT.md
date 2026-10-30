# Kinh nghiệm edit video bán hàng (đúc kết từ nhiều video thật)

Đọc trước mỗi lần edit. Mỗi mục là một lỗi đã gặp. Kinh nghiệm riêng của từng khách ghi ở `workspace/ghi-nho.md`, không ghi vào đây.

## A. Chữ trên hình

1. **Xem vị trí mặt người nói trước khi đặt chữ highlight.** Chạy `npm run qa -- <video gốc> --sheet` rồi xem ảnh. Người nói đứng gần, mặt ở nửa trên khung (kiểu livestream bán hàng) thì đặt chữ ở `bottom`, không đặt `top` vì che mắt.
2. **Chữ highlight phải nằm 1 dòng, tối đa 12 đến 15 ký tự** ("LED RGB", không "LED RGB NHẤP NHÁY"). Renderer tự thu nhỏ cỡ chữ để vừa 1 dòng, nhưng chữ ngắn vẫn dễ đọc hơn.
3. **Phụ đề 1 dòng, tối đa khoảng 15 ký tự mỗi câu** trên video dọc 576 px. Chữ in hoa đậm rất rộng. Hay gặp: một chữ lẻ ("Ạ.") rớt xuống dòng 2. Ngắt ở dấu câu, không ngắt giữa từ ghép ("kính cường lực"), không để 1 chữ đứng riêng một dòng. Cấu hình mặc định `subtitles.max_chars_per_line: 32` quá dài, khi edit tay phải chia lại theo từng từ.
4. **Chữ kết quả** ("VẪN NGUYÊN VẸN", "KHÔNG VỠ") chỉ hiện **sau** khi hình đã cho thấy kết quả. Sfx đi kèm chữ phải cùng mốc giây với chữ.
5. **Không đưa lên chữ điều chỉ nói miệng:** độ cứng, trọng lượng, độ dày, bảo hành, so sánh với sản phẩm khác. Chỉ đưa khi hình có cảnh minh họa (cân, thước, demo) hoặc khách đã xác nhận.
6. **Video tải về có thể có chữ in sẵn** (chữ TikTok). Xem khung đầu video, tránh để hai lớp chữ chồng nhau; ưu tiên cắt bỏ đoạn đó.
7. **Vùng an toàn video dọc:** tránh dưới khoảng 17%, trên khoảng 6%, mép phải khoảng 11% (tên, nhạc, nút của TikTok).

## B. Nhịp và hiệu ứng

8. **Zoom ít thôi.** Quy tắc: tối đa khoảng 1 lần mỗi 10 đến 15 giây, chỉ ở hook, giá, lời kêu gọi mua; scale 1.06 đến 1.1. Không zoom khi tay đang demo, khi hình đã nhiều chuyển động, hay khi đang có chữ highlight. Lần thử đầu có 14 zoom trong 73 giây (cứ 2,6 giây một cú giật) và khách thấy loạn mắt.
9. **Nhịp 2 đến 4 giây một thay đổi** thì dùng chữ, sfx, hoặc chuyển động có sẵn trong video, không dùng zoom.
10. **Không thêm nhạc nền** khi video đang demo âm thanh sản phẩm (nghe thử loa, âm thanh).
11. Sfx dùng ít và đúng chỗ: pop khi chữ hiện, ding khi có kết quả tốt, ka-ching khi hiện giá, click ở lời kêu gọi mua. Không đè lên lời nói quan trọng.

## C. Cắt, đảo đoạn

12. **Hook yếu thì cứu bằng dựng:** đừng giữ câu chào hỏi hoặc câu nói về người bán khác ("ngoài kia khóc thét"). Chọn **câu nói mạnh nhất có hình khớp** làm mở đầu (ví dụ "nó mỏng dã man này" cùng hình nhìn ngang cạnh sản phẩm), hoặc cảnh demo mạnh nhất nếu đoạn đó không có lời.
13. **Đoạn dài không có lời** (ví dụ phát nhạc thử): hỏi khách trước. Thường rút còn vài giây, có fade tiếng ở chỗ nối.
14. **Cuối video phải có lời kêu gọi mua** hiện chữ ít nhất 2 giây. Video gốc hay kết thúc ngay sau câu "chốt đơn", khi đó giữ đứng khung cuối 1,5 đến 2 giây để đặt chữ.
15. **Giá nên trả sớm** (trước 40% video) và nói rõ số. Giá nói mơ hồ ("hơn hai lốt", "gần bốn trăm") thì hỏi khách số thật, hoặc ghi đúng như lời nói ("GẦN 400K").
16. **Đảo thứ tự đoạn thì phải sắp lại phụ đề theo thời gian video mới**, không theo thời gian gốc. Cắt thì dời mốc từng từ theo bảng offset của từng đoạn, không nhận giọng lại (tốn credit).

## D. Máy nhận giọng và nội dung

17. **Máy nhận giọng hay sai ở tên thương hiệu, tên máy, số tiền, tiếng lóng.** Quy tắc: hỏi khách. Đưa cả lời nghe được lẫn chữ đọc được trên logo/bao bì (cắt cận khung hình đưa khách xem). Ví dụ thật: lời nghe ra một tên, logo trên sản phẩm in tên khác.
18. **Từ vấp, từ đệm** ("ấy", "giổ giá", "mức mức") thì bỏ khỏi phụ đề, giữ nội dung người nói định nói. Số tiền và thông số thì vẫn hỏi khách.
19. **Cổng quảng cáo:** tránh "tốt nhất", "số 1", "rẻ nhất", "100%", "cam kết", "đảm bảo", công dụng y tế, từ thô tục, so sánh trực tiếp với người bán khác. Nếu có trong video thì cắt câu đó hoặc không đưa lên phụ đề, và báo khách.
20. **Tên thương hiệu của bên thứ ba** (ví dụ tên công nghệ của hãng khác ghi trên chữ in sẵn) có thể bị từ chối khi chạy quảng cáo. Báo khách trước khi đưa lên chữ.

## E. Âm thanh và kiểm tra

21. **Luôn đo âm lượng.** Video tải từ mạng xã hội thường đã rất to (khoảng -5 LUFS). Chuẩn hóa về -14 LUFS bằng `npm run loudnorm`. Không cần render lại hình.
22. **Xem ảnh ghép sau mỗi lần render** (`npm run qa -- <video> --sheet`), sửa rồi render lại và xem lại trước khi gửi. Lỗi hay bắt được ở ảnh ghép: chữ che mặt hoặc sản phẩm, chữ 2 dòng, chữ đè lên phụ đề, chữ in sẵn chồng chữ mới.
23. **Trước khi edit video one-shot, chạy `video-review`** (2 agent chấm chéo lời nói và hình ảnh). Hai agent thấy lỗi mà một người xem dễ bỏ sót: lời nói tính năng nhưng hình không có cảnh, hình giới thiệu sản phẩm trễ hơn lời, giá nói quá muộn.
