import type { TemplateName } from "./types.ts";
import { layout as portrait } from "../templates/portrait-9x16/layout.ts";
import { layout as landscape } from "../templates/landscape-16x9/layout.ts";
import { layout as square } from "../templates/square-1x1/layout.ts";

export interface Layout {
  captionCenterY: number;
  overlayTopY: number;
  overlayCenterY: number;
  overlayBottomY: number;
  overlayScale: number;
  maxTextWidth: number;
}

export const LAYOUTS: Record<TemplateName, Layout> = {
  "portrait-9x16": portrait,
  "landscape-16x9": landscape,
  "square-1x1": square,
};
