import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default (1mb) is too small for property photo gallery uploads.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
