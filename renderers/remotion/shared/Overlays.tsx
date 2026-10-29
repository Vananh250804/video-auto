import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderOverlay } from "./types.ts";
import type { Layout } from "./layout.ts";
import { BE_VIETNAM_PRO } from "./fonts.ts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 199000 → "199.000đ". Tự định dạng để kết quả giống nhau trên mọi máy render.
export const formatVnd = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;

// Giá cũ bị gạch trước, rồi giá mới nhảy số từ giá cũ xuống và nảy nhẹ khi dừng; % giảm tính từ was và now.
const PriceDrop: React.FC<{ overlay: RenderOverlay; fontSize: number }> = ({ overlay, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const was = overlay.was ?? 0;
  const now = overlay.now ?? 0;
  const strike = interpolate(frame, [4, 14], [0, 100], clamp);
  const count = spring({ frame: frame - 12, fps, config: { damping: 18, mass: 0.6 } });
  const settled = count > 0.99;
  // Trong lúc chạy số làm tròn nghìn cho gọn mắt; dừng lại thì hiện đúng giá
  const shown = settled ? now : Math.round((was + (now - was) * count) / 1000) * 1000;
  const land = interpolate(count, [0.85, 1], [1.12, 1], clamp);
  const badge = spring({ frame: frame - 22, fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
  const pct = Math.round((1 - now / was) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
      {overlay.text ? <div style={{ fontSize: fontSize * 0.5, opacity: 0.9 }}>{overlay.text}</div> : null}
      <div style={{ position: "relative", fontSize: fontSize * 0.6, opacity: 0.75 }}>
        {formatVnd(was)}
        <div style={{ position: "absolute", left: "-4%", top: "52%", height: Math.max(3, fontSize * 0.07), width: `${strike * 1.08}%`, background: "#FFE14D", borderRadius: 4 }} />
      </div>
      <div style={{ position: "relative", fontSize: fontSize * 1.25, lineHeight: 1.05, transform: `scale(${land})` }}>
        {formatVnd(shown)}
        {pct > 0 ? (
          <div
            style={{
              position: "absolute",
              right: -fontSize * 0.9,
              top: -fontSize * 0.45,
              transform: `scale(${badge}) rotate(12deg)`,
              fontSize: fontSize * 0.45,
              padding: `${fontSize * 0.08}px ${fontSize * 0.2}px`,
              borderRadius: fontSize * 0.2,
              background: "#FFE14D",
              color: "#111111",
            }}
          >
            -{pct}%
          </div>
        ) : null}
      </div>
    </div>
  );
};

const OverlayBox: React.FC<{ overlay: RenderOverlay; layout: Layout; durationInFrames: number }> = ({ overlay, layout, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const fontSize = Math.min(width, height) * layout.overlayScale;
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 180, mass: 0.7 } });
  const fadeOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], clamp);
  const y = { top: layout.overlayTopY, center: layout.overlayCenterY, bottom: layout.overlayBottomY }[overlay.position];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${y * 100}%`,
          transform: `translate(-50%, -50%) scale(${pop}) rotate(${(1 - pop) * -6}deg)`,
          opacity: fadeOut,
          width: "max-content",
          maxWidth: `${layout.maxTextWidth * 100}%`,
          padding: `${fontSize * 0.2}px ${fontSize * 0.45}px`,
          borderRadius: fontSize * 0.25,
          background: overlay.background,
          color: overlay.color,
          fontFamily: `"${BE_VIETNAM_PRO}", sans-serif`,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.15,
          textAlign: "center",
          boxShadow: `0 ${fontSize * 0.08}px ${fontSize * 0.3}px rgba(0,0,0,0.35)`,
        }}
      >
        {overlay.kind === "price" ? <PriceDrop overlay={overlay} fontSize={fontSize} /> : overlay.text}
      </div>
    </AbsoluteFill>
  );
};

export const Overlays: React.FC<{ overlays: RenderOverlay[]; layout: Layout }> = ({ overlays, layout }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {overlays.map((o, i) => {
        const from = Math.round(o.start * fps);
        const durationInFrames = Math.max(1, Math.round((o.end - o.start) * fps));
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFrames} layout="none">
            <OverlayBox overlay={o} layout={layout} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </>
  );
};
