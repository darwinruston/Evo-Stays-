import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone -- a server.js plus only the node_modules actually
  // reached by the build. Keeps the self-hosted Docker image small; see the
  // Dockerfile, which copies public/ and .next/static in alongside it.
  output: "standalone",
  experimental: {
    serverActions: {
      // Default (1mb) is too small for property photo gallery uploads.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
