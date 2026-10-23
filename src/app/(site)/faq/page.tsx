import { CtaBand, FaqList, PageIntro, Section } from "@/components/marketing/parts";
import { FAQ } from "@/lib/site";

export const metadata = {
  title: "FAQ",
  description: "Answers to the questions people ask about Evo Stays: who it is for, cost, phones, booking systems, linen, access and security.",
};

// The FAQ is also published as structured data, which lets search engines show
// the questions directly. It is generated from the same list as the page, so
// the two cannot disagree.
export default function FaqPage() {
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <PageIntro
        eyebrow="FAQ"
        title="Questions and answers"
        intro="Straight answers about what Evo Stays does, and what it does not."
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          <FaqList items={FAQ} />
        </div>
      </Section>
      <CtaBand title="Still have a question?" body="Send us a message and we will answer it, or arrange a demo." />
    </>
  );
}
