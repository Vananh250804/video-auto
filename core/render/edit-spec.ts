// edit.json: mô tả một lần render. Người dùng, preset hoặc Claude (edit-planner) viết file này.
// Đường dẫn tương đối tính từ thư mục gốc project. Schema: schemas/edit.schema.json.

export interface EditSpec {
  video: string;
  captions?: string; // captions.json từ vn-subtitle hoặc voiceover
  captionStyle?: string; // tên file trong presets/captions/, "none" = không in phụ đề
  originalVolume?: number;
  overlays?: {
    kind?: "text" | "price"; // price: giá cũ bị gạch → giá mới, % giảm tự tính
    text?: string; // bắt buộc với kind "text"; với "price" là nhãn nhỏ phía trên (ví dụ "CHỈ CÒN")
    was?: number; // price: giá gốc (đồng)
    now?: number; // price: giá bán (đồng), nhỏ hơn was
    start: number;
    end: number;
    position?: "top" | "center" | "bottom";
    color?: string;
    background?: string;
  }[];
  zooms?: { start: number; end: number; scale?: number }[]; // zoom giật vào khung hình (punch-in), scale mặc định 1.12
  sfx?: { file: string; at: number; volume?: number }[];
  music?: { file: string; volume?: number };
  maxShortSide?: number; // giới hạn độ phân giải, mặc định 1080
}

const POSITIONS = ["top", "center", "bottom"];
const KINDS = ["text", "price"];

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
      if (o.kind !== undefined && !KINDS.includes(o.kind)) errors.push(`${p}.kind phải là text hoặc price`);
      if (o.kind === "price") {
        num(o.was, `${p}.was`, 1);
        num(o.now, `${p}.now`, 1);
        if (typeof o.was === "number" && typeof o.now === "number" && o.now >= o.was) errors.push(`${p}.now phải nhỏ hơn was`);
        if (o.text !== undefined && typeof o.text !== "string") errors.push(`${p}.text phải là chuỗi`);
      } else str(o.text, `${p}.text`);
      num(o.start, `${p}.start`);
      num(o.end, `${p}.end`);
      if (typeof o.start === "number" && typeof o.end === "number" && o.end <= o.start) errors.push(`${p}.end phải lớn hơn start`);
      if (o.position !== undefined && !POSITIONS.includes(o.position)) errors.push(`${p}.position phải là top, center hoặc bottom`);
      if (o.color !== undefined) str(o.color, `${p}.color`);
      if (o.background !== undefined) str(o.background, `${p}.background`);
    });
  }
  if (e.zooms !== undefined) {
    if (!Array.isArray(e.zooms)) errors.push("zooms phải là mảng");
    else e.zooms.forEach((z: any, i: number) => {
      const p = `zooms[${i}]`;
      if (!isObj(z)) return errors.push(`${p} phải là object`);
      num(z.start, `${p}.start`);
      num(z.end, `${p}.end`);
      if (typeof z.start === "number" && typeof z.end === "number" && z.end <= z.start) errors.push(`${p}.end phải lớn hơn start`);
      if (z.scale !== undefined) num(z.scale, `${p}.scale`, 1, 2);
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
