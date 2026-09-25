"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { button } from "@/lib/ui";
import { BellIcon } from "@/components/Icons";

// `count` is an optional badge after the label (unread notifications, open
// issues). Zero (or omitted) shows no badge at all rather than a "0", which
// would just be noise on every page. `countLabel` is what a screen reader
// hears after the number -- "unread" for one badge, "open" for another.
// `icon` swaps the label for a glyph in the flat row (the label stays as the
// accessible name, and shows as text again in the hamburger dropdown, where
// there's room and an unlabelled icon would be less clear).
type NavItem = { href: string; label: string; count?: number; countLabel?: string; icon?: "bell" };

const linkClass =
  "rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-950";

const signOutClass = button("secondary", "sm");

function CountBadge({ item, className }: { item: NavItem; className: string }) {
  const count = item.count ?? 0;
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white ${className}`}
    >
      <span className="sr-only">(</span>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {item.countLabel ?? "new"})</span>
    </span>
  );
}

// `onNavigate` lets the hamburger dropdown close the moment a link is tapped.
// Closing only when the pathname changes (below) isn't enough: tapping the
// page you're already on changes nothing, so the menu just sat there and the
// tap looked ignored.
function NavLink({
  item,
  iconOnly = false,
  onNavigate,
}: {
  item: NavItem;
  iconOnly?: boolean;
  onNavigate?: () => void;
}) {
  if (item.icon && iconOnly) {
    return (
      <Link
        href={item.href}
        aria-label={item.label}
        title={item.label}
        onClick={onNavigate}
        className={`${linkClass} relative inline-flex items-center`}
      >
        <BellIcon className="h-5 w-5" />
        <CountBadge item={item} className="absolute -right-0.5 -top-0.5 min-w-4 px-1 text-[10px] leading-4" />
      </Link>
    );
  }
  return (
    <Link href={item.href} onClick={onNavigate} className={`${linkClass} inline-flex items-center gap-1.5`}>
      {item.icon && <BellIcon className="h-4 w-4" />}
      {item.label}
      <CountBadge item={item} className="" />
    </Link>
  );
}

// Where the bar switches from hamburger to a flat row. Spelled out as whole
// class strings (not built from the breakpoint name) so Tailwind's scanner
// sees every one of them. Admin has too many items to fit a tablet-width
// row of ten labelled items, so it holds the hamburger up to lg (with
// Notifications as an icon it fits from 1024px); the cleaner bar fits from sm.
const BREAKPOINT_CLASSES = {
  sm: { row: "sm:flex", right: "sm:flex", mobileOnly: "sm:hidden" },
  lg: { row: "lg:flex", right: "lg:flex", mobileOnly: "lg:hidden" },
} as const;

// Shared by both the admin and cleaner headers, so mobile navigation looks
// and behaves the same way everywhere in the app rather than each area
// inventing its own answer (admin had no wrap/scroll at all and ran off the
// edge of a phone screen with eight items; cleaner instead scrolled
// sideways, a different pattern from admin's for what's the same kind of
// bar). Below the breakpoint (sm by default, lg for admin -- see
// BREAKPOINT_CLASSES): a hamburger opens a stacked dropdown; at and above it
// render a flat row.
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
  breakpoint = "sm",
}: {
  items: NavItem[];
  rightItems?: NavItem[];
  logoutAction: (formData: FormData) => void;
  breakpoint?: keyof typeof BREAKPOINT_CLASSES;
}) {
  const bp = BREAKPOINT_CLASSES[breakpoint];
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
      <div className={`hidden items-center gap-1 ${bp.row}`}>
        {items.map((item) => (
          <NavLink key={item.href} item={item} iconOnly />
        ))}
      </div>

      <div className={`ml-auto hidden items-center gap-3 ${bp.right}`}>
        {rightItems.length > 0 && (
          <div className="flex items-center gap-1">
            {rightItems.map((item) => (
              <NavLink key={item.href} item={item} iconOnly />
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
        className={`ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-black/5 ${bp.mobileOnly}`}
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
        <div
          className={`absolute inset-x-0 top-full flex flex-col gap-1 border-b border-black/5 bg-background p-3 shadow-sm ${bp.mobileOnly}`}
        >
          {items.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
          ))}
          {rightItems.length > 0 && (
            <>
              <div className="my-1 border-t border-black/5" />
              {rightItems.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
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
