import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — served by nginx in Docker
  output: "export",
  trailingSlash: true,
  // Allow <img> tags pointing to external domains (article thumbnails)
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
