import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { propertyDisplayName } from "@/lib/address";
import { formatCurrency, formatHours, formatPeriod } from "@/lib/invoices";
import { toIsoDate, formatScheduledFor } from "@/lib/schedule";
import { badge, button, card } from "@/lib/ui";
import { setInvoicePaid } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
            {invoice.paidAt ? `Paid ${toIsoDate(invoice.paidAt)}` : "Unpaid"}
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
          <span>{formatCurrency(invoice.hourlyRate)}/hr</span>
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
          {invoice.lines.map((line) => (
            <li key={line.id} className={card("flex items-center justify-between gap-4 p-4")}>
              <span className="text-sm">
                {formatScheduledFor(line.arrivedAt)} – {formatScheduledFor(line.departedAt)}
              </span>
              <span className="shrink-0 text-sm text-zinc-500">
                {formatHours(line.hours)} · {formatCurrency(line.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <form action={setInvoicePaid.bind(null, invoice.id, !invoice.paidAt)}>
        <button type="submit" className={button(invoice.paidAt ? "secondary" : "primary", "sm")}>
          {invoice.paidAt ? "Mark as unpaid" : "Mark as paid"}
        </button>
      </form>
    </div>
  );
}
