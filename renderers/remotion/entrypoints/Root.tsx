import React from "react";
import { Composition } from "remotion";
import { Edit } from "../shared/Edit.tsx";
import type { EditProps } from "../shared/types.ts";

// Props mẫu để xem trong Remotion Studio (npm run studio). Khi render thật, core/render truyền props vào.
const sample: EditProps = {
  videoSrc: "https://remotion.media/video.mp4",
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 150,
  template: "portrait-9x16",
  originalVolume: 1,
  captions: [
    { start: 0, end: 2, text: "Chào các bạn nhé", words: [
      { text: "Chào", start: 0, end: 0.4 }, { text: "các", start: 0.4, end: 0.7 }, { text: "bạn", start: 0.7, end: 1.1 }, { text: "nhé", start: 1.1, end: 1.6 },
    ] },
    { start: 2, end: 5, text: "Giảm giá cực sốc hôm nay", words: [] },
  ],
  captionStyle: {
    fontFamily: "Be Vietnam Pro", fontWeight: 800, fontScale: 0.075, color: "#FFFFFF", activeColor: "#FFE14D",
    strokeColor: "#000000", strokeWidth: 0.14, background: null, uppercase: true, popIn: true,
  },
  overlays: [
    { kind: "text", text: "GIẢM 50%", start: 0, end: 1.8, position: "top", color: "#FFFFFF", background: "#FF2D55" },
    { kind: "price", text: "CHỈ CÒN", was: 299000, now: 199000, start: 2, end: 4.8, position: "center", color: "#FFFFFF", background: "#FF2D55" },
  ],
  zooms: [{ start: 1.2, end: 2.6, scale: 1.12 }],
  sfx: [],
  music: null,
};

export const Root: React.FC = () => (
  <Composition
    id="Edit"
    component={Edit}
    defaultProps={sample}
    width={sample.width}
    height={sample.height}
    fps={sample.fps}
    durationInFrames={sample.durationInFrames}
    calculateMetadata={({ props }) => ({
      width: props.width,
      height: props.height,
      fps: props.fps,
      durationInFrames: props.durationInFrames,
    })}
  />
);
