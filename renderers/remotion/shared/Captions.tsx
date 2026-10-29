import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionStyle, RenderCaption } from "./types.ts";
import type { Layout } from "./layout.ts";
import { resolveFont } from "./fonts.ts";

export const Captions: React.FC<{ captions: RenderCaption[]; style: CaptionStyle; layout: Layout }> = ({ captions, style, layout }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const caption = captions.find((c) => t >= c.start && t < c.end);
  if (!caption) return null;

  const fontSize = Math.min(width, height) * style.fontScale;
  const pop = style.popIn
    ? spring({ frame: frame - Math.round(caption.start * fps), fps, config: { damping: 14, stiffness: 220, mass: 0.6 } })
    : 1;
  const scale = 0.85 + 0.15 * pop;
  const words = caption.words.length > 0 ? caption.words : [{ text: caption.text, start: caption.start, end: caption.end }];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${layout.captionCenterY * 100}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: `${layout.maxTextWidth * 100}%`,
          textAlign: "center",
          fontFamily: resolveFont(style.fontFamily),
          fontWeight: style.fontWeight,
          fontSize,
          lineHeight: 1.2,
          textTransform: style.uppercase ? "uppercase" : "none",
        }}
      >
        <span
          style={{
            background: style.background ?? undefined,
            padding: style.background ? `${fontSize * 0.12}px ${fontSize * 0.3}px` : undefined,
            borderRadius: fontSize * 0.2,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {words.map((w, i) => (
            <span
              key={i}
              style={{
                display: style.wordPop ? "inline-block" : undefined,
                marginRight: style.wordPop && i < words.length - 1 ? "0.38em" : undefined,
                transform: style.wordPop ? `scale(${wordBump(frame - Math.round(w.start * fps), fps)})` : undefined,
                color: t >= w.start ? style.activeColor : style.color,
                WebkitTextStroke: style.strokeWidth > 0 ? `${fontSize * style.strokeWidth}px ${style.strokeColor}` : undefined,
                paintOrder: "stroke fill",
              }}
            >
              {w.text}
              {i < words.length - 1 && !style.wordPop ? " " : ""}
            </span>
          ))}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// Từ vừa được đọc: to lên 1.15 rồi về 1 trong khoảng 8 khung hình
function wordBump(f: number, fps: number): number {
  if (f < 0 || f > 10) return 1;
  const p = spring({ frame: f, fps, config: { damping: 12, stiffness: 260, mass: 0.5 } });
  return interpolate(p, [0, 0.5, 1], [1, 1.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}
