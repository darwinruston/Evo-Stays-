import type { MetadataRoute } from "next";

const PAGES = ["", "/features", "/faq", "/about", "/contact", "/signup", "/privacy", "/terms", "/cookies"];

// The public pages, for search engines. It needs the site's own address
// (APP_URL), so until that is set there is nothing useful to list.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL?.replace(/\/+$/, "");
  if (!base) return [];
  return PAGES.map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.6 }));
}
