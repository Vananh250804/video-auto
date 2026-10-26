// Lấy object JSON đầu tiên trong câu trả lời (bỏ qua ```json và lời dẫn nếu có).
export function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Không tìm thấy JSON trong câu trả lời");
  return JSON.parse(body.slice(start, end + 1));
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}
