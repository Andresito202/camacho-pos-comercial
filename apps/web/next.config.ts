import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@camacho-pos/ui"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
