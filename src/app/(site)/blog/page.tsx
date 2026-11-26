import Link from "next/link";
import { POSTS, readingMinutes } from "@/lib/blog";
import { CtaBand, PageIntro, Section } from "@/components/marketing/parts";

export const metadata = {
  title: "Holiday let operations blog",
  description:
    "Practical guides for holiday let and short let teams: changeover checklists, safety certificates, managing cleaners, linen, supplies and pay.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  // Carried on to each post, so a sign-up can be traced to where the reader
  // came from (see the register interest form).
  const { from } = await searchParams;
  const suffix = from ? `?from=${encodeURIComponent(from)}` : "";

  return (
    <>
      <PageIntro
        eyebrow="Blog"
        title="Guides for holiday let and short let teams"
        intro="Changeovers, cleaners, safety dates, linen and supplies. Written to be useful whether or not you ever use Evo Stays."
      />
      <Section>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}${suffix}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-teal-900/10 bg-surface p-6 transition-colors hover:border-teal-400"
              >
                <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">{post.topic}</p>
                <h2 className="text-lg font-semibold tracking-tight">{post.title}</h2>
                <p className="text-sm text-zinc-600">{post.description}</p>
                <p className="mt-auto text-xs text-zinc-500">{readingMinutes(post)} minute read</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  );
}
