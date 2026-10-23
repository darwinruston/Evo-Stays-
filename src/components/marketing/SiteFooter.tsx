import Link from "next/link";
import { EvoTick } from "@/components/EvoTick";
import { FOOTER_GROUPS, publicContactEmail } from "@/lib/site";

export function SiteFooter() {
  const email = publicContactEmail();

  return (
    <footer className="border-t border-black/5 bg-surface px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex max-w-xs flex-col items-start gap-3">
          <EvoTick className="h-7 w-auto" />
          <p className="text-sm text-zinc-600">
            The operations hub for short-let teams that run their own cleaners: scheduling, stock, laundry and
            hours in one place.
          </p>
          {email && (
            <a href={`mailto:${email}`} className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900">
              {email}
            </a>
          )}
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">{group.title}</h2>
            <ul className="flex flex-col gap-2 text-sm text-zinc-600">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-zinc-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-black/5 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Evo Stays. All rights reserved.</p>
        <p>
          Already a customer?{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-zinc-900">
            Sign in
          </Link>
        </p>
      </div>
    </footer>
  );
}
