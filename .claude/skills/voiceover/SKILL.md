---
name: voiceover
description: Đọc kịch bản bằng giọng AI tiếng Việt và ghép vào video, kèm phụ đề khớp giọng đọc. Dùng cho video faceless, lồng tiếng theo kịch bản có sẵn, hoặc thêm lời thuyết minh cho video quảng cáo.
---

# voiceover

Kịch bản → giọng đọc AI (mặc định ElevenLabs) → ghép vào video → phụ đề theo giọng đọc.

## Cách chạy

```bash
# Kịch bản trong file
npm run voiceover -- "video.mp4" --script "kich-ban.txt"

# Kịch bản ngắn gõ trực tiếp
npm run voiceover -- "video.mp4" --text "Chào các bạn, hôm nay mình review..."

# Giữ tiếng gốc nhỏ phía sau (0 = bỏ hẳn tiếng gốc)
npm run voiceover -- "video.mp4" --script "kich-ban.txt" --original-volume 0.15

# Đổi giọng hoặc provider
npm run voiceover -- "video.mp4" --script "kich-ban.txt" --voice <voice_id> --tts elevenlabs
```

Kết quả trong thư mục job: `voiceover.mp4`, `voice.mp3`, `subtitles.srt`, `captions.json`, `script.txt`.

## Cần có

- `ELEVENLABS_API_KEY` và `ELEVENLABS_VOICE_ID` trong `.env`
- Model đổi trong `config/default.yaml` (`elevenlabs.tts_model`): `eleven_v3` hay nhất, `eleven_flash_v2_5` rẻ và nhanh

## Quy tắc

- Kịch bản viết như văn nói: câu ngắn, có dấu chấm phẩy để giọng ngắt nghỉ đúng. Số tiền viết rõ (`199 nghìn` thay vì `199k`).
- Nếu kịch bản do Claude viết (video faceless), phải đưa người dùng duyệt trước khi đọc giọng (skill `script-review`). Kịch bản người dùng đưa sẵn thì đọc luôn.
- Giọng dài hơn video thì video giữ khung hình cuối cho tới hết giọng (`extendedSec` trong kết quả). Nếu `extendedSec` lớn hơn 2 giây, báo người dùng: nên rút gọn kịch bản hoặc dùng video dài hơn.
- Video có nhạc hoặc tiếng shop thật: dùng `--original-volume 0.1` đến `0.2`. Video không cần tiếng gốc: để `0`.
