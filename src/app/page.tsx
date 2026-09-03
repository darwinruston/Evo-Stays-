import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Everything behind this app needs a login (see src/proxy.ts), so "/" is
// purely a router: it sends each role to the area they actually work in.
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "CLEANER") redirect("/cleaner");
  if (session.user.role === "CLIENT") redirect("/client");
  redirect("/admin");
}
