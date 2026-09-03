import type { InvoiceCadence } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/lib/schedule";

// The period offered when generating, based on the cadence setting -- "the
// most recent full period", never including today (a period ending today
// would still be accumulating hours). Always overridable in the UI; this is
// just a sensible starting point, not the only period a run can cover.
export function defaultPeriodForCadence(
  cadence: InvoiceCadence,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (cadence === "MONTHLY") {
    const end = new Date(today.getFullYear(), today.getMonth(), 1);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    return { start, end };
  }

  if (cadence === "WEEKLY") {
    // Most recent Monday (today if today is one) is the end of the window;
    // Monday-first matches the calendar grid elsewhere in the app.
    const dayOffset = (today.getDay() + 6) % 7; // Monday = 0
    const end = new Date(today);
    end.setDate(end.getDate() - dayOffset);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return { start, end };
  }

  // FORTNIGHTLY -- no fixed anchor, just the 14 days before the most recent
  // Monday, for the same reason as WEEKLY.
  const dayOffset = (today.getDay() + 6) % 7;
  const end = new Date(today);
  end.setDate(end.getDate() - dayOffset);
  const start = new Date(end);
  start.setDate(start.getDate() - 14);
  return { start, end };
}

// periodEnd is always the exclusive boundary generateInvoices used (the day
// after the last one actually billed) -- every display of a period has to
// subtract a millisecond back onto the last included day, so it lives here
// once rather than being reimplemented per page.
export function formatPeriod(periodStart: Date, periodEnd: Date): string {
  const lastIncludedDay = new Date(periodEnd.getTime() - 1);
  return `${toIsoDate(periodStart)} – ${toIsoDate(lastIncludedDay)}`;
}

export function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type GenerateInvoicesResult = {
  createdInvoiceIds: string[];
  skippedCleanerNames: string[];
};

// Turns completed visits into invoices for a period. Idempotent by
// construction: a CleanLog only becomes eligible once (the InvoiceLine.
// cleanLogId unique constraint plus this query's `invoiceLine: null` filter
// mean re-running for an overlapping period just picks up whatever's still
// unbilled, never double-bills a visit already on an invoice).
export async function generateInvoices(
  periodStart: Date,
  periodEnd: Date,
): Promise<GenerateInvoicesResult> {
  const eligibleLogs = await prisma.cleanLog.findMany({
    where: {
      departedAt: { gte: periodStart, lt: periodEnd },
      arrivedAt: { not: null },
      invoiceLine: null,
      clean: { status: "COMPLETED", assignedToId: { not: null } },
    },
    include: {
      clean: {
        include: {
          assignedTo: { select: { id: true, name: true, hourlyRate: true } },
          property: { select: { id: true, minBillableHours: true } },
        },
      },
    },
  });

  type Group = {
    cleanerId: string;
    cleanerName: string;
    hourlyRate: number | null;
    propertyId: string;
    minBillableHours: number | null;
    logs: { id: string; arrivedAt: Date; departedAt: Date }[];
  };
  const groups = new Map<string, Group>();

  for (const log of eligibleLogs) {
    // Both are guaranteed by the where clause above (assignedToId not null,
    // arrivedAt not null), but Prisma's types can't express that.
    const cleaner = log.clean.assignedTo!;
    const propertyId = log.clean.property.id;
    const key = `${cleaner.id}:${propertyId}`;

    const group = groups.get(key) ?? {
      cleanerId: cleaner.id,
      cleanerName: cleaner.name,
      hourlyRate: cleaner.hourlyRate,
      propertyId,
      minBillableHours: log.clean.property.minBillableHours,
      logs: [],
    };
    group.logs.push({ id: log.id, arrivedAt: log.arrivedAt!, departedAt: log.departedAt! });
    groups.set(key, group);
  }

  const createdInvoiceIds: string[] = [];
  const skippedCleanerNames = new Set<string>();

  for (const group of groups.values()) {
    if (group.hourlyRate === null) {
      // No rate set -- reported back by name rather than invoiced at £0,
      // which would silently under-bill and look like real data.
      skippedCleanerNames.add(group.cleanerName);
      continue;
    }

    const lines = group.logs.map((log) => {
      const actualHours = (log.departedAt.getTime() - log.arrivedAt.getTime()) / 3600000;
      // A property can set a floor on billable hours per visit so a
      // cleaner who finishes quickly because the place was left tidy isn't
      // penalised for it -- arrivedAt/departedAt still record the real
      // visit, only the billed hours are topped up.
      const hours =
        group.minBillableHours !== null ? Math.max(actualHours, group.minBillableHours) : actualHours;
      return {
        cleanLogId: log.id,
        arrivedAt: log.arrivedAt,
        departedAt: log.departedAt,
        hours,
        amount: hours * group.hourlyRate!,
      };
    });
    const totalHours = lines.reduce((sum, l) => sum + l.hours, 0);
    const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);

    const invoice = await prisma.invoice.create({
      data: {
        cleanerId: group.cleanerId,
        propertyId: group.propertyId,
        periodStart,
        periodEnd,
        hourlyRate: group.hourlyRate,
        totalHours,
        totalAmount,
        lines: { create: lines },
      },
    });
    createdInvoiceIds.push(invoice.id);
  }

  return { createdInvoiceIds, skippedCleanerNames: [...skippedCleanerNames] };
}
