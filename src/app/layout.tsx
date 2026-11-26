import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/NavigationProgress";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBanner } from "@/components/OfflineBanner";

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
  description: "Cleans, access codes, safety dates and linen for short-let teams, in one place.",
  // Shared links need the picture's full address (src/app/opengraph-image.png),
  // which is only known once APP_URL is set.
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  // iPhone: what the home screen icon looks like, and opening full screen
  // from it. (The manifest, for Android and desktop, is src/app/manifest.ts.)
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Evo Stays", statusBarStyle: "default" },
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
  // Colours the phone's status bar to match the app's page background.
  themeColor: "#fafafa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {/* Suspense because it reads the address, which fixed pages do not
            know until they reach the browser. */}
        <Suspense>
          <NavigationProgress />
        </Suspense>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
