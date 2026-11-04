import { redirect } from "next/navigation";

// New cleaners are added from the Team page.
export default function NewCleanerRedirect() {
  redirect("/admin/team");
}
