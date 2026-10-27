// Đọc lệnh Telegram. Link video là tùy chọn: không có thì lấy video mới nhất trong thư mục input trên Drive.

export type Command =
  | { kind: "job"; workflow: "shop-ads" | "faceless" | "dubbing"; source: string; text: string; style?: string }
  | { kind: "status" }
  | { kind: "retry"; jobId: string }
  | { kind: "fix"; jobId?: string; request: string } // bỏ trống jobId = job xong gần nhất
  | { kind: "lessons" }
  | { kind: "forget"; lessonId: string }
  | { kind: "learn"; name: string; source: string; note: string }
  | { kind: "help" }
  | { kind: "unknown"; text: string };

const WORKFLOW: Record<string, "shop-ads" | "faceless" | "dubbing"> = {
  ads: "shop-ads",
  faceless: "faceless",
  dub: "dubbing",
};

export function parseCommand(input: string): Command {
  const text = input.trim();
  const m = text.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  if (!m) return { kind: "unknown", text };
  const name = m[1].toLowerCase();
  const rest = (m[2] ?? "").trim();

  if (name === "start" || name === "help") return { kind: "help" };
  if (name === "status") return { kind: "status" };
  if (name === "retry") return { kind: "retry", jobId: rest.split(/\s+/)[0] ?? "" };
  if (name === "sua") {
    const id = rest.match(/^(\d{8}-\d{6}-[0-9a-f]{4})\s*/);
    return { kind: "fix", ...(id ? { jobId: id[1] } : {}), request: id ? rest.slice(id[0].length).trim() : rest };
  }
  if (name === "baihoc") return { kind: "lessons" };
  if (name === "quen") return { kind: "forget", lessonId: rest.split(/\s+/)[0] ?? "" };
  if (name === "hocvideo") {
    const [styleName = "", ...more] = rest.split(/\s+/);
    const after = more.join(" ");
    const link = after.match(/^(https?:\/\/\S+)\s*/);
    return { kind: "learn", name: styleName, source: link ? link[1] : "", note: link ? after.slice(link[0].length).trim() : after };
  }
  const workflow = WORKFLOW[name];
  if (!workflow) return { kind: "unknown", text };

  const link = rest.match(/^(https?:\/\/\S+)\s*/);
  let body = link ? rest.slice(link[0].length).trim() : rest;
  // "style:ten-phong-cach" ở bất kỳ đâu trong lệnh: dùng phong cách đã học
  const style = body.match(/(?:^|\s)style:([\w-]+)/);
  if (style) body = body.replace(style[0], " ").replace(/[ \t]{2,}/g, " ").trim();
  return { kind: "job", workflow, source: link ? link[1] : "", text: body, ...(style ? { style: style[1] } : {}) };
}

export const HELP = `Cách 1: gửi video thẳng vào đây (dưới 20 MB), ghi lệnh ở phần chú thích.
Cách 2: up video lên Google Drive, rồi gửi lệnh kèm link.

Lệnh:

/ads <link Drive> <yêu cầu>
Quảng cáo shop quay thật. Ví dụ:
/ads https://drive.google.com/file/d/... làm nổi giá 199k, phụ đề nền đen

/faceless <link Drive> <nội dung cần nói>
Claude viết kịch bản, bạn duyệt, rồi giọng AI đọc.

/dub <link Drive>
<kịch bản thuyết minh ở các dòng tiếp theo>

Không gửi video, không ghi link thì lấy video mới nhất trong thư mục input trên Drive.
Video đã edit dưới 50 MB được gửi thẳng về đây, kèm link Drive.

Thêm style:<tên> vào lệnh để theo phong cách đã học, ví dụ: /ads style:doi-thu-a làm nổi giá

/status: xem các job gần đây
/retry <mã job>: chạy tiếp job bị lỗi
/sua <mã job> <yêu cầu>: sửa hiệu ứng video đã xong (bỏ mã job = job gần nhất). Góp ý được ghi nhớ cho các video sau.
/baihoc: xem các bài học đã ghi nhớ
/quen <mã bài học>: bỏ một bài học
/hocvideo <tên> <link Drive>: học phong cách từ video đối thủ (hoặc gửi video kèm chú thích /hocvideo <tên>)`;
