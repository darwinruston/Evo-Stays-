import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff, isStaffSession } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency, formatHours, formatPeriod } from "@/lib/invoices";
import { formatDate, formatScheduledFor } from "@/lib/schedule";
import { badge, button, card, inputCompact } from "@/lib/ui";
import { setInvoicePaid, adjustInvoiceLineHours } from "../actions";

// Below this, a visit is worth a second look before it gets paid or billed
// -- a real turnover doesn't take under 10 minutes, so it's almost always a
// bad check-in/check-out timestamp rather than a genuinely fast clean.
const SUSPICIOUSLY_SHORT_MINUTES = 10;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isStaffSession())) return { title: "Invoice" };
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { cleaner: { select: { name: true } }, property: { select: { name: true, address: true } } },
  });
  return {
    title: invoice ? `Invoice · ${invoice.cleaner.name} · ${propertyDisplayName(invoice.property)}` : "Invoice",
  };
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      cleaner: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, name: true, address: true, client: { select: { id: true, name: true } } } },
      lines: { orderBy: { arrivedAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  // One invoice is one cleaner at one property, so its visits are all billed
  // the same way: every one at the agreed flat fee, or all by the hour.
  const allFlat = invoice.lines.length > 0 && invoice.lines.every((l) => l.flatFee !== null);

  const activity = await prisma.auditLog.findMany({
    where: { entityType: "Invoice", entityId: invoice.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/invoices" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Invoices
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <Link href={`/admin/cleaners/${invoice.cleaner.id}`} className="hover:underline">
                {invoice.cleaner.name}
              </Link>
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              <Link href={`/admin/properties/${invoice.property.id}`} className="hover:text-zinc-900">
                {propertyDisplayName(invoice.property)}
              </Link>
              {" · "}
              <Link href={`/admin/clients/${invoice.property.client.id}`} className="hover:text-zinc-900">
                {invoice.property.client.name}
              </Link>
            </p>
          </div>
          <span className={badge(invoice.paidAt ? "solid" : "neutral")}>
            {invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : "Unpaid"}
          </span>
        </div>
      </div>

      <div className={card("divide-y divide-black/5 px-4 py-1")}>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Period</span>
          <span>{formatPeriod(invoice.periodStart, invoice.periodEnd)}</span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Rate</span>
          <span>
            {allFlat
              ? `Flat fee ${formatCurrency(invoice.lines[0].flatFee!)} per visit`
              : `${formatCurrency(invoice.hourlyRate)}/hr`}
          </span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm">
          <span className="text-zinc-500">Total hours</span>
          <span>{formatHours(invoice.totalHours)}</span>
        </div>
        <div className="flex justify-between gap-6 py-2 text-sm font-medium">
          <span>Total</span>
          <span>{formatCurrency(invoice.totalAmount)}</span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Visits ({invoice.lines.length})</h2>
        <ul className="flex flex-col gap-2">
          {invoice.lines.map((line) => {
            const actualHours = (line.departedAt.getTime() - line.arrivedAt.getTime()) / 3600000;
            // Once a line's been manually adjusted, the "topped up to
            // minimum" note no longer applies -- the billed hours are
            // whatever staff set, not derived from the visit any more.
            const toppedUp = !line.adjusted && line.hours > actualHours + 1 / 3600; // +1s slack for float rounding
            // A flat-fee visit pays the same however long it took, so a short
            // one isn't a billing question.
            const isFlat = line.flatFee !== null;
            const suspiciouslyShort = !isFlat && actualHours * 60 < SUSPICIOUSLY_SHORT_MINUTES;
            return (
              <li key={line.id} className={card("flex flex-col gap-3 p-4")}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm">
                    {formatScheduledFor(line.arrivedAt)} – {formatScheduledFor(line.departedAt)}
                  </span>
                  <span className="shrink-0 text-sm text-zinc-500">
                    {isFlat ? `Flat fee (${formatHours(actualHours)} on site)` : formatHours(line.hours)}
                    {line.adjusted && ` (adjusted — actual visit ${formatHours(actualHours)})`}
                    {toppedUp && ` (${formatHours(actualHours)} actual, topped up to minimum)`}
                    {" · "}
                    {formatCurrency(line.amount)}
                  </span>
                </div>
                {suspiciouslyShort && (
                  <p className="text-xs text-red-600">
                    Only {formatHours(actualHours)} on site — worth checking before this gets paid.
                  </p>
                )}
                {!invoice.paidAt && !isFlat && (
                  <form
                    action={adjustInvoiceLineHours.bind(null, line.id)}
                    className="flex items-center gap-2"
                  >
                    <label htmlFor={`hours-${line.id}`} className="text-xs text-zinc-500">
                      Billed hours
                    </label>
                    <input
                      id={`hours-${line.id}`}
                      name="hours"
                      type="number"
                      step="0.25"
                      min={0}
                      // Rounded for display -- an unadjusted line's hours come
                      // straight from arrivedAt/departedAt (e.g.
                      // 0.01068444444444444), which reads as noise in an
                      // editable field. Matches the 0.25 step below.
                      defaultValue={Math.round(line.hours * 100) / 100}
                      className={`${inputCompact} w-24`}
                    />
                    <button type="submit" className={button("secondary", "sm")}>
                      Save
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <form action={setInvoicePaid.bind(null, invoice.id, !invoice.paidAt)}>
        <button type="submit" className={button(invoice.paidAt ? "secondary" : "primary", "sm")}>
          {invoice.paidAt ? "Mark as unpaid" : "Mark as paid"}
        </button>
      </form>

      {activity.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Activity</h2>
          <ul className="flex flex-col gap-1.5">
            {activity.map((entry) => (
              <li key={entry.id} className="text-sm text-zinc-600">
                {entry.summary}
                <span className="text-zinc-400">
                  {" "}
                  — {formatScheduledFor(entry.createdAt)} · {entry.actor?.name ?? "Unknown"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
