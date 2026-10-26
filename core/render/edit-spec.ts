// edit.json: mô tả một lần render. Người dùng, preset hoặc Claude (edit-planner) viết file này.
// Đường dẫn tương đối tính từ thư mục gốc project. Schema: schemas/edit.schema.json.

export interface EditSpec {
  video: string;
  captions?: string; // captions.json từ vn-subtitle hoặc voiceover
  captionStyle?: string; // tên file trong presets/captions/, "none" = không in phụ đề
  originalVolume?: number;
  overlays?: {
    text: string;
    start: number;
    end: number;
    position?: "top" | "center" | "bottom";
    color?: string;
    background?: string;
  }[];
  sfx?: { file: string; at: number; volume?: number }[];
  music?: { file: string; volume?: number };
  maxShortSide?: number; // giới hạn độ phân giải, mặc định 1080
}

const POSITIONS = ["top", "center", "bottom"];

export function validateEdit(input: unknown): EditSpec {
  const errors: string[] = [];
  const e = input as any;
  const isObj = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);
  const num = (v: unknown, path: string, min = 0, max = Infinity) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) errors.push(`${path} phải là số từ ${min}${max === Infinity ? "" : ` đến ${max}`}`);
  };
  const str = (v: unknown, path: string) => {
    if (typeof v !== "string" || !v.trim()) errors.push(`${path} phải là chuỗi không rỗng`);
  };

  if (!isObj(e)) throw new Error("edit.json phải là một object");
  str(e.video, "video");
  if (e.captions !== undefined) str(e.captions, "captions");
  if (e.captionStyle !== undefined) str(e.captionStyle, "captionStyle");
  if (e.captionStyle !== undefined && !/^[a-z0-9-]+$/.test(e.captionStyle)) errors.push("captionStyle chỉ gồm chữ thường, số, gạch ngang");
  if (e.originalVolume !== undefined) num(e.originalVolume, "originalVolume", 0, 2);
  if (e.maxShortSide !== undefined) num(e.maxShortSide, "maxShortSide", 240, 4320);

  if (e.overlays !== undefined) {
    if (!Array.isArray(e.overlays)) errors.push("overlays phải là mảng");
    else e.overlays.forEach((o: any, i: number) => {
      const p = `overlays[${i}]`;
      if (!isObj(o)) return errors.push(`${p} phải là object`);
      str(o.text, `${p}.text`);
      num(o.start, `${p}.start`);
      num(o.end, `${p}.end`);
      if (typeof o.start === "number" && typeof o.end === "number" && o.end <= o.start) errors.push(`${p}.end phải lớn hơn start`);
      if (o.position !== undefined && !POSITIONS.includes(o.position)) errors.push(`${p}.position phải là top, center hoặc bottom`);
      if (o.color !== undefined) str(o.color, `${p}.color`);
      if (o.background !== undefined) str(o.background, `${p}.background`);
    });
  }
  if (e.sfx !== undefined) {
    if (!Array.isArray(e.sfx)) errors.push("sfx phải là mảng");
    else e.sfx.forEach((s: any, i: number) => {
      const p = `sfx[${i}]`;
      if (!isObj(s)) return errors.push(`${p} phải là object`);
      str(s.file, `${p}.file`);
      num(s.at, `${p}.at`);
      if (s.volume !== undefined) num(s.volume, `${p}.volume`, 0, 2);
    });
  }
  if (e.music !== undefined) {
    if (!isObj(e.music)) errors.push("music phải là object");
    else {
      str(e.music.file, "music.file");
      if (e.music.volume !== undefined) num(e.music.volume, "music.volume", 0, 2);
    }
  }
  if (errors.length) throw new Error(`edit.json không hợp lệ:\n- ${errors.join("\n- ")}`);
  return e as EditSpec;
}
