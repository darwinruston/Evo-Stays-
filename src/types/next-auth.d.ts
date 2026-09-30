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
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    organizationId?: string;
  }
}
