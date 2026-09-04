"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { button } from "@/lib/ui";

type NavItem = { href: string; label: string };

const linkClass =
  "rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-950";

const signOutClass = button("secondary", "sm");

// Shared by both the admin and cleaner headers, so mobile navigation looks
// and behaves the same way everywhere in the app rather than each area
// inventing its own answer (admin had no wrap/scroll at all and ran off the
// edge of a phone screen with eight items; cleaner instead scrolled
// sideways, a different pattern from admin's for what's the same kind of
// bar). Below sm: a hamburger opens a stacked dropdown; sm: and up render a
// flat row.
//
// `items` sits left, right after the logo -- the day-to-day work areas.
// `rightItems` (optional) sits at the far right, before Sign out -- for a
// section like admin's Clients/Cleaners, which are more like profile
// directories than daily tools and read better grouped off on their own.
// Cleaner has no such split and just omits the prop.
export function NavMenu({
  items,
  rightItems = [],
  logoutAction,
}: {
  items: NavItem[];
  rightItems?: NavItem[];
  logoutAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Closes the dropdown after following a link -- it doesn't unmount across
  // pages in the same section (this layout persists), so without this it
  // would stay open over whatever page just loaded. Done during render
  // (React's pattern for "reset state when a value changes") rather than in
  // an effect, which would cost an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <div className="hidden items-center gap-1 sm:flex">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto hidden items-center gap-3 sm:flex">
        {rightItems.length > 0 && (
          <div className="flex items-center gap-1">
            {rightItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <form action={logoutAction}>
          <button type="submit" className={signOutClass}>
            Sign out
          </button>
        </form>
      </div>

      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-black/5 sm:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
          {open ? (
            <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-black/5 bg-background p-3 shadow-sm sm:hidden">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
          {rightItems.length > 0 && (
            <>
              <div className="my-1 border-t border-black/5" />
              {rightItems.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ))}
            </>
          )}
          <form action={logoutAction} className="mt-1">
            <button type="submit" className={`${signOutClass} w-full`}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </>
  );
}
