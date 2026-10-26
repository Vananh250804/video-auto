// Props đã sẵn sàng để render: đường dẫn đã đổi thành URL, preset đã nạp.

export interface RenderWord {
  text: string;
  start: number;
  end: number;
}

export interface RenderCaption {
  start: number;
  end: number;
  text: string;
  words: RenderWord[];
}

export interface CaptionStyle {
  fontFamily: string;
  fontWeight: number;
  fontScale: number; // cỡ chữ = cạnh ngắn của video x fontScale
  color: string;
  activeColor: string; // màu từ đang được đọc
  strokeColor: string;
  strokeWidth: number; // tính theo cỡ chữ, ví dụ 0.12
  background: string | null; // null = không có nền
  uppercase: boolean;
  popIn: boolean;
}

export type OverlayPosition = "top" | "center" | "bottom";

export interface RenderOverlay {
  text: string;
  start: number;
  end: number;
  position: OverlayPosition;
  color: string;
  background: string;
}

export interface RenderSound {
  src: string;
  at: number;
  volume: number;
}

export type TemplateName = "portrait-9x16" | "landscape-16x9" | "square-1x1";

export interface EditProps {
  [key: string]: unknown;
  videoSrc: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  template: TemplateName;
  originalVolume: number;
  captions: RenderCaption[];
  captionStyle: CaptionStyle | null;
  overlays: RenderOverlay[];
  sfx: RenderSound[];
  music: { src: string; volume: number } | null;
}
