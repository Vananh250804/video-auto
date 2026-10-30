# PM2 cho video bán hàng (shop-ads one-shot, faceless, dubbing)

Bản chỉnh từ `pm2-original.md` (PM2 phản biện Hook · Narration · Storyboard) cho video quảng cáo bán hàng. Giữ nguyên tinh thần PM2: dẫn chứng bằng câu gốc và mốc giây, tách **quan sát** với **giả thuyết**, không đoán retention/viral, sửa ít nhưng trúng.

Khác biệt chính so với PM2 gốc:

| PM2 gốc | Bản bán hàng |
|---|---|
| Duyệt kịch bản **trước khi quay** | One-shot đã quay xong: sửa bằng **dựng** (cắt, đảo đoạn, chữ, zoom, sfx), chỉ đề nghị quay lại khi dựng không cứu được |
| Storyboard văn bản | **Dòng thời gian hình ảnh** lấy từ khung hình thật của video |
| Kiểm dữ kiện khoa học, nguồn | Kiểm **lời khen có được demo trên hình**, giá/ưu đãi rõ, **luật quảng cáo TikTok** |
| 9 nhãn câu | Thêm `DEMO`, `ƯU ĐÃI`; `LẬT` hiếm khi cần; `CTA` bắt buộc |
| Kết luận REWRITE / REVISE / READY | `QUAY_LẠI` / `DỰNG_LẠI` / `CHỈNH_NHẸ` / `ĐẠT` |

Faceless (kịch bản do Claude viết, duyệt trước khi đọc giọng) gần với PM2 gốc nhất: dùng thang hook /10 ở bước `script-review`, sửa bằng **viết lại** kịch bản.

---

## 0. Đầu vào (gói đánh giá từ `npm run review`)

- `transcript.md`: lời nói từng dòng có mốc giây, đánh số N01, N02...; các đoạn **không có lời** dài hơn 1.5 giây được ghi rõ.
- `stats.json`: độ dài, tỉ lệ thời gian có lời, tốc độ nói (từ/giây), đoạn không lời, câu đệm lặp nhiều, từ dễ bị chặn quảng cáo, lần nhắc giá đầu tiên, có lời kêu gọi mua không.
- `frames/`: khung hình 0s, 0.5s, 1s, 1.5s, 2s, 3s, rồi mỗi 3 giây; `sheet.png` toàn video.
- `brief` (nếu có): sản phẩm, giá thật, ưu đãi, người dùng muốn gì.

Thiếu phần nào thì phần đó ghi `NOT_EVALUATED`. Chỉ có ảnh tĩnh thì **không** kết luận về chuyển động, âm thanh, nhịp cắt; ghi `CẦN XEM VIDEO`.

## 1. Thứ tự đánh giá

1. **Cổng chặn** (độc lập với độ hấp dẫn): giá/ưu đãi sai hoặc mâu thuẫn; lời khen tuyệt đối, cam kết, y tế; nói một đằng hình một nẻo về chính sản phẩm.
2. **Hook 0–3 giây**: kiểu hook, ba tầng, chấm /10.
3. **Lời nói**: nhãn từng câu, sổ vòng tò mò, chỗ lan man.
4. **Hình ảnh**: dòng thời gian, thử tắt tiếng, sản phẩm rõ chưa, hình đứng yên, chữ che.
5. **Kết luận** + tối đa 3 việc sửa, viết dưới dạng **làm được khi dựng** (có mốc giây).

---

## A. Hook (0–3 giây)

### A1. Kiểu hook hay gặp trong video bán hàng

Chọn 1 kiểu chính (mã giữ theo PM2 gốc). Các kiểu khác (H01, H02, H06, H10, H12) vẫn dùng được nhưng hiếm trong one-shot bán hàng.

| Mã | Kiểu | Dạng trong video bán hàng | Lỗi phải bắt |
|---|---|---|---|
| H03 | Con số quá cỡ | "Loa bluetooth mà chỉ hơn 200 nghìn" | Hô "giá sốc" nhưng **không nói số**; số sai với giá thật |
| H04 | Phá điều tưởng đúng | "Ai bảo loa mini thì tiếng nhỏ" | Ngộ nhận không ai tin; nói xong không demo chứng minh |
| H05 | Nếu… thì… | "Đi phượt mà chưa có cái này thì phí" | Dọa, thổi phồng hậu quả |
| H07 | Mở giữa cảnh / demo ngay | Giây 0 đã thấy LED sáng, sản phẩm hít vào điện thoại | Mở bằng chào hỏi, logo, tay che sản phẩm |
| H08 | Lời hứa có thời hạn | "5 giây là hút sạch vết bẩn" | Hứa rồi không demo đúng thời gian đó |
| H09 | So sánh lệch cỡ | "Nhỏ bằng quả cam mà tiếng bằng loa kéo" | So khác thước đo; nói quá |
| H11 | Gọi đúng người | "Ai hay đạp xe một mình thì xem cái này" | Gọi người bán ("anh em bán loa khóc thét") trong khi người xem là **người mua** |

### A2. Ba tầng (giữ nguyên PM2)

- **Dừng lướt**: trong 3 giây đầu có **vật cụ thể + điểm lạ** (giá, tính năng nhìn thấy, cảnh đang diễn ra).
- **Đáng quan tâm**: người mua được gì / mất gì.
- **Muốn ở lại**: viết được **một câu hỏi** người xem mang theo ("giá bao nhiêu?", "có hít chắc không?"). Câu hỏi đó phải được trả trong video; khác thì `PROMISE_MISMATCH`.

### A3. Chấm /10 (5 tiêu chí × 0–2, như PM2)

| Tiêu chí | 0 | 1 | 2 |
|---|---|---|---|
| Cụ thể | Lời dẫn, chào hỏi | Có tên loại sản phẩm, chưa có chi tiết | Có sản phẩm + con số / tính năng / cảnh nhìn thấy được |
| Lệch dự đoán nhưng đúng | Nói chung chung "rẻ lắm", "xịn lắm" | Bất ngờ nhẹ | Chênh rõ giữa điều người xem tưởng và điều thật (giá, kích thước, tính năng), có demo hoặc số |
| Liên quan người mua | Nói về người bán, đối thủ | Có thể liên quan | Gắn với nhu cầu, tình huống dùng của người xem |
| Mở câu hỏi | Không có | Tò mò chung | Một câu hỏi cụ thể |
| Trả lời được trong video | Không trả | Trả muộn (sau 50% video) hoặc mơ hồ | Trả rõ, sớm (trong khoảng 15 giây, hoặc trước 40% video) |

`0–6` → `HOOK_YẾU`. Với one-shot: sửa bằng **chữ mở đầu** từ giây 0, **đảo đoạn** (đưa demo/giá mạnh nhất lên đầu, có thể bằng một đoạn trích 1.5–3 giây đặt trước), hoặc **cắt** phần chào hỏi. Với faceless: viết lại câu hook.

**Thử tắt tiếng** (khung 0–3s): chỉ nhìn hình + chữ có biết đang bán gì và điểm lạ là gì? **Thử nhắm mắt** (lời 0–3s): chỉ nghe có hiểu không?

---

## B. Lời nói

### B1. Nhãn từng câu

Giữ 9 nhãn PM2, thêm 2 nhãn cho bán hàng:

| Nhãn | Trong video bán hàng |
|---|---|
| MỞ | Hook |
| NỀN | Vấn đề / tình huống của người mua |
| DẪN | Câu nối có lý do (chuyển sang tính năng tiếp theo) |
| **DEMO** | Đang cho thấy tính năng trên hình (lời và hình cùng lúc) |
| CHỨNG | Bằng chứng ngoài demo: số đo, thông số, phản hồi khách **có thật** |
| ĐÁP | Trả câu hỏi đã mở (thường là giá) |
| **ƯU ĐÃI** | Giá, quà, freeship, hạn chương trình |
| MỒI | Hứa thông tin kế tiếp ("còn cái hay nhất là…") và **có trả** |
| LẬT | Hiếm; chỉ khi có thật (ví dụ "nhìn nhỏ vậy chứ…" rồi demo) |
| KẾT | Câu chốt lợi ích |
| CTA | Bấm giỏ hàng / inbox / link — **bắt buộc**, giữ trên màn hình ≥ 2 giây |

Câu không gán được nhãn → `NO_CLEAR_FUNCTION`, ứng viên cắt.

### B2. Lan man — các dấu hiệu phải báo (kèm mốc giây)

| Mã | Dấu hiệu |
|---|---|
| `NO_CLEAR_FUNCTION` | "Nhưng mà thôi không nói nhiều nữa", "Được không anh em?", "Đấy" đứng riêng |
| `FILLER_REPEAT` | Câu đệm lặp nhiều ("anh em ạ", "nhé", "đấy", "cả nhà ơi") — xem `stats.fillers` |
| `REPEAT_IDEA` | Hai câu cùng một ý |
| `DEAD_AIR` | Đoạn không lời > 3 giây mà hình không có demo mới (xem `stats.gaps` + khung hình) |
| `OVERDELAY` | Câu hỏi mở ở hook (thường là giá) trả sau 50% video |
| `EMPTY_LOOP_GAP` | Đã trả hết, đã CTA, mà video còn kéo dài |
| `LOW_DENSITY` | Tốc độ nói < 2 từ/giây kéo dài, hoặc nhiều câu liền không có thông tin mới |

Mỗi phát hiện kèm **đề xuất dựng**: cắt `a–b s`, rút đoạn còn `x s`, gộp.

### B3. Cấu trúc tham chiếu (không phải luật)

| Video 15–30s | Video 30–60s | Chức năng |
|---|---|---|
| 0–3s | 0–3s | Hook (MỞ, thường kèm DEMO) |
| 3–8s | 3–12s | Vấn đề / tình huống dùng (NỀN) |
| 8–20s | 12–40s | 1–3 tính năng, mỗi cái DEMO (không kể tính năng không demo được) |
| 20–25s | 40–52s | ƯU ĐÃI (giá) + lý do mua ngay có thật |
| 25–30s | 52–60s | CTA |

Video > 60 giây: phải có lý do (nhiều demo đáng xem). Nếu không, đề xuất rút.

### B4. Cổng chặn nội dung quảng cáo

| Mã | Ví dụ | Hành động |
|---|---|---|
| `AD_POLICY` | tốt nhất, số 1, rẻ nhất, cam kết, đảm bảo, 100%, chữa, trị, giảm cân, từ tục ("vãi") | Cắt câu / tắt tiếng đoạn đó / không đưa lên chữ |
| `CLAIM_NOT_SHOWN` | "Chống nước", "pin 10 tiếng" chỉ nói miệng | Ghi `CẦN KIỂM` với người bán; không đưa lên chữ highlight |
| `PRICE_UNCLEAR` | "hơn hai lốt", giá nói mơ hồ hoặc khác brief | Hỏi người bán giá thật; chữ highlight ghi số rõ |
| `FALSE` | Giá trên chữ khác giá nói | Chặn, không giao video |

---

## C. Hình ảnh (thay cho Storyboard)

### C1. Dòng thời gian hình ảnh

Lập bảng từ `frames/`:

| Mốc | Thấy gì (sản phẩm / mặt / tay / chữ) | Câu lời cùng lúc | Khớp? | Vấn đề |
|---|---|---|---|---|

### C2. Lỗi phải bắt

| Mã | Biểu hiện | Sửa khi dựng |
|---|---|---|
| `HOOK_VISUAL_WEAK` | 0–3s không thấy rõ sản phẩm (chỉ mặt, tay che, đang chào) | Đảo một cảnh demo lên đầu; chữ mở đầu nêu sản phẩm + điểm lạ |
| `PRODUCT_UNCLEAR` | Sản phẩm nhỏ, mờ, ra khỏi khung, ngược sáng | Zoom vào sản phẩm; chọn đoạn khác |
| `VISUAL_VOICE_MISMATCH` | Lời nói tính năng A, hình đang cho thấy B | Dời chữ highlight đúng lúc hình; cắt câu |
| `VISUAL_STASIS` | > 4 giây hình không đổi, không demo mới | Zoom giật, chữ, hoặc cắt ngắn |
| `TEXT_COVERS` | Chữ/phụ đề che mặt hoặc sản phẩm | Đổi vị trí chữ (top/center/bottom) |
| `TEXT_OVERLOAD` | Chữ highlight 2 dòng, nhiều chữ cùng lúc | Rút còn 2–3 từ, một chữ một lúc |
| `SAFE_ZONE` | Chữ quan trọng ở dưới ~17% hoặc trên ~6% khung dọc, mép phải ~11% | Dời lên vùng an toàn |
| `CTA_VISUAL_MISSING` | Lời có CTA nhưng hình không có chữ CTA, hoặc chữ < 2 giây | Thêm chữ CTA giữ ≥ 2 giây |

### C3. Thử tắt tiếng toàn video

Chỉ xem ảnh ghép: người xem có biết **bán gì, giá bao nhiêu, bấm vào đâu** không? Ghi PASS / FAIL + thiếu gì.

---

## D. Kết luận và báo cáo

### D1. Kết luận

| Kết luận | Khi nào | Hành động |
|---|---|---|
| `QUAY_LẠI` | Không có cảnh nào thấy rõ sản phẩm; giá sai cốt lõi; toàn bộ lời vi phạm quảng cáo | Báo người bán, không dựng |
| `DỰNG_LẠI` | Hook < 7 không cứu bằng chữ; lan man > 25% thời lượng; cần đảo/cắt lớn | Cắt, đảo đoạn, làm lại `edit.json` |
| `CHỈNH_NHẸ` | Cốt lõi ổn, còn vài câu thừa, chữ sai chỗ, nhịp chùng một đoạn | Sửa `edit.json` |
| `ĐẠT` | Hook ≥ 7, giá rõ, CTA có, không lỗi chặn | Chuyển người dùng duyệt (vẫn chưa phải phát hành) |

Ưu tiên: giá sai / vi phạm quảng cáo > hook > lan man > hình > thẩm mỹ. Không lấy điểm cao phần này bù lỗi chặn phần khác.

### D2. Mẫu báo cáo

```md
# ĐÁNH GIÁ VIDEO — [tên job]

## Phạm vi
- Đã có: lời nói / khung hình / brief | Chưa có: ...

## Hook (0–3s) — [điểm]/10 — [Hxx]
- Lời 0–3s: "..." | Hình 0–3s: ...
- Ba tầng: dừng lướt ... | đáng quan tâm ... | câu hỏi người xem: "...?"
- Trả lời ở: Nxx / [giây] (sớm / muộn)
| Tiêu chí | Điểm | Dẫn chứng |
- Thử tắt tiếng 0–3s: PASS/FAIL ...

## Lời nói
| ID | Giây | Câu gốc | Nhãn | Vấn đề |
- Lan man: [mã] [giây] ... (tổng ~x giây = y% video)
- Cổng quảng cáo: ...

## Hình ảnh
| Mốc | Thấy gì | Lời cùng lúc | Vấn đề |
- Thử tắt tiếng toàn video: ...

## Chỗ hai bên lệch nhau (lời ↔ hình)
- ...

## 3 việc sửa ưu tiên (làm được khi dựng)
1. [CRITICAL/HIGH/MEDIUM] [giây] vấn đề → việc làm (cắt / đảo / chữ / zoom) → trường edit.json
2. ...
3. ...

## Kết luận: QUAY_LẠI / DỰNG_LẠI / CHỈNH_NHẸ / ĐẠT
- Giữ nguyên: ...
- Cần người dùng quyết: ...
```
