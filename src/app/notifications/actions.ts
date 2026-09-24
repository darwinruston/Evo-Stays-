"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Shared by admin/office and cleaners -- every one of these only ever
// touches the caller's own notifications, so there's no role check beyond
// being signed in, just the userId scoping in each query.
async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

// Both areas' layouts show the unread count in the nav, so both are
// revalidated at layout level -- a page-only revalidate would leave the
// badge stale until the next full reload.
function revalidateNotificationViews() {
  revalidatePath("/admin", "layout");
  revalidatePath("/cleaner", "layout");
}

export async function markAllNotificationsRead() {
  const session = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateNotificationViews();
}

export async function setEmailNotifications(formData: FormData) {
  const session = await requireUser();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotifications: formData.get("enabled") === "on" },
  });
  revalidateNotificationViews();
}
