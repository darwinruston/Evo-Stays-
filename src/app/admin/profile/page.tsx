import { requireStaff } from "@/lib/authz";
import { loadProfile } from "@/lib/profileData";
import { ProfileView } from "@/components/ProfileView";

export const metadata = { title: "Profile" };

export default async function AdminProfilePage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { session, db } = await requireStaff();
  const { changed } = await searchParams;
  const profile = await loadProfile(db, session);

  return <ProfileView {...profile} passwordChanged={changed === "1"} />;
}
