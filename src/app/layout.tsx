import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Evo Stays", template: "%s · Evo Stays" },
  description: "Cleaning and stock management for short-let properties.",
};

// No explicit viewport meta before this -- Next's implicit default omits
// `viewport-fit=cover`, so `env(safe-area-inset-bottom)` (used in
// admin/cleaner layout.tsx to keep the last button clear of a phone's
// gesture bar / the browser's own bottom toolbar) always resolved to 0.
// Deliberately NOT disabling pinch-zoom (no maximumScale/userScalable) --
// that's an accessibility regression and isn't what was actually causing
// the reported "page zooms in": Safari/Chrome auto-zoom focusing any input
// under 16px, which src/lib/ui.ts's inputCompact fixes at the source.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
