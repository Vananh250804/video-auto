import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderZoom } from "./types.ts";

// Zoom giật (punch-in): bật nhanh vào scale ở start, giữ, rồi cắt về 1 ở end. Tạo nhịp cho video one-shot mà không cần cảnh mới.
export const Zoom: React.FC<{ zooms: RenderZoom[]; children: React.ReactNode }> = ({ zooms, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const z = zooms.find((z) => t >= z.start && t < z.end);
  const snap = z ? spring({ frame: frame - Math.round(z.start * fps), fps, config: { damping: 16, stiffness: 320, mass: 0.5 } }) : 0;
  const scale = z ? 1 + (z.scale - 1) * snap : 1;
  return (
    // Tâm zoom hơi cao hơn giữa khung, nơi thường có mặt người hoặc sản phẩm
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 42%" }}>{children}</AbsoluteFill>
  );
};
