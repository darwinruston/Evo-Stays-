import Link from "next/link";
import { LegalPage } from "@/components/marketing/parts";
import { publicContactEmail } from "@/lib/site";

export const metadata = {
  title: "Privacy notice",
  description: "What Evo Stays collects, why, who it is shared with, how long it is kept, and your rights.",
};

export default function PrivacyPage() {
  const email = publicContactEmail();

  return (
    <LegalPage
      title="Privacy notice"
      updated="23 October 2026"
      intro="This explains what personal information Evo Stays collects, why, who it is shared with and what your rights are. We have tried to keep it plain."
    >
      <h2>Who we are</h2>
      <p>
        Evo Stays is a service that helps short-let teams run their cleaning, stock, laundry and hours. In this notice,
        &quot;we&quot; means Evo Stays. You can reach us through our{" "}
        <Link href="/contact">contact page</Link>
        {email ? (
          <>
            {" "}
            or at <a href={`mailto:${email}`}>{email}</a>
          </>
        ) : null}
        .
      </p>

      <h2>Two different situations</h2>
      <p>
        <strong>If you visit this website or get in touch,</strong> we decide why and how your details are used, so we are
        responsible for them.
      </p>
      <p>
        <strong>If you work for a company that uses Evo Stays</strong> (as an admin, office member, cleaner or linen
        supplier), your company decides what goes into its account, and we look after that information on its behalf. For
        anything about that information, your company is the first place to ask, and we will help it respond.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>From this website.</strong>
      </p>
      <ul>
        <li>If you register interest: your name, email, company name and anything you choose to tell us about your portfolio.</li>
        <li>If you use the contact form: your name, email, company (optional), what it is about and your message.</li>
        <li>
          To stop spam and guess-work at sign-in, your network address is counted briefly. It is held in the server&apos;s
          memory for up to an hour and is not saved with your message.
        </li>
      </ul>
      <p>
        <strong>In an Evo Stays account.</strong>
      </p>
      <ul>
        <li>For each person with a login: name, email, role, and a password that is stored only in scrambled (hashed) form.</li>
        <li>
          What the company puts in: clients and properties (including addresses, access notes and key safe codes), cleans and
          schedules, check-in and check-out times, photos taken during cleans, stock levels, laundry, issues and notes, and
          the hours and invoices worked out from them.
        </li>
        <li>An activity log of who changed what and when, and the notifications a person has been sent.</li>
        <li>
          If you turn on alerts on a device: the address and keys your browser gives us to send alerts to it, and a short
          description of the device, such as the browser name.
        </li>
        <li>
          For linen companies: the properties supplied, the time chosen to arrive and any problems flagged. A linen company
          never sees access codes.
        </li>
      </ul>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li>To reply to your message and to arrange a demo: our legitimate interest in answering people who contact us.</li>
        <li>To provide Evo Stays to a company and its people: so the service can work as agreed with that company.</li>
        <li>To keep the service secure and prevent abuse, including limiting sign-in attempts: our legitimate interest in protecting it.</li>
        <li>To send you service messages, such as a change to a clean: so the service can work as agreed.</li>
        <li>To send alerts to your device: your consent, which you give by turning alerts on and can withdraw by turning them off.</li>
      </ul>
      <p>We do not sell personal information, and we do not use it for advertising.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li>
          <strong>Providers that run the service for us:</strong> the companies that host Evo Stays and, once switched on,
          send its email.
        </li>
        <li>
          <strong>A postcode lookup:</strong> to find a property on the map, the postcode of the property (not the full
          address or any names) is sent to postcodes.io, a free UK postcode service.
        </li>
        <li>
          <strong>Alert delivery:</strong> an alert to a phone or browser is delivered through the push service run by the
          browser&apos;s maker (for example Google, Apple, Mozilla or Microsoft). They carry the alert but cannot read it, as it
          is encrypted for your device.
        </li>
        <li>
          <strong>The company you work for:</strong> a company can see the people and records in its own account, and nobody
          else&apos;s.
        </li>
      </ul>
      <p>
        Our support team can view a company&apos;s account in order to help it. When that happens it is recorded in the
        company&apos;s activity log.
      </p>
      <p>We may also share information where the law requires it.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Contact messages and registered interest: until you ask us to delete them, or we no longer need them to follow up.</li>
        <li>
          Account information: for as long as the company uses Evo Stays. What happens to it afterwards is agreed with the
          company, unless the law requires us to keep something.
        </li>
        <li>Alert devices: until you turn alerts off, or the device stops accepting them.</li>
      </ul>

      <h2>Your rights</h2>
      <p>Under UK data protection law you can ask us to:</p>
      <ul>
        <li>tell you what we hold about you and give you a copy,</li>
        <li>correct anything that is wrong,</li>
        <li>delete your information, or restrict how it is used,</li>
        <li>stop using it where we rely on our legitimate interests, and</li>
        <li>give you the information you provided in a form you can reuse.</li>
      </ul>
      <p>
        To use any of these, <Link href="/contact">contact us</Link>. If you are not happy with how we have handled your
        information, you can complain to the Information Commissioner&apos;s Office at{" "}
        <a href="https://ico.org.uk" rel="noreferrer">
          ico.org.uk
        </a>
        .
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to keep you signed in, and nothing for tracking or advertising. See our{" "}
        <Link href="/cookies">cookies page</Link>.
      </p>

      <h2>Changes to this notice</h2>
      <p>
        If we change this notice in a way that matters, we will update the date at the top. Evo Stays is still growing, so
        it will change as the service does.
      </p>
    </LegalPage>
  );
}
