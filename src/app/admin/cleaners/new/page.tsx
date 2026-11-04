import { redirect } from "next/navigation";

// New cleaners are added from the People page, under Operations.
export default function NewCleanerRedirect() {
  redirect("/admin/team");
}
