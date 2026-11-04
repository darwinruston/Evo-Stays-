import { redirect } from "next/navigation";

// Cleaners are listed on the Team page now. Kept so an old bookmark or link
// still lands somewhere useful.
export default function CleanersRedirect() {
  redirect("/admin/team");
}
