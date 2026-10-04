import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, isLoginBlocked, recordLoginFailure, recordLoginSuccess } from "@/lib/loginRateLimit";

// prisma/seed.ts gives every demo login this password. It's fine on a laptop
// but published in this repo, so a production server refuses it outright
// rather than trusting that someone remembered to change it. Set
// ALLOW_DEMO_PASSWORD=true to get back in if you're locked out by this.
const DEMO_PASSWORD = "password123";

// A real bcrypt hash of a random value nobody knows. Compared against when
// the email doesn't exist, so an unknown email takes as long to reject as
// a wrong password. Otherwise response timing would tell an attacker which
// emails have logins.
const DUMMY_HASH = "$2b$10$v6FBFY3VPHDCkIfVvsTAkuJgx3e/.Ee26IHjqwjKVvZSiKLalG.l2";

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

class DemoPasswordRefused extends CredentialsSignin {
  code = "demo_password";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        // Checked here rather than in the login form's server action, since
        // the credentials callback endpoint can also be posted to directly.
        const ip = clientIp(request.headers);
        if (isLoginBlocked(email, ip)) throw new TooManyAttempts();

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) {
          recordLoginFailure(email, ip);
          return null;
        }

        if (
          password === DEMO_PASSWORD &&
          process.env.NODE_ENV === "production" &&
          process.env.ALLOW_DEMO_PASSWORD !== "true"
        ) {
          throw new DemoPasswordRefused();
        }

        recordLoginSuccess(email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on every request that reads the session, not just at sign-in.
    // A JWT session is never stored server-side, so without this check a
    // deleted login, a role change, or a password reset would leave the old
    // session working until it expired, up to 30 days later. Returning null
    // ends the session.
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        return token;
      }

      if (!token.sub) return null;
      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { name: true, email: true, role: true, sessionVersion: true },
      });
      if (!current || current.sessionVersion !== (token.sessionVersion ?? 0)) return null;

      token.role = current.role;
      token.name = current.name;
      token.email = current.email;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
