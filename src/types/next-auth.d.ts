import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    organizationId: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string;
      // Set only on a session minted by impersonateOrganization (see
      // src/app/impersonation/actions.ts) -- the platform owner's own user
      // id, so stopImpersonating knows who to switch back to and
      // ImpersonationBanner knows to show itself. Absent (undefined) on a
      // normal sign-in, never present for the owner's own genuine session.
      impersonatedBy?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    organizationId?: string;
    impersonatedBy?: string;
  }
}
