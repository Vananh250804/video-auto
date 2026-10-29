import type { Layout } from "../../shared/layout.ts";

// Vị trí tính theo tỉ lệ chiều cao khung hình (0 = mép trên, 1 = mép dưới).
// Vùng an toàn TikTok/Reels 1080x1920: chừa trên ~120px, dưới ~320px (tên, nhạc, nút), phải ~120px (thanh like/share).
export const layout: Layout = {
  captionCenterY: 0.70,
  overlayTopY: 0.17,
  overlayCenterY: 0.45,
  overlayBottomY: 0.79,
  overlayScale: 0.072,
  maxTextWidth: 0.78,
};
