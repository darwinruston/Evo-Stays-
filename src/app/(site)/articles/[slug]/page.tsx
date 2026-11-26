import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, articleBySlug } from "@/lib/articles";
import { cta, PageIntro, Section } from "@/components/marketing/parts";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const article = articleBySlug((await params).slug);
  return article ? { title: article.title, description: article.summary } : { title: "Article" };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const { from } = await searchParams;
  // Where a sign-up from this page came from: the link they arrived on if it
  // said, otherwise this article.
  const source = encodeURIComponent(from || `article-${article.slug}`);
  const others = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <PageIntro eyebrow={`${article.minutes} minute read`} title={article.title} intro={article.summary} />
      <Section className="!pt-6">
        <article className="mx-auto max-w-3xl text-zinc-700">
          {article.body.map((block, i) =>
            "heading" in block ? (
              <h2 key={i} className="mt-8 text-xl font-semibold tracking-tight text-zinc-900">
                {block.heading}
              </h2>
            ) : "list" in block ? (
              <ul key={i} className="mt-3 list-disc pl-5">
                {block.list.map((item) => (
                  <li key={item} className="mt-1.5">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p key={i} className="mt-4 leading-relaxed">
                {block.text}
              </p>
            ),
          )}

          <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl bg-teal-50 p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Want to try Evo Stays?</h2>
            <p className="text-sm">
              We are setting up early companies one at a time. Leave your details and we will get in touch to show you.
            </p>
            <Link href={`/signup?from=${source}`} className={cta("primary", "sm")}>
              Register interest
            </Link>
          </div>

          <h2 className="mt-12 text-sm font-semibold tracking-wide text-zinc-500 uppercase">More to read</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="font-medium text-teal-700 underline underline-offset-4">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </Section>
    </>
  );
}
