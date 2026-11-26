import Link from "next/link";
import { ARTICLES } from "@/lib/articles";
import { CtaBand, PageIntro, Section } from "@/components/marketing/parts";

export const metadata = {
  title: "Articles",
  description: "Practical notes for short-let teams that run their own cleaning: turnovers, checklists, stock and safety dates.",
};

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  // Carried on to each article, so a sign-up can be traced to where the reader
  // came from (see the register interest form).
  const { from } = await searchParams;
  const suffix = from ? `?from=${encodeURIComponent(from)}` : "";

  return (
    <>
      <PageIntro
        eyebrow="Articles"
        title="Notes for teams that run their own cleaning"
        intro="Short, practical pieces on turnovers, checklists, stock and safety dates. Useful whether or not you ever use Evo Stays."
      />
      <Section>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}${suffix}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-teal-900/10 bg-surface p-6 transition-colors hover:border-teal-400"
              >
                <h2 className="text-lg font-semibold tracking-tight">{a.title}</h2>
                <p className="text-sm text-zinc-600">{a.summary}</p>
                <p className="mt-auto text-xs font-medium text-teal-700">{a.minutes} minute read</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  );
}
