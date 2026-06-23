import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Screenshots are downscaled client-side (~200-500KB), but allow headroom.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
