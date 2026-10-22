import type { MetadataRoute } from "next";

// What lets Evo Stays be added to a phone's home screen and open like an app,
// full screen and without the browser's address bar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Evo Stays",
    short_name: "Evo Stays",
    description: "Cleaning and stock management for short-let properties.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
