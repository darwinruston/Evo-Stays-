import Link from "next/link";
import { LegalPage } from "@/components/marketing/parts";

export const metadata = {
  title: "Cookies",
  description: "The few cookies Evo Stays uses, and what it keeps on your device.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      updated="23 October 2026"
      intro="Evo Stays uses only the cookies it needs to work. There is nothing here for tracking you or for advertising."
    >
      <h2>What we use</h2>
      <p>
        When you sign in, Evo Stays sets a few small cookies so it knows who you are from one page to the next and can
        protect your sign-in. They are removed when you sign out or when they expire.
      </p>
      <ul>
        <li>
          <strong>Your sign-in session</strong> keeps you signed in. Without it you would have to sign in on every page.
        </li>
        <li>
          <strong>Sign-in protection</strong> cookies help stop other websites from sending a sign-in request on your behalf,
          and remember the page you were trying to reach.
        </li>
      </ul>
      <p>
        Cookies like these are strictly necessary for the service you have asked for, so the law allows them without asking
        for your consent.
      </p>

      <h2>What we do not use</h2>
      <p>
        No analytics cookies, no advertising cookies and no tracking tools from other companies. The fonts on this site are
        delivered from our own address, so your browser does not contact a font provider when you visit.
      </p>

      <h2>Other things kept on your device</h2>
      <ul>
        <li>
          If you dismiss the card that suggests adding Evo Stays to your home screen, your browser remembers that on your
          device, so it does not keep asking.
        </li>
        <li>
          Evo Stays keeps a small &quot;you are offline&quot; page on your device so it can show something helpful when
          you have no signal. It holds no personal information.
        </li>
        <li>
          If you turn on alerts, your browser keeps the permission you gave, and a record that lets us send alerts to that
          device. You can turn them off from the Alerts page at any time.
        </li>
      </ul>

      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings. If you block the ones above, you will not be able to stay
        signed in. For more about how we handle your information, see our <Link href="/privacy">privacy notice</Link>.
      </p>
    </LegalPage>
  );
}
