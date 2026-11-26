// One post on the public blog. `body` is a small, safe subset of Markdown (see
// src/components/marketing/PostBody.tsx): ## and ### headings, paragraphs,
// "- " and "1. " lists, | tables, **bold** and [links](https://...).
//
// The same truthfulness rule as the rest of the site: no invented figures,
// customers or quotes. Anything about the law names its official source and
// tells the reader to check it, because it changes and differs by country.
export type Post = {
  slug: string;
  // What people see in the browser tab and in search results.
  title: string;
  description: string;
  // The question or phrase the post is written to answer.
  topic: string;
  published: string;
  image?: { src: string; alt: string };
  body: string;
  faq: { question: string; answer: string }[];
};
