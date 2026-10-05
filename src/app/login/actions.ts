"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      // Codes set by the error classes thrown from authorize() in src/auth.ts.
      if (error.code === "rate_limited") {
        return "Too many failed attempts. Wait 15 minutes and try again.";
      }
      if (error.code === "demo_password") {
        return "This login still has the demo password. Ask an admin to set a new one.";
      }
    }
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }
}
