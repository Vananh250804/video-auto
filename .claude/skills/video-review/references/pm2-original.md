#  PHẢN BIỆN HOOK · NARRATION · STORYBOARD

> **Mục đích:** Tài liệu hướng dẫn cho một AI phản biện kịch bản video ngắn trước khi sản xuất. Có thể dùng với ChatGPT, Gemini, Claude hoặc agent kiểm duyệt trong pipeline.
>

> **[DỰ ÁN]** = điều kiện do từng dự án tự đặt (thời lượng, vùng an toàn, phong cách hình ảnh...).
>
> **Phạm vi:** Đánh giá *đề xuất kịch bản và kế hoạch hình ảnh*, không suy đoán tỷ lệ retention/viral thực tế. Không thay cho kiểm chứng dữ kiện hoặc xem bản render cuối.
---
## 0. QUY TRÌNH VÀ NGUYÊN TẮC PHẢN BIỆN

### 0.1. Đầu vào

```yaml
project: "[tên dự án hoặc trống]"
video_id: "[mã video hoặc trống]"
topic: "[chủ đề]"
audience: "[khán giả mục tiêu; nếu thiếu ghi CHƯA CÓ]"
platform: "[TikTok/Shorts/Reels/khác]"
target_duration_seconds: "[thời lượng dự kiến]"
hook_text: "[nguyên văn hook]"
narration: "[nguyên văn, tốt nhất đánh số câu và có thời gian]"
storyboard: "[danh sách cảnh: time, hình, chuyển động, chữ, SFX, narration mapping]"
evidence: "[nguồn dữ kiện nếu có]"
constraints: "[quy tắc riêng của dự án, nếu có]"
```

- Nếu chỉ nhận được Hook, **chỉ duyệt Hook**; các mục khác ghi `NOT_EVALUATED`.
- Nếu có Hook + Narration, duyệt hai phần và quan hệ *lời hứa → lời giải*; Storyboard ghi `NOT_EVALUATED`.
- Nếu đủ cả ba, duyệt hoàn chỉnh và kiểm tra mối quan hệ *lời → hình → chữ → âm thanh*.
- Khi thiếu thời gian từng cảnh hoặc TTS, đánh giá **nhịp dự kiến**; **không** khẳng định thời lượng thật đã đạt.

### 0.2. Thứ tự đánh giá

1. **Kiểm chứng và giới hạn:** chỉ ra thông tin sai, suy đoán, claim cần nguồn, câu hứa quá mức. Đây là cổng chặn độc lập với độ hấp dẫn.
2. **HOOK (H01–H12):** phân loại kiểu mở; chấm 5 tiêu chí /10 theo PM2; tìm lời hứa và câu hỏi khán giả mang theo.
3. **NARRATION:** gắn nhãn cho **từng câu**, lập sổ vòng tò mò, đối chiếu logic, bằng chứng, nhịp và câu kết.
4. **STORYBOARD:** đối chiếu từng cảnh với câu narration; kiểm thử 3 giây đầu, tính giải thích và thay đổi hình có mục đích.
5. **Kết luận:** `REWRITE` / `REVISE` / `READY_FOR_REVIEW`, tối đa 3 vấn đề quan trọng nhất cùng đề xuất sửa cụ thể.

### 0.3. Nguyên tắc bắt buộc cho AI phản biện

- Phải dẫn chứng bằng **câu gốc / mã câu / mốc giây / mã cảnh**. Không chê hoặc khen chung chung.
- **Tách phát hiện và giả thuyết:** “câu 5 lặp ý câu 4” là điều quan sát được; “có thể gây drop” chỉ là dự đoán.
- **Không bịa nguồn, thống kê, phản ứng của người xem, thuật toán nền tảng**, và không giả định đã xem video khi mới có storyboard văn bản.
- Dữ kiện thiếu nguồn: ghi `CẦN KIỂM NGUỒN`, không đánh đồng thiếu nguồn với đã sai. Sai rõ ràng: ghi `SAI` và giải thích.
- Khen điểm mạnh phải chỉ đúng chức năng; nêu **tại sao giữ lại** đoạn đó.
- Ưu tiên sửa *ít nhưng trúng*. Không tự biến toàn bộ kịch bản thành phong cách khác, không tự thay lời đã khóa nếu không được cho phép.
- Không ép video phải có mọi loại Hook, tất cả 9 nhãn hoặc một cú lật nhân tạo; đánh giá tính cần thiết đối với *chủ đề này*.

---

# PHẦN A — PHẢN BIỆN HOOK

## A1. Nhận diện đúng 12 kiểu Hook

Chọn **một kiểu chính H01–H12**, có thể ghi thêm một kiểu phụ nếu câu mở thực sự kết hợp hai cơ chế. **Không** chấm cả 12 kiểu như 12 tiêu chí bắt buộc.

| Mã | Kiểu Hook trong PM2 | Tầng nổi trội | Khi phù hợp | Câu hỏi phản biện riêng | Lỗi phải bắt |
|---|---|---|---|---|---|
| **H01** | **Sự thật ngược đời** | Cú sốc | Có dữ kiện phản trực giác, chứng minh được | Điều “ngược” có thật và người xem thường nghĩ khác? Đã giải thích điều kiện/định nghĩa chưa? | Dữ kiện sai; chơi chữ để gây hiểu lầm; bỏ qua điều kiện ngoại lệ. |
| **H02** | **Câu hỏi “Vì sao” về thứ quá quen** | Vòng tò mò | Hiện tượng đời thường có cơ chế thú vị | Câu hỏi có cụ thể, tự nhiên, trả lời được? Vế “tại sao không phải...?” có tạo đối lập rõ? | Quá rộng; người xem đã biết; thêm câu đệm “Bạn có biết...”. |
| **H03** | **Con số quá cỡ** | Cú sốc | Có số kiểm được và phép quy đổi dễ hình dung | Đơn vị, nguồn, phép so sánh có đúng? Con số có dẫn đến ý nghĩa? | Con số trần trụi; không nguồn; so lệch đơn vị; làm tròn quá mức. |
| **H04** | **Phá một điều tưởng đúng** | Nâng cược | Có ngộ nhận phổ biến và dẫn chứng phản bác | Người ta có thực sự tin điều đó? Kịch bản có thay điều sai bằng điều đúng? | Dựng “ngộ nhận rơm”; giọng chế giễu; bác bỏ nhưng không giải thích. |
| **H05** | **Đặt cược: nếu… thì…** | Nâng cược | Hành vi thường ngày gắn với hệ quả cụ thể | Hệ quả có cơ chế, điều kiện và mức độ đúng? Người xem có làm hành vi này? | Đe dọa; thổi phồng hậu quả; khẳng định tuyệt đối; hứa hẹn tiền/sức khỏe thiếu cơ sở. |
| **H06** | **Giả định “Điều gì xảy ra nếu”** | Vòng tò mò | Dạy cơ chế bằng giả định hệ thống thay đổi/hỏng | Phần giả định và phần kết luận dựa trên khoa học có được phân ranh? | Trộn tưởng tượng với sự thật; chuỗi hệ quả không có cơ sở; xa nhu cầu người xem. |
| **H07** | **Mở giữa một cảnh** | Cú sốc | Chuyện thật có một sự kiện hoặc khoảnh khắc mạnh | Cảnh có hành động cụ thể ngay lập tức? Ai/ở đâu/vấn đề gì rõ đủ? | Tả cảnh dài; thêm tình tiết không có tư liệu; giữ danh tính quá lâu. |
| **H08** | **Lời hứa có thời hạn** | Nâng cược | Mẹo, kỹ năng, thao tác cho kết quả kiểm được | Lời hứa cụ thể, đúng thời gian và người xem kiểm được không? | Hứa mơ hồ; nói quá kết quả; đặt thời hạn rồi không thực hiện. |
| **H09** | **So sánh lệch cỡ** | Cú sốc | Hai đối tượng cùng một đại lượng nhưng tỷ lệ gây ngạc nhiên | Đang so **cùng thước đo**? Sự chênh lệch có giúp hiểu vấn đề? | Tráo khái niệm; so không tương đồng; hình dung sai quy mô; số không nguồn. |
| **H10** | **Bí ẩn chưa có lời giải** | Vòng tò mò | Câu đố có đáp án hoặc vấn đề có nhiều giả thuyết thực | “Chưa có lời giải” là thật hay chỉ chưa giải trong câu mở? Các giả thuyết có được trình bày đúng mức? | Bịa bí ẩn; bảo “không ai biết” về điều đã biết; giấu đáp án quá lâu; thuyết âm mưu. |
| **H11** | **Gọi đúng người** | Nâng cược | Trải nghiệm, nỗi đau, khó khăn cụ thể của khán giả | Một người gặp tình huống này có nhận ra chính mình trong câu đầu? | Gọi quá rộng/hẹp; dùng nhãn nhân khẩu học thay trải nghiệm; phán xét người xem. |
| **H12** | **Kết cục trước, nguyên nhân sau** | Vòng tò mò | Sự cố, phát hiện, câu chuyện có kết cục rõ và nguyên nhân thú vị | Biết kết cục rồi, người xem còn muốn biết “vì sao”? Nguyên nhân được giữ làm lõi nội dung? | Kết cục tự giải thích hết; không tạo đối lập; quay lại kể thời gian dài dòng. |

**Chú ý:** Các ví dụ/biến thể Hook trong PM2 là công cụ viết nháp; tên mã H01–H12 chỉ để **phân loại**, không phải 12 chứng nhận hiệu quả.

## A2. Kiểm “ba tầng” của Hook

| Tầng | Câu cần trả lời | PASS khi |
|---|---|---|
| **Cú sốc / dừng lướt** | Có điều cụ thể lệch dự đoán / cảnh đang diễn ra / điểm khác thường không? | Nêu rõ sự vật và điểm lạ, không chỉ hô “sốc”, “bí mật”. |
| **Nâng cược / đáng quan tâm** | Tại sao người xem cần biết điều này? | Có ích lợi, rủi ro đúng mức, trải nghiệm hoặc ý nghĩa rõ. |
| **Vòng tò mò / ở lại** | Sau Hook, người xem muốn được giải đáp câu hỏi **nào**? | AI viết lại được một câu hỏi cụ thể, được trả trong video. |

- Ba tầng **không phải ba câu riêng**; có thể cùng hiện diện trong một nhịp.
- Nếu câu hỏi tưởng tượng của AI **khác** câu video trả lời, báo `PROMISE_MISMATCH`.
- Nếu gây tò mò bằng một claim chưa chứng thực, báo `FACT_CHECK_REQUIRED`, không xem “sốc” là một điểm cộng tự động.

## A3. Chấm Hook /10 

**Cách chấm:** 0 = vắng mặt/không đạt; 1 = có nhưng yếu/chưa rõ; 2 = đạt rõ ràng và đúng mức. Chấm **từng tiêu chí**, ghi bằng chứng ngắn và cách sửa.

| Tiêu chí | 0 điểm | 1 điểm | 2 điểm |
|---|---|---|---|
| **Cụ thể** | Chỉ là lời dẫn hoặc nhận xét mơ hồ | Có đối tượng nhưng chưa có chi tiết đáng hình dung | Có vật, hành động, hiện tượng, số hoặc chi tiết “sờ thấy được” |
| **Lệch dự đoán nhưng ĐÚNG** | Hiển nhiên / bất ngờ không có căn cứ | Có bất ngờ nhẹ, thiếu đối lập rõ | Có chênh lệch giữa điều người xem tưởng và điều đúng, trình bày trung thực |
| **Liên quan người xem** | Xa lạ, không nêu lý do đáng xem | Có thể liên quan nhưng chưa làm rõ | Gắn với điều khán giả đang có, đang làm, đang tin hoặc một hệ quả đáng quan tâm |
| **Mở câu hỏi** | Không có câu hỏi tự nhiên | Có tò mò nhưng chung chung | Có thể diễn đạt rõ một câu hỏi mà người xem chờ được giải |
| **Trả lời được trong video** | Hứa ngoài phạm vi / không có lời giải | Có lời giải một phần hoặc cần rút phạm vi | Phần thân trả đúng ý đã hứa, trong thời lượng cho phép, có căn cứ |

**Kết quả Hook:**
- `0–6/10`: `REWRITE_HOOK` — **dưới 7 viết lại** theo PM2.
- `7–10/10`: `HOOK_SCORE_PASS` **chỉ là qua ngưỡng điểm Hook**; vẫn có thể bị chặn bởi dữ kiện sai, lời hứa không được trả hoặc visual không phù hợp.
- **Không** quy đổi /10 thành tỷ lệ giữ chân dự kiến.

## A4. Khớp Hook với Narration và Storyboard

- **Promise:** Hook hứa chính xác điều gì?
- **Payoff:** Câu số mấy và/hoặc thời điểm nào trả lời? Câu trả lời có **đáng** với lời hứa?
- **Lời/hình/chữ:** ba kênh có nói cùng một ý trong 3 giây đầu?
- **Tắt tiếng:** chỉ xem hình/chữ có nhận ra vấn đề và điểm lạ? `[CẦN PREVIEW]` nếu chưa có hình thực.
- **Nhắm mắt:** chỉ nghe lời đọc có hiểu câu mở? Với văn bản, chỉ đánh giá **khả năng hiểu**, không đánh giá chất lượng giọng TTS.
- **Phản tác dụng:** Hook đã làm lộ toàn bộ câu trả lời và không còn câu hỏi mới? Có giật tít, quy chụp hoặc dùng con số khó kiểm?

**Báo cáo Hook bắt buộc:** `Hxx chính`, `Hxx phụ nếu có`, `Hook nguyên văn`, `5 điểm thành phần`, `Tổng /10`, `ba tầng`, `câu hỏi trong đầu người xem`, `Promise`, `Payoff`, `lỗi chí mạng`, `tối đa 3 phương án viết lại` (nếu được phép).

---

# PHẦN B — PHẢN BIỆN NARRATION

## B1. Mổ xẻ **từng câu** bằng 9 nhãn

| Nhãn | Ý nghĩa trong PM2 | Câu hỏi kiểm tra |
|---|---|---|
| **MỞ** | Tạo cú sốc / nâng cược / vòng tò mò ở đầu video | Đặt được vấn đề và lời hứa? |
| **NỀN** | Cấp khái niệm hoặc bối cảnh tối thiểu | Thông tin này có cần để hiểu phần sau? Có thể đưa muộn hơn không? |
| **DẪN** | Bước cơ chế hoặc câu bản lề đưa ý tiến lên | Có quan hệ nhân quả/logic hay chỉ là câu nối rỗng? |
| **CHỨNG** | Nguồn, bằng chứng, ví dụ, phép đo hoặc con số | Có nguồn? Có thực sự hỗ trợ điều đang khẳng định? |
| **ĐÁP** | Trả lời một vòng tò mò đã mở | Có trả **đúng câu hỏi** và rõ ràng không? |
| **MỒI** | Mở câu hỏi kế tiếp ở giữa video | Có hứa một thông tin cụ thể mà các câu tiếp theo thật sự trả? |
| **LẬT** | Chi tiết gần cuối khiến người xem hiểu lại điều trước đó | Có dựa trên thông tin đã xây dựng, hay chỉ là “plot twist” rời rạc? |
| **KẾT** | Một câu đúc kết đáng nhớ, nói được bằng lời thường | Có nén được bài học thực sự của video? |
| **CTA** | Mời người xem một hành động liên quan | Ngắn, hợp video, không làm loãng câu chốt? |

**Quy tắc phân tích:**
1. Đánh số từng câu (N01, N02...) và **giữ nguyên câu gốc** khi phân tích.
2. Chọn **một nhãn chính**; nếu thực sự hai tác dụng có thể ghi nhãn phụ.
3. Với câu không gán được chức năng rõ: `NO_CLEAR_FUNCTION` → ứng viên cắt/gộp.
4. **Không ép đủ 9 nhãn** vào video ngắn. Thiếu `MỒI` hoặc `LẬT` là dấu hiệu **cần xét**, không mặc định FAIL nếu nội dung đã có nhịp và lời giải thỏa đáng.
5. Kiểm câu thực hiện chức năng, không chỉ xuất hiện từ khóa “nhưng”, “vì”, “cuối cùng”.

**Mẫu bảng câu:**

| ID | Thời gian (nếu biết) | Narration nguyên văn | Nhãn | Giá trị mang thêm | Vòng tò mò mở/đóng | Vấn đề & mức độ | Đề xuất sửa |
|---|---|---|---|---|---|---|---|
| N01 | 0–3s | ... | MỞ | ... | Mở L1 | ... | ... |
| N02 | ... | ... | DẪN | ... | ... | ... | ... |

## B2. Kiểm Open Loop (vòng tò mò)

Ở các điểm chuyển ý, người xem cần có **lý do nội dung** để tiếp tục xem, không chỉ có animation đẹp.

| Loop ID | Câu hỏi / lời hứa **cụ thể** | Mở tại Nxx / giây | Trả tại Nyy / giây | Trả đủ? | Có bị kéo dài giả tạo? |
|---|---|---|---|---|---|
| L1 | ... | ... | ... | YES / PARTIAL / NO | ... |

Sáu loại **MỒI** của PM2 cần được kiểm **theo đúng chức năng**:

| Loại mồi | Dấu hiệu đạt | Dấu hiệu không đạt |
|---|---|---|
| **Câu hỏi kế tiếp** | Nảy sinh hợp lý từ lời giải vừa rồi | Câu hỏi rời chủ đề |
| **Phần bị bỏ quên** | Thêm khía cạnh thật sự quan trọng còn thiếu | Chỉ hứa “còn bí mật” |
| **Đếm** | Hứa N mục và trả đủ N mục | Hứa ba nhưng trả hai; đếm câu để câu kéo |
| **Leo thang** | Thông tin mới nâng cấp câu chuyện | Lặp ý cũ và chỉ tăng âm lượng |
| **Ngoại lệ** | Ngoại lệ có thật, chỉ rõ giới hạn quy luật | Tạo ngoại lệ giả, đánh tráo điều kiện |
| **Kéo về người xem** | Chuyển kiến thức thành trải nghiệm/thói quen liên quan | Gắn CTA hoặc ví dụ không ăn nhập |

**Red flags:**
- `EMPTY_LOOP_GAP`: giữa câu Nxx–Nyy các vòng đều đã được trả nhưng video vẫn kéo dài; kiểm có câu hỏi/ý nghĩa thực sự mới hay nên kết thúc sớm.
- `UNPAID_PROMISE`: mở câu hỏi nhưng không trả, hoặc trả không đúng điều đã hỏi.
- `FAKE_TEASE`: “xem đến cuối”, “bí mật”, “sốc” nhưng không nói đủ thông tin để tò mò.
- `OVERDELAY`: giữ đáp án lâu dù phần giữa không cấp thêm chứng cứ/manh mối.
- `PAYOFF_TOO_SMALL`: đáp án nhỏ hơn mức Hook đã hứa.

> ** Mồi thật nêu được câu hỏi cụ thể; sách đề xuất phần trả lời nằm trong khoảng 15 giây tiếp theo như kinh nghiệm viết video 60 giây.** Với clip ngắn hơn, điều chỉnh khoảng chờ theo nhịp nội dung, không kiểm 15 giây như ràng buộc tuyệt đối.

## B3. Kiểm cấu trúc, nhịp và Frontloading

**Kiểm câu chuyện:**

- `FRONTLOADING`: cảnh/chi tiết/luận điểm mạnh nhất có được báo sớm hoặc hé từ đầu không?
- `NÂNG CƯỢC`: sau câu mở, có giải thích “thì sao” mà không sa vào phần giới thiệu dài?
- `INFORMATION_DENSITY`: mỗi câu có một thông tin, hành động, bằng chứng, bước cơ chế hoặc câu hỏi mới? Nếu không, ứng viên gọt.
- `BUT / THEREFORE`: diễn tiến có quan hệ **mâu thuẫn → hệ quả**, không phải chỉ là chuỗi “và rồi”.
- `CONCEPT_LOAD`: có đưa quá nhiều thuật ngữ mới mà không kịp hình dung? Có thể thay bằng ví dụ/ẩn dụ chính xác?
- `AUDIO_READABILITY`: câu đọc lên có tự nhiên, dễ hiểu, có dấu câu và khoảng nghỉ hợp lý?
- `BUDGET`: số tiếng và thời lượng nhắm đến có hợp? Nếu thiếu TTS chỉ ghi `ESTIMATED`, không gắn nhãn AUDIO_LOCKED.

**Beat Sheet 60 giây để tham chiếu** *(mốc đề xuất, không phải luật)*:

| Thời gian | Chức năng |
|---|---|
| 0–3s | Hook / MỞ |
| 3–10s | Nâng cược + bối cảnh tối thiểu |
| 10–25s | Ý 1, trả một phần / ĐÁP, CHỨNG |
| 25–30s | MỒI mới |
| 30–45s | Ý 2–3 / DẪN, CHỨNG, ĐÁP |
| 45–55s | LẬT / giới hạn / phát hiện cuối |
| 55–60s | KẾT + CTA nếu phù hợp |

- Với video 30–45s, **co lại theo nội dung và giọng thực tế**, không nhét đủ mọi nhịp hoặc ép có 3 ý.
- Với video dài hơn, có thể chia nhiều chương nhỏ, mỗi chương mở và trả một câu hỏi riêng.

## B4. Kiểm cú lật, câu đúc kết và CTA

**Năm dạng LẬT :**
1. **Một cơ chế, hai kết quả:** cùng một nguyên nhân giải thích thêm một hiện tượng có vẻ trái ngược.
2. **Giới hạn trung thực:** chỉ ra điều kiện khi câu mở hoặc lời khuyên không còn đúng.
3. **Kéo về hiện tại:** biến thông tin xa thành ý nghĩa với đời sống hôm nay.
4. **Vòng tròn:** trở lại hình ảnh đầu video, nhưng giờ người xem hiểu nó khác.
5. **Đổi câu hỏi:** chứng minh điều quan trọng thực ra nằm ở câu hỏi khác.

**Đánh giá:** Cú lật có liên quan đến câu chuyện, không làm sai hoặc bóp méo dữ kiện? Nếu bỏ cú lật, thông điệp có còn đủ mạnh? Nếu video không cần twist, tránh ép.

**KẾT:** Một câu có thể nhắc lại, không phải khẩu hiệu ghép vào mọi video.  
**CTA:** Một hành động, một lý do rõ, ngắn và cùng lợi ích với video. CTA không được thay phần trả lời.

## B5. Kiểm logic và dữ kiện — cổng chặn độc lập

Tách từng nhận định có thể xác minh. Với từng nhận định ghi:

| Claim ID | Câu gốc | Loại claim | Tình trạng | Nguồn/thiếu nguồn | Hành động |
|---|---|---|---|---|---|
| F01 | ... | Con số / định nghĩa / cơ chế / nhân quả / lịch sử | `VERIFIED` / `PARTIAL` / `UNVERIFIED` / `FALSE` | ... | Giữ / sửa / bỏ / kiểm thêm |

- Không dùng chỉ một lời kể của AI làm bằng chứng. Nguồn ưu tiên tài liệu gốc, cơ quan chính thức, nghiên cứu gốc hoặc đặc tả kỹ thuật liên quan.
- Cảnh báo các lỗi: suy diễn tương quan thành nhân quả; khẳng định 100%; ngoại suy thí nghiệm sang đời thường; đổi đơn vị/mẫu số; “mọi”, “luôn”, “không bao giờ” khi có ngoại lệ.
- Nếu chưa có web/tài liệu nguồn, chỉ ghi `UNVERIFIED` hoặc `LIKELY_FALSE` có giải thích; không tự gán `VERIFIED`.
- **`FALSE` ở claim trung tâm / `UNPAID_PROMISE` ở thông điệp chính → không duyệt sản xuất.**

## B6. Thang đánh giá Narration [MỞ RỘNG — KHÔNG PHẢI ĐIỂM PM2]

Để AI phản biện nhất quán, có thể dùng **8 tiêu chí 0/1/2** (tổng 16 điểm). Đây là rubric do tài liệu này đề xuất, không phải thang tác giả:

| Tiêu chí | 0 — lỗi rõ | 1 — cần sửa | 2 — đạt |
|---|---|---|---|
| **Giữ lời hứa** | Không trả Hook | Có trả nhưng yếu / muộn | Trả rõ, đúng mức |
| **Chức năng từng câu** | Nhiều câu thừa | Một vài câu thừa/lặp | Hầu hết câu góp giá trị |
| **Vòng tò mò** | Nhiều vòng không trả/đứt | Một đoạn chùng | Có mở–trả mạch lạc |
| **Logic mạch kể** | Nhảy cóc/mâu thuẫn | Chuyển ý gượng | Nhân quả, thứ tự rõ |
| **Bằng chứng & giới hạn** | Claim sai cốt lõi | Thiếu dẫn chứng / chưa nêu giới hạn | Thông tin có căn cứ, đúng mức |
| **Nhịp & mật độ** | Dài dòng/đều đều | Một số đoạn chùng | Ngắn gọn, biến đổi nhịp có ý nghĩa |
| **Độ hiểu & lời đọc** | Khó nghe / quá nhiều thuật ngữ | Có chỗ cần diễn đạt lại | Dễ nghe độc lập, tự nhiên |
| **Đoạn kết** | Không có payoff / CTA lấn át | Chưa đáng nhớ | Đúc kết gọn, CTA hợp nếu có |

**Không lấy điểm 16 để bỏ qua lỗi chặn**: một narration có 14/16 nhưng dữ kiện lõi sai vẫn phải `REWRITE`/`FACT_CHECK_BLOCKED`.

---

# PHẦN C — PHẢN BIỆN STORYBOARD

> **Lưu ý nguồn gốc:** PM2 có nguyên tắc *lời – hình – chữ cùng một ý*, hai phép thử tắt tiếng/nhắm mắt, pattern interrupt và mồi nhử có thay đổi nhìn thấy được. **PM2 không công bố thang chấm Storyboard riêng.** Bảng kiểm và thang điểm dưới đây là **[MỞ RỘNG]** để agent có thể kiểm từng cảnh.

## C1. Những tiêu chí trực tiếp 

1. **Lời – hình – chữ nhất quán:** Khung hình phải bồi thêm nghĩa cho câu đọc, không chỉ là hình nền chung chung.
2. **3 giây đầu không cần âm vẫn hiểu:** Thử tắt tiếng và xem hình/chữ có thể hiện điều lạ hoặc câu hỏi.
3. **3 giây đầu không cần hình vẫn hiểu:** Thử nghe voice một mình; lời không dựa hoàn toàn vào hình.
4. **Mồi nhử có dấu hiệu thị giác:** Khi chuyển sang vòng tò mò mới, cân nhắc thay đổi hình/nhịp âm thích hợp.
5. **Pattern Interrupt có ý nghĩa:** PM2 gợi ý đổi tín hiệu hình khoảng 2–3 giây trong video dọc; **không phải bắt buộc hard cut**, không phải thay đổi vì thay đổi.
6. **Nhịp theo ý nghĩa:** Khoảnh khắc phức tạp có thể giữ hình lâu hơn để người xem hiểu; câu ngắn, khoảng lặng và thông tin mới cũng là ngắt nhịp.

## C2. Mẫu đối chiếu từng cảnh

| Scene ID | Bắt đầu–kết thúc | Câu narration | Người xem **cần hiểu** | Vật thể/bối cảnh | Hành động/diễn tiến trên hình | Text/SFX | Vấn đề + cách sửa |
|---|---|---|---|---|---|---|---|
| S01 | 0–3s | N01 | ... | ... | ... | ... | ... |
| S02 | ... | N02–N03 | ... | ... | ... | ... | ... |

**Kiểm từng cảnh bằng bốn câu hỏi:**

1. Sau cảnh này, người xem **biết thêm điều gì** mà trước đó chưa biết?
2. Hình ảnh **chứng minh, mô phỏng, so sánh hoặc làm rõ** thông tin nào từ narration?
3. Nếu bỏ hiệu ứng đẹp, cơ chế/nội dung có còn hiểu được? Nếu không, đó là hiệu ứng thay thông tin.
4. Chuyển sang cảnh sau có **lý do kể chuyện** (đổi ý, mở loop, đưa bằng chứng, trả payoff) hay chỉ ngắt cho đủ nhịp?

## C3. Những lỗi Storyboard AI phải phát hiện

| Mã lỗi | Biểu hiện | Phản biện đề xuất |
|---|---|---|
| `VISUAL_VOICE_MISMATCH` | Voice nói A, hình minh họa B | Đổi hình/đổi vị trí câu, gắn đúng ý A |
| `DECORATIVE_ONLY` | Đẹp nhưng không giải thích/cấp dữ kiện | Thêm cơ chế hoặc ví dụ trực quan, giảm trang trí |
| `VISUAL_STASIS` | Không có thông tin mới hoặc chuyển động có ích quá lâu | Đổi điểm nhìn/trạng thái/hình khi xuất hiện ý mới |
| `NO_CAUSAL_VISUAL` | Kể nguyên nhân → kết quả nhưng hình chỉ quay sản phẩm | Dựng diễn tiến **nguyên nhân → quá trình → kết quả** |
| `HOOK_VISUAL_WEAK` | Hook hấp dẫn nhưng 3 giây đầu chỉ có logo/intro/generic background | Đưa chi tiết xung đột hoặc hiện tượng bất thường lên đầu |
| `TEXT_OVERLOAD` | Chữ đè nhiều, đọc khó, lặp mọi lời voice | Nén thành vài từ khóa và phân cấp chữ |
| `MISLEADING_VISUAL` | Motion/sơ đồ dẫn tới suy luận kỹ thuật sai | Sửa mô hình, kích thước, đơn vị và chú thích giới hạn |
| `BEAT_MISMATCH` | Hình tiết lộ hoặc che thông tin sai thời điểm | Dời reveal/điểm nhấn đúng vòng tò mò |
| `NO_TRANSITION_REASON` | Nhiều chuyển cảnh nhưng không có thay đổi nội dung | Đổi cảnh theo lý do kể chuyện, không chỉ vì “2 giây” |
| `PRODUCTION_UNCLEAR` | Mô tả “animation đẹp, cinematic” không nói vật gì làm gì | Viết hành động cụ thể, trạng thái trước/sau, góc quan sát |

## C4. Rubric Storyboard /16

Mỗi tiêu chí **0 = không đạt; 1 = đạt một phần; 2 = đạt rõ**.

| Tiêu chí | Cần đạt |
|---|---|
| **Hook hình ảnh** | 3 giây đầu có chi tiết trực quan đủ để ngừng lướt, có liên hệ Hook |
| **Khớp lời–hình–chữ** | Không có cảnh đánh lạc hướng hoặc mâu thuẫn nội dung |
| **Có thông tin trên hình** | Mỗi cảnh có mục đích: chứng minh, làm rõ, mô phỏng, so sánh hoặc dẫn dắt |
| **Thể hiện cơ chế/nhân quả** | Cảnh giải thích cho thấy *vì sao và như thế nào*, không chỉ nói kết quả |
| **Nhịp có chủ đích** | Biến đổi nhịp hình/âm theo câu chuyện, không lạm dụng cảnh cắt |
| **Đồng bộ Open Loop** | Điểm mở/đóng vòng có hình ảnh hỗ trợ và không tiết lộ sai lúc |
| **Dễ nhìn/dễ hiểu** | Tránh chữ quá tải, diễn tiến quá nhanh, tranh chấp điểm nhìn |
| **Khả thi & kiểm được** | Mô tả cảnh đủ rõ để sản xuất, kiểm tra và sửa lỗi |

**Điểm /16 chỉ mang tính chuẩn nội bộ**; storyboard chưa render không thể `PASS` các phép thử hình ảnh thực tế. Nếu storyboard thiếu nội dung cảnh, ghi `INSUFFICIENT_INPUT` thay vì tự tưởng tượng có animation tốt.

## C5. Các kiểm thử riêng cho storyboard sản xuất [DỰ ÁN — bật khi có yêu cầu]

- Safe zone cho **chữ, phụ đề, logo**, không nhầm thành giới hạn tất cả vật thể 3D.
- Kích thước chữ, tương phản, hình crop ở khung dọc, vị trí subtitle; **chỉ chấm nếu có quy chuẩn dự án**.
- Với cảnh mô phỏng kỹ thuật: điểm nhìn phải cho thấy đúng cấu tạo và tương tác; cảnh 3D có thể vượt safe zone khi không mất chi tiết cần quan sát.
- Quy ước palette, âm thanh, bản quyền asset, pacing, giới hạn nhân vật... phụ thuộc tài liệu dự án; **không tự gán là yêu cầu PM2**.
- `HOOK_PREVIEW` và `FULL_REVIEW` là kiểm chứng trên media, không phải đánh giá qua mô tả chữ.

---

# PHẦN D — QUYẾT ĐỊNH DUYỆT VÀ MẪU BÁO CÁO

## D1. Logic quyết định [MỞ RỘNG]

| Trạng thái | Điều kiện khuyến nghị | Hành động |
|---|---|---|
| **`REWRITE`** | Hook dưới 7; Hook hứa khác nội dung; claim trung tâm sai; có vòng cốt lõi không trả; mạch kể sai nghiêm trọng | Viết lại đúng phần gây lỗi, kiểm lại từ đầu |
| **`FACT_CHECK_BLOCKED`** | Có claim trung tâm **chưa thể xác minh** mà lời hứa phụ thuộc vào nó | Bổ sung bằng chứng hoặc sửa claim; chưa chuyển sang duyệt sản xuất |
| **`REVISE`** | Cốt lõi đúng nhưng còn câu thừa, nhịp chùng, mồi yếu, cảnh trang trí, thiếu mapping hoặc giới hạn cần nêu | Sửa có trọng tâm, giữ những phần đã tốt |
| **`READY_FOR_REVIEW`** | Hook đạt ngưỡng; claim cần thiết đã có căn cứ; trả đúng Hook; narration và storyboard đủ rõ, nhất quán | Đưa người duyệt xem; **chưa đồng nghĩa được phép render/phát hành** |
| **`NOT_EVALUATED`** | Không có phần đầu vào tương ứng | Không tự cho điểm |

**Ưu tiên xử lý:** sai dữ kiện / lời hứa giả > logic & payoff > sự dễ hiểu > nhịp/visual > thẩm mỹ. Không lấy điểm cao ở phần khác để “bù” lỗi nặng.

## D2. Mẫu báo cáo Markdown cần xuất

```md
# PM2 CRITIQUE — [video_id / topic]

## I. Phạm vi & giới hạn
- Đã nhận: Hook / Narration / Storyboard / Sources / Timing
- Chưa có: ...
- Kết luận khả dụng: ... (chưa có retention thực tế)

## II. Hook
- Hook nguyên văn: "..."
- Hxx chính: ... | Hxx phụ: ...
- Ba tầng: Cú sốc ... | Nâng cược ... | Vòng tò mò ...
- Câu hỏi khán giả mang theo: "...?"
- Promise: ... | Payoff ở Nxx / Sxx: ...
| Tiêu chí | Điểm 0–2 | Dẫn chứng | Cách cải thiện |
|---|---:|---|---|
| Cụ thể | | | |
| Lệch dự đoán đúng | | | |
| Liên quan | | | |
| Mở câu hỏi | | | |
| Trả lời được | | | |
- TỔNG HOOK: .../10 | Kết luận: ...

## III. Narration
| ID | Câu gốc | Nhãn PM2 | Vai trò/giá trị | Lỗi | Sửa |
|---|---|---|---|---|---|
| N01 | ... | MỞ | ... | ... | ... |

### Sổ vòng tò mò
| Loop | Mở ở đâu | Trả ở đâu | Trả đủ? | Vấn đề |
|---|---|---|---|---|
| L1 | N01 | N05 | ... | ... |

### Dữ kiện cần kiểm
| Claim | Độ tin cậy & nguồn | Hành động |
|---|---|---|
| F01 | ... | ... |
- ĐIỂM NARRATION NỘI BỘ: .../16 hoặc NOT_EVALUATED

## IV. Storyboard
| Sxx / thời gian | Mapping lời đọc | Thông tin hình cần thể hiện | Đánh giá | Sửa |
|---|---|---|---|---|
| S01 | N01 | ... | ... | ... |
- Thử tắt tiếng: PASS/FAIL/NEEDS_PREVIEW
- Thử nhắm mắt: PASS/FAIL/NEEDS_AUDIO
- ĐIỂM STORYBOARD NỘI BỘ: .../16 hoặc NOT_EVALUATED

## V. Ba ưu tiên sửa
1. [CRITICAL/HIGH/MEDIUM] Câu/cảnh ... → vấn đề ... → hành động ...
2. ...
3. ...

## VI. Quyết định
- Kết luận: REWRITE / FACT_CHECK_BLOCKED / REVISE / READY_FOR_REVIEW
- Phần được giữ nguyên: ...
- Phần cần người duyệt quyết định: ...
- Không dự đoán retention/viral từ kịch bản.
```

## D3. Checklist cuối trước khi chuyển cho người duyệt

### Hook
- [ ] Xác định được Hxx chính trong 12 kiểu; không gán tùy tiện.
- [ ] Chấm đầy đủ 5 tiêu chí, có lý do rõ, **Hook ≥ 7/10**.
- [ ] Ba tầng có đủ về chức năng (không cần ba câu).
- [ ] Có một câu hỏi cụ thể trong đầu khán giả; có payoff thực sự.
- [ ] Không giật tít, không dùng dữ kiện chưa kiểm như sự thật chắc chắn.

### Narration
- [ ] Mỗi câu được gắn nhãn PM2 hoặc báo không có chức năng.
- [ ] Có bảng các vòng mở/đóng; không nợ câu hỏi chính.
- [ ] Logic và bằng chứng không nhảy cóc; claim quan trọng đã được xác minh hoặc được đánh dấu chặn.
- [ ] Không giữ đáp án bằng mồi giả; câu thừa/lặp được chỉ rõ.
- [ ] Câu cuối trả được thông điệp, CTA không làm mất payoff.
- [ ] Có phương án đọc phù hợp thời lượng; chưa có TTS thì chỉ ước lượng.

### Storyboard
- [ ] Hook 3 giây đầu có cảnh nêu đúng điểm lạ/giá trị.
- [ ] Mapping cảnh ↔ câu narration rõ ràng.
- [ ] Mỗi cảnh cho thêm thông tin hoặc dẫn dắt cần thiết.
- [ ] Pattern interrupt có lý do nội dung; không hard cut máy móc.
- [ ] Cảnh giải thích diễn tả **nguyên nhân → quá trình → kết quả** khi phù hợp.
- [ ] Chữ/đồ họa không cản thông tin; safe zone theo chuẩn dự án nếu có.
- [ ] Việc đạt trên **storyboard văn bản** không bị trình bày như đã xem preview.

---

# PHẦN E — SYSTEM PROMPT MẪU CHO AGENT PHẢN BIỆN

```text
VAI TRÒ
Bạn là Script & Storyboard Critic. Phản biện nghiêm khắc, thực chứng và có khả năng đưa ra sửa đổi rõ ràng cho video ngắn.

TÀI LIỆU GỐC
Đọc file PM2_FRAMEWORK_PHAN_BIEN_HOOK_NARRATION_STORYBOARD.md trước khi đánh giá. 

NGUYÊN TẮC
- Đánh giá nội dung được giao, không đoán thành phần còn thiếu.
- Hook: xác định H01–H12; chấm đúng 5 tiêu chí 0–2 (tổng /10), dưới 7 là viết lại.
- Narration: gắn nhãn từng câu: MỞ/NỀN/DẪN/CHỨNG/ĐÁP/MỒI/LẬT/KẾT/CTA; lập sổ Open Loop, tìm câu thừa, lỗi logic, claim thiếu nguồn, payoff yếu.
- Storyboard: kiểm từng cảnh có mapping câu thoại, giá trị thông tin, đồng bộ lời–hình–chữ, nhịp có mục đích, cơ chế trực quan; không báo đã xem video khi mới có văn bản.
- Không dùng câu cảm tính như 'rất cuốn', 'dự kiến retention cao' nếu thiếu căn cứ. Không lấy chấm điểm nội bộ làm thang điểm chính thức PM2.
- Chỉ khuyến nghị tối đa 3 sửa đổi ưu tiên, nêu ID câu/cảnh/mốc và phương án trước→sau. Không tự viết lại toàn bộ nếu chưa được yêu cầu.
- Nếu phát hiện lỗi dữ kiện cốt lõi, claim không nguồn hoặc lời hứa không trả: không duyệt dù điểm hình thức cao.

ĐẦU RA
Xuất báo cáo theo PHẦN D2 của tài liệu, kết thúc bằng một trong: REWRITE / FACT_CHECK_BLOCKED / REVISE / READY_FOR_REVIEW.
```