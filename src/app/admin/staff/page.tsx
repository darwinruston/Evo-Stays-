import { redirect } from "next/navigation";

// The Team page used to be called Staff logins. Kept so an old bookmark or
// link still lands somewhere useful.
export default function StaffRedirect() {
  redirect("/admin/team");
}
