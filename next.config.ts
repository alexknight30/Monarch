import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MONARCH_DIST_DIR || ".next",
  serverExternalPackages: ["pdf-parse", "mammoth"],
  outputFileTracingIncludes: {
    "/api/pdf-worker": ["./node_modules/pdfjs-dist/build/pdf.worker.min.mjs"],
    "/api/whiteboard-assets/*": ["./node_modules/@excalidraw/excalidraw/dist/prod/fonts/**/*.woff2"],
  },
  // The dev indicator sits bottom-left, right on top of the school logo in the rail.
  devIndicators: false,
};

export default nextConfig;
