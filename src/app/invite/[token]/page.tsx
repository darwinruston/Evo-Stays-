import Link from "next/link";
import { prisma, authPrisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/passwordReset";
import { EvoTick } from "@/components/EvoTick";
import { card } from "@/lib/ui";
import { InviteForm } from "./InviteForm";

export const metadata = { title: "Set up your login", robots: { index: false, follow: false } };

// Where an invite link lands. Checked here as well as in the action, so a dead
// link says so at once rather than after the form is filled in.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  const live = !!invite && !invite.usedAt && invite.expiresAt > new Date();
  const user = live ? await authPrisma.user.findUnique({ where: { id: invite.userId } }) : null;
  const organization = user?.invitePending
    ? await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Evo Stays home">
            <EvoTick className="h-9 w-auto" />
          </Link>
        </div>
        <div className={card("p-6 sm:p-8")}>
          {user?.invitePending ? (
            <>
              <h1 className="mb-1 text-xl font-semibold tracking-tight">Welcome to Evo Stays</h1>
              <p className="mb-6 text-sm text-zinc-500">
                {organization ? `${organization.name} has added you.` : "You have been added."} Choose a password to
                finish.
              </p>
              <InviteForm token={token} name={user.name} email={user.email} />
            </>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-semibold tracking-tight">This link no longer works</h1>
              <p className="mb-6 text-sm text-zinc-500">
                Invite links work once and expire after a week. If you haven&apos;t set up your login yet, ask whoever
                invited you for a new link.
              </p>
              <Link href="/login" className="text-sm underline underline-offset-2 hover:text-zinc-900">
                Already set up? Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
