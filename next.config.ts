import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone -- a server.js plus only the node_modules actually
  // reached by the build. Keeps the self-hosted Docker image small; see the
  // Dockerfile, which copies public/ and .next/static in alongside it.
  output: "standalone",
  // Baseline browser hardening for a site reachable from the public
  // internet. Strict-Transport-Security only takes effect over HTTPS, which
  // is how the public URL is served (see docs/public-access.md), so plain
  // http://localhost in development is unaffected.
  async headers() {
    return [
      {
        // A phone checks this file for a new version each time. A cached copy
        // would leave old behaviour on devices indefinitely.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          // Nothing should embed this app in a frame. Stops clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Photo uploads go through ordinary file inputs, which open the
          // phone's camera without needing the camera API.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Default (1mb) is too small for property photo gallery uploads.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
