import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS, postBySlug, readingMinutes } from "@/lib/blog";
import { PostBody } from "@/components/marketing/PostBody";
import { cta, PageIntro, ProductShot, PhoneShot, Section } from "@/components/marketing/parts";
import { formatDate } from "@/lib/schedule";

// The site's public address, when it is set: search engines want full
// addresses in the page's structured data.
const BASE = process.env.APP_URL?.replace(/\/+$/, "") ?? "";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return { title: "Blog" };
  return {
    title: post.title,
    description: post.description,
    ...(BASE ? { metadataBase: new URL(BASE) } : {}),
    // One address per post, whatever ?from= tag a link carried.
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      ...(post.image && BASE ? { images: [{ url: post.image.src, alt: post.image.alt }] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const { from } = await searchParams;
  const source = encodeURIComponent(from || `blog-${post.slug}`);
  const others = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const phone = post.image?.src.match(/cleaner|linen/);

  // Told to search engines in the form they read: the article, and its
  // questions and answers.
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.published,
      author: { "@type": "Organization", name: "Evo Stays" },
      publisher: { "@type": "Organization", name: "Evo Stays" },
      ...(BASE ? { mainEntityOfPage: `${BASE}/blog/${post.slug}` } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // Our own fixed text, with "<" escaped so it can never close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
      />
      <PageIntro
        eyebrow={`${readingMinutes(post)} minute read · ${formatDate(new Date(`${post.published}T12:00:00`))}`}
        title={post.title}
        intro={post.description}
      />
      <Section className="!pt-4">
        <article className="mx-auto max-w-3xl text-zinc-700">
          {post.image &&
            (phone ? (
              <PhoneShot src={post.image.src} alt={post.image.alt} className="mb-8 !max-w-[16rem]" />
            ) : (
              <ProductShot src={post.image.src} alt={post.image.alt} className="mb-8" />
            ))}
          <PostBody source={post.body} />

          <h2 className="mt-12 text-2xl font-semibold tracking-tight text-zinc-900">Common questions</h2>
          {post.faq.map((f) => (
            <div key={f.question} className="mt-5">
              <h3 className="font-semibold text-zinc-900">{f.question}</h3>
              <p className="mt-1.5 leading-relaxed">{f.answer}</p>
            </div>
          ))}

          <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl bg-teal-50 p-6">
            <h2 className="text-lg font-semibold text-zinc-900">Run your own cleaners? Try Evo Stays</h2>
            <p className="text-sm">
              Cleans, access codes, safety dates, linen and supplies in one place. We are setting up early companies
              one at a time.
            </p>
            <Link href={`/signup?from=${source}`} className={cta("primary", "sm")}>
              Register interest
            </Link>
          </div>

          <h2 className="mt-12 text-sm font-semibold tracking-wide text-zinc-500 uppercase">More guides</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="font-medium text-teal-700 underline underline-offset-4">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </Section>
    </>
  );
}
