"use client";

import { DESIGN_WIDTH, usePageScale, useWidthScale } from "./use-page-scale";

/**
 * The artboards are fixed 1440px canvases. This scales one to fit the
 * window and reserves the scaled height so sections still stack flush.
 *
 * `fillWidth` stretches the section to the viewport edges (used by the hero).
 */
export function Scaled({
  height,
  fillWidth = false,
  children,
}: {
  height: number;
  fillWidth?: boolean;
  children: React.ReactNode;
}) {
  const pageScale = usePageScale();
  const widthScale = useWidthScale();
  const scale = fillWidth ? widthScale : pageScale;

  return (
    <div
      style={{
        width: "100%",
        height: height * scale,
        display: "flex",
        justifyContent: fillWidth ? "flex-start" : "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: DESIGN_WIDTH,
          height,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: fillWidth ? "top left" : "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
