"use server";

import { signOut } from "@/auth";

export async function logoutAction() {
  // "/" itself decides what a signed-out visitor sees -- the landing page --
  // so this doesn't skip past it to /login the way it used to.
  await signOut({ redirectTo: "/" });
}
