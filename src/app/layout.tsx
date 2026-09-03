import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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

// Sets the .dark class before the page paints, so there's no flash of the
// wrong theme while React hydrates. next/script's beforeInteractive
// strategy is built for exactly this -- it injects and runs the script
// ahead of hydration, the correct way to do this in App Router (a raw
// <script> tag rendered as JSX both logs "scripts don't execute during
// client rendering" and, worse, causes a real hydration mismatch on
// <html>'s className once the script has already mutated it). ThemeToggle
// only ever reads this class back, never sets the initial one itself.
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme-init script (necessarily) sets this before React
      // hydrates, so the server-rendered class list and the real DOM
      // legitimately differ on this one element -- this tells React that's
      // expected instead of trying to "fix" it.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
