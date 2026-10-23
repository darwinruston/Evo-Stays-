import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { PageIntro, Section } from "@/components/marketing/parts";
import { CONTACT_TOPICS, publicContactEmail } from "@/lib/site";
import { card } from "@/lib/ui";

export const metadata = {
  title: "Contact",
  description: "Get in touch about Evo Stays: ask a question, arrange a demo, or talk about working together.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const defaultTopic = CONTACT_TOPICS.some((t) => t.value === topic) ? topic : "demo";
  const email = publicContactEmail();

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Talk to us"
        intro="Ask a question, arrange a demo, or tell us how you run your operation. A person reads every message."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className={card("p-6 sm:p-8")}>
            <ContactForm defaultTopic={defaultTopic} />
          </div>

          <aside className="flex flex-col gap-6 text-sm text-zinc-600">
            <div>
              <h2 className="font-semibold text-zinc-900">What happens next</h2>
              <p className="mt-2">
                We reply to the email address you give us. For a demo, we will first ask how you run things today so
                we can show you what is relevant.
              </p>
            </div>
            {email && (
              <div>
                <h2 className="font-semibold text-zinc-900">Prefer email?</h2>
                <p className="mt-2">
                  <a href={`mailto:${email}`} className="underline underline-offset-2 hover:text-zinc-900">
                    {email}
                  </a>
                </p>
              </div>
            )}
            <div>
              <h2 className="font-semibold text-zinc-900">Just want to be on the list?</h2>
              <p className="mt-2">
                <Link href="/signup" className="underline underline-offset-2 hover:text-zinc-900">
                  Register your interest
                </Link>{" "}
                and we will be in touch when we can set you up.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900">Already a customer?</h2>
              <p className="mt-2">
                <Link href="/login" className="underline underline-offset-2 hover:text-zinc-900">
                  Sign in
                </Link>{" "}
                to your account.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
