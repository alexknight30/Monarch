import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js dev badge in the bottom-left corner.
  devIndicators: false,
  // This app is nested inside the Monarch repo, which has its own lockfile.
  // Pin the workspace root so Turbopack doesn't infer the parent directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
