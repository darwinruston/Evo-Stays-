import type { MetadataRoute } from "next";

// Search engines may read the public website, and are kept out of the signed-in
// areas and the API.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/cleaner", "/linen", "/owner", "/api", "/onboarding", "/notifications"] }],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
