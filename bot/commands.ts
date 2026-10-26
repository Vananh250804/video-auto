// Đọc lệnh Telegram. Link video là tùy chọn: không có thì lấy video mới nhất trong thư mục input trên Drive.

export type Command =
  | { kind: "job"; workflow: "shop-ads" | "faceless" | "dubbing"; source: string; text: string }
  | { kind: "status" }
  | { kind: "retry"; jobId: string }
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
  const workflow = WORKFLOW[name];
  if (!workflow) return { kind: "unknown", text };

  const link = rest.match(/^(https?:\/\/\S+)\s*/);
  return { kind: "job", workflow, source: link ? link[1] : "", text: link ? rest.slice(link[0].length).trim() : rest };
}

export const HELP = `Gửi video lên Google Drive, rồi gửi lệnh:

/ads <link Drive> <yêu cầu>
Quảng cáo shop quay thật. Ví dụ:
/ads https://drive.google.com/file/d/... làm nổi giá 199k, phụ đề nền đen

/faceless <link Drive> <nội dung cần nói>
Claude viết kịch bản, bạn duyệt, rồi giọng AI đọc.

/dub <link Drive>
<kịch bản thuyết minh ở các dòng tiếp theo>

Không ghi link thì lấy video mới nhất trong thư mục input.

/status: xem các job gần đây
/retry <mã job>: chạy tiếp job bị lỗi`;
