import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/authz";
import { getOrgSetup } from "@/lib/modules";
import { EvoTick } from "@/components/EvoTick";
import { NavMenu } from "@/components/NavMenu";
import { SectionTabs, type Section } from "@/components/SectionTabs";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { unreadNotificationCount } from "@/lib/notificationViews";
import { prisma } from "@/lib/prisma";
import { loadSafetyAttention } from "@/lib/safetyOverview";
import { logoutAction } from "../logout/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, db } = await requireStaff();
  // A brand-new company's admin answers the setup questions before anything
  // else. Support staff impersonating the company (see impersonation/) and
  // office users are left alone: it's the admin's decision to make.
  const { modules, onboardingDone } = await getOrgSetup(session.user.organizationId);
  if (!onboardingDone && session.user.role === "ADMIN" && !session.user.impersonatedBy) {
    redirect("/onboarding");
  }
  // Notifications leads the right-hand group -- it's personal to whoever's
  // signed in, like the directories beside it, rather than a shared work
  // area. Built per request since the count is.
  // Issues' badge counts everything not yet resolved -- the same number as
  // the dashboard's "Open issues" tile and the Issues page's Open tab, so
  // the three never disagree about how much is outstanding.
  const [unread, openIssues, linenProblems, myOpenTasks, me, safetyAttention] = await Promise.all([
    unreadNotificationCount(db, session.user.id),
    db.issue.count({ where: { status: { not: "RESOLVED" } } }),
    // A problem the linen company has flagged and nobody has picked up yet.
    modules.laundry ? db.linenVisit.count({ where: { issueRaisedAt: { not: null }, issueResolvedAt: null } }) : 0,
    // Tasks given to you and not yet done, shown on the Operations heading and its Tasks tab.
    db.task.count({ where: { assignees: { some: { userId: session.user.id } }, status: { not: "DONE" } } }),
    // Their photo, for the Profile link in the bar.
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true, photoPath: true } }),
    // Health and safety checks overdue or coming up, for the flag on its tab.
    loadSafetyAttention(db),
  ]);
  // The main headings, each with the pages that belong under it. Stock,
  // Laundry and Invoices follow the company's own switches. A heading that
  // ends up with one page shows no tab row.
  const sections: (Section & { label: string; href: string; prefixes: string[]; count?: number; countLabel?: string })[] = [
    {
      key: "properties",
      label: "Properties",
      href: "/admin/properties",
      prefixes: ["/admin/properties", "/admin/issues"],
      count: openIssues,
      countLabel: "open issues",
      tabs: [
        { href: "/admin/properties", label: "Properties" },
        { href: "/admin/issues", label: "Issues", count: openIssues, countLabel: "open" },
      ],
    },
    {
      key: "cleaning",
      label: "Turnovers",
      href: "/admin/cleans",
      prefixes: ["/admin/cleans", "/admin/stock", "/admin/stock-items", "/admin/laundry", "/admin/laundry-facilities"],
      count: linenProblems,
      countLabel: "linen problems",
      tabs: [
        { href: "/admin/cleans", label: "Cleans" },
        ...(modules.stock ? [{ href: "/admin/stock", label: "Stock" }] : []),
        ...(modules.laundry
          ? [{ href: "/admin/laundry", label: "Laundry", count: linenProblems, countLabel: "linen problems" }]
          : []),
      ],
    },
    {
      key: "team",
      label: "Operations",
      // Opens on Tasks, the first tab: what needs doing comes before who is on the team.
      href: "/admin/team/tasks",
      prefixes: ["/admin/team", "/admin/staff", "/admin/cleaners", "/admin/audit", "/admin/safety"],
      count: myOpenTasks,
      countLabel: "tasks to do",
      tabs: [
        { href: "/admin/team/tasks", label: "Tasks", count: myOpenTasks, countLabel: "of your tasks to do", deep: true },
        // Anything overdue or coming up across every property, in one place.
        { href: "/admin/safety", label: "Health & safety", shortLabel: "Safety", count: safetyAttention.length, countLabel: "need attention" },
        { href: "/admin/team", label: "People" },
        { href: "/admin/audit", label: "Activity" },
      ],
    },
    {
      key: "clients",
      label: "Clients",
      href: "/admin/clients",
      prefixes: ["/admin/clients", "/admin/invoices"],
      tabs: [
        { href: "/admin/clients", label: "Clients" },
        ...(modules.invoicing ? [{ href: "/admin/invoices", label: "Invoices" }] : []),
      ],
    },
  ];
  const items = sections.map((s) => ({
    href: s.href,
    label: s.label,
    count: s.count,
    countLabel: s.countLabel,
    activePrefixes: s.prefixes,
  }));
  // Notifications are personal to whoever is signed in, so they sit apart from
  // the shared work areas, with Settings for admins.
  const rightItems = [
    {
      href: "/admin/notifications",
      icon: "bell" as const,
      label: "Notifications",
      count: unread,
      countLabel: "unread",
      activePrefixes: ["/admin/notifications"],
    },
    ...(session.user.role === "ADMIN"
      ? [{ href: "/admin/settings", label: "Settings", activePrefixes: ["/admin/settings"] }]
      : []),
    {
      href: "/admin/profile",
      label: "Profile",
      avatar: { name: me?.name ?? session.user.name ?? "Profile", photoPath: me?.photoPath ?? null },
      activePrefixes: ["/admin/profile"],
    },
  ];

  // Only fetched when actually impersonating (see impersonateOrganization
  // in src/app/impersonation/actions.ts) -- an extra query every other
  // admin page load has no reason to pay for. Raw `prisma`, not `db`: this
  // organisation's own name isn't itself RLS-protected data (Organisation
  // carries no RLS -- see UNSCOPED_MODELS in src/lib/prisma.ts).
  const impersonatedOrganization = session.user.impersonatedBy
    ? await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      })
    : null;

  return (
    <div className="min-h-screen">
      {impersonatedOrganization && <ImpersonationBanner organizationName={impersonatedOrganization.name} />}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/80 backdrop-blur-md">
        <nav className="relative flex items-center gap-6 px-4 py-4 sm:px-6 lg:px-10">
          <Link href="/admin" aria-label="Evo Stays home" className="shrink-0">
            <EvoTick className="h-6 w-auto" />
          </Link>
          <NavMenu items={items} rightItems={rightItems} logoutAction={logoutAction} breakpoint="lg" />
        </nav>
      </header>
      {/* Extra bottom padding, on top of the phone's own safe-area inset --
          see the matching comment in cleaner/layout.tsx. This area is used
          on desktop too, where the padding is a no-op either way, so the
          same fix applies without a breakpoint split. */}
      <main className="px-4 pt-10 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10">
        <SectionTabs sections={sections.map((s) => ({ key: s.key, tabs: s.tabs }))} />
        {children}
      </main>
    </div>
  );
}
