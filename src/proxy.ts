import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Authenticated-or-not only. Which role may see which area is decided by the
// requireStaff/requireCleaner guards in src/lib/authz.ts, called from each
// area's layout and again in its pages and actions.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  // "/" is the public landing page for a signed-out visitor (see
  // src/app/page.tsx) -- it redirects a signed-in one straight to their own
  // area itself, so this middleware just needs to let it through rather
  // than bouncing to /login the way every other route does.
  const isPublicLandingPage = req.nextUrl.pathname === "/";

  if (!isLoggedIn && !isLoginPage && !isPublicLandingPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  // Skip the auth API, Next internals, and any static file (public/ assets
  // always have a file extension, app pages never do). The photo-serving
  // routes under /api match this pattern too, but enforce their own auth()
  // check -- see src/app/api/profile-photos/[...path]/route.ts.
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
};
