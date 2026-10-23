import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

// Wraps every public page (home, features, about, contact, FAQ, legal) in the
// same header and footer. The signed-in areas (/admin, /cleaner, /linen, /owner)
// have their own layouts and never come through here.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
