# Quy trình edit một video (lệnh chi tiết)

Mọi lệnh chạy ở thư mục gốc project. Dùng `<job>` = `workspace/jobs/<id>`. Không sửa video gốc.

## 1. Nhận video

```bash
npm run probe -- "<video>"              # tỉ lệ, độ dài, có tiếng không
```

Tạo `<job>/input`, `<job>/work`, `<job>/output`, chép video vào `<job>/input/source.mp4`.
Video không có tiếng thì bỏ qua cắt khoảng lặng và nhận giọng.

## 2. Nhận giọng và đánh giá

```bash
npm run cut -- <job>/input/source.mp4 --dry-run          # xem trước khoảng lặng (thường 0 với video livestream)
npm run subtitle -- <job>/input/source.mp4 --out-dir <job>/work     # tốn credit ElevenLabs
npm run review -- <job>/input/source.mp4 --captions <job>/work/captions.json --out-dir <job>/review --brief "sản phẩm, giá thật, ưu đãi"
```

Rồi gọi **2 agent song song, cùng một lượt**: `hook-content-critic` (chỉ đọc lời nói) và `visual-critic` (chỉ xem hình), mỗi agent chỉ nhận đường dẫn thư mục `<job>/review`. Đối chiếu chéo và viết `<job>/review/report.md` theo skill `video-review`.

Khi nghi ngờ chữ, logo, giá trên hình, tự cắt cận khung hình cho chắc:

```bash
ffmpeg -ss 99 -i <job>/input/source.mp4 -frames:v 1 -vf "crop=iw*0.6:ih*0.35:iw*0.2:ih*0.25" <job>/review/cận.png
```

## 3. Hỏi khách

Gom các câu hỏi vào một lượt, mỗi câu có đề xuất (Recommended) và lý do: tên thương hiệu, giá và cách hiện giá, đoạn dài không lời xử lý thế nào, mức cắt tổng thể (video còn khoảng bao nhiêu giây).

## 4. Cắt, đảo đoạn

Chọn các đoạn giữ lại (giây gốc), ngắt đúng ở khoảng lặng giữa các từ, có fade tiếng ngắn ở mỗi chỗ nối. Dùng ffmpeg `trim` + `atrim` + `concat`, `fps=30`, `libx264 -crf 18`. Ví dụ 3 đoạn:

```bash
ffmpeg -y -i <job>/input/source.mp4 -filter_complex \
"[0:v]trim=8.46:12.52,setpts=PTS-STARTPTS,fps=30[v0];[0:a]atrim=8.46:12.52,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=4.02:d=0.04[a0];
 [0:v]trim=5.5:8.1,setpts=PTS-STARTPTS,fps=30[v1];[0:a]atrim=5.5:8.1,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=2.56:d=0.04[a1];
 [0:v]trim=13.76:16.34,setpts=PTS-STARTPTS,fps=30[v2];[0:a]atrim=13.76:16.34,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=2.54:d=0.04[a2];
 [v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]" \
-map "[v]" -map "[a]" -c:v libx264 -crf 18 -c:a aac -b:a 192k -ar 44100 -movflags +faststart <job>/work/cut.mp4
```

Giữ đứng khung cuối để đặt chữ kêu gọi: thêm một đoạn `trim=<giây cuối>:<giây cuối + 0.04>,tpad=stop_mode=clone:stop_duration=1.5` và một đoạn `anullsrc` cho tiếng.

**Dời phụ đề theo video mới:** với mỗi từ trong `captions.json` gốc, nếu nằm trong một đoạn giữ lại `[a, b]` thì `start/end` mới = `start/end` cũ + (điểm bắt đầu của đoạn trong video mới − a). Sắp xếp theo thời gian video mới (đảo đoạn thì thứ tự khác thời gian gốc). Rồi chia lại dòng: mỗi câu ≤ 15 ký tự, ngắt ở dấu câu, bỏ từ vấp.

## 5. edit.json và render

Viết `<job>/work/edit.json` (schema `schemas/edit.schema.json`). Quy tắc chữ, zoom, sfx xem KINH-NGHIEM-EDIT.md. Hoặc nhờ `edit-planner` đề xuất:

```bash
npm run plan -- <job>/work/cut.mp4 --captions <job>/work/cut-captions.json --workflow shop-ads --review <job>/review/report.md --request "..." --out <job>/work/edit.json
npm run render -- <job>/work/edit.json --out <job>/work/final-raw.mp4
```

## 6. Kiểm tra, chuẩn hóa âm lượng, gửi

```bash
npm run qa -- <job>/work/final-raw.mp4 --sheet            # xem ảnh ghép, sửa, render lại
npm run loudnorm -- <job>/work/final-raw.mp4 --out <job>/output/final.mp4
npm run qa -- <job>/output/final.mp4 --expect-duration <giây>
```

Quan sát thêm bằng cách chụp vài khung có chữ highlight (ví dụ mỗi mốc có chữ) ghép thành một ảnh rồi xem.

## 7. Video faceless (kịch bản Claude viết)

```bash
npm run script -- write --brief "..." --seconds 30 --dir <job>      # chờ khách duyệt, không tự duyệt
npm run script -- approve --dir <job>                              # chỉ chạy khi khách nói rõ đồng ý
npm run voiceover -- "<video>" --script <job>/script.txt --out-dir <job>
```
