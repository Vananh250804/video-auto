import React from "react";
import { AbsoluteFill, Html5Audio, OffthreadVideo, Sequence, useVideoConfig } from "remotion";
import type { EditProps } from "./types.ts";
import { LAYOUTS } from "./layout.ts";
import { Captions } from "./Captions.tsx";
import { Overlays } from "./Overlays.tsx";
import { Zoom } from "./Zoom.tsx";

export const Edit: React.FC<EditProps> = (props) => {
  const { fps } = useVideoConfig();
  const layout = LAYOUTS[props.template];
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Zoom zooms={props.zooms ?? []}>
        <OffthreadVideo src={props.videoSrc} volume={props.originalVolume} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Zoom>
      {props.captionStyle && props.captions.length > 0 ? <Captions captions={props.captions} style={props.captionStyle} layout={layout} /> : null}
      <Overlays overlays={props.overlays} layout={layout} />
      {props.sfx.map((s, i) => (
        <Sequence key={i} from={Math.round(s.at * fps)} layout="none">
          <Html5Audio src={s.src} volume={s.volume} />
        </Sequence>
      ))}
      {props.music ? <Html5Audio src={props.music.src} volume={props.music.volume} loop /> : null}
    </AbsoluteFill>
  );
};
