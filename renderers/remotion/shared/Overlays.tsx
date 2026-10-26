import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderOverlay } from "./types.ts";
import type { Layout } from "./layout.ts";
import { BE_VIETNAM_PRO } from "./fonts.ts";

const OverlayText: React.FC<{ overlay: RenderOverlay; layout: Layout; durationInFrames: number }> = ({ overlay, layout, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const fontSize = Math.min(width, height) * layout.overlayScale;
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 180, mass: 0.7 } });
  const fadeOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
        {overlay.text}
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
            <OverlayText overlay={o} layout={layout} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </>
  );
};
