import Link from "next/link";
import { LegalPage } from "@/components/marketing/parts";

export const metadata = {
  title: "Terms of use",
  description: "The terms for using the Evo Stays website.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="23 October 2026"
      intro="These terms cover your use of the Evo Stays website. The service itself, for companies that sign up to use it, is covered by a separate agreement."
    >
      <h2>This website</h2>
      <p>
        The website describes Evo Stays and lets you get in touch. We take care to keep what it says accurate, but Evo
        Stays is still being developed, so features, descriptions and availability can change without notice. Nothing on the
        website is an offer or a promise that a particular feature will be available to you.
      </p>

      <h2>The service</h2>
      <p>
        Evo Stays is not yet open to everyone. A company that starts using it agrees the terms of that use with us when it
        is set up, including price and how its information is handled. Where that agreement and these terms differ, the
        agreement applies to the service.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>Keep your sign-in details private, and tell us if you think someone else has them.</li>
        <li>A company is responsible for the people it gives logins to, and for what they put into its account.</li>
        <li>Only use an account you have been given, and only for the work it is meant for.</li>
      </ul>

      <h2>Using the website and service properly</h2>
      <p>Please do not:</p>
      <ul>
        <li>try to get into accounts, data or parts of the system that are not yours,</li>
        <li>interfere with the service or put an unreasonable load on it, or</li>
        <li>copy or collect content from it automatically, other than the ordinary way a search engine does.</li>
      </ul>

      <h2>What you send us</h2>
      <p>
        When you send a message or register interest, you are giving us information so we can reply and follow up. Please
        do not include anything you would not want us to read, such as passwords or payment details. How we handle your
        information is explained in our <Link href="/privacy">privacy notice</Link>.
      </p>

      <h2>Our content</h2>
      <p>
        The Evo Stays name, logo, website, software and the way they look and work belong to us. You may view the website
        and share its address, but not copy it or use our name or logo to suggest a connection that does not exist.
      </p>

      <h2>Our responsibility to you</h2>
      <p>
        We provide the website as it is and do not promise it will always be available or free of errors. Nothing in these
        terms limits responsibility that the law does not allow us to limit, such as for death or personal injury caused by
        negligence, or for fraud. Otherwise, we are not responsible for losses that were not a foreseeable result of our
        failing to take reasonable care.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms, and will change the date at the top when we do. If you keep using the website after a
        change, you are accepting the updated terms.
      </p>

      <h2>Questions</h2>
      <p>
        If anything here is unclear, <Link href="/contact">get in touch</Link>.
      </p>
    </LegalPage>
  );
}
