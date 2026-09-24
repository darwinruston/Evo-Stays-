import { deadlinePassed, formatArrival, type Turnover } from "@/lib/turnover";
import { card } from "@/lib/ui";

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2" />
    </svg>
  );
}

// The same-day deadline stated as a banner rather than a small label --
// same treatment (and same reasoning) as SofaBedNotice: it stays on screen
// through the whole visit, since "guests at 3pm" matters just as much at
// the after-photos step as it did at check-in. A clean whose next guests
// aren't due the same day gets a quiet one-liner instead, or nothing.
export function TurnoverNotice({ turnover, className = "" }: { turnover: Turnover; className?: string }) {
  if (!turnover.sameDay) {
    return <p className={`text-sm text-zinc-500 ${className}`}>Next guests: {formatArrival(turnover)}</p>;
  }
  const time = turnover.nextArrival.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`${card("flex items-center gap-3 border-2 border-zinc-900 p-4")} ${className}`}>
      <ClockIcon className="h-6 w-6 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Same-day turnover</p>
        <p className="text-sm text-zinc-600">
          {!turnover.arrivalTimeKnown
            ? "Next guests arrive today — finish as early as you can."
            : deadlinePassed(turnover)
              ? `Next guests were due at ${time} — finish as soon as you can and let the office know.`
              : `Next guests arrive at ${time} — finish before then.`}
        </p>
      </div>
    </div>
  );
}
