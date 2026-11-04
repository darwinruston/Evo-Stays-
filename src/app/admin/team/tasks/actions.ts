"use server";

import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import type { ScopedPrismaClient } from "@/lib/prisma";
import { requireStaff } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { formatDateOnly, parseDateOnly } from "@/lib/dateOnly";
import {
  TASK_COMMENT_MAX,
  TASK_NOTES_MAX,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TITLE_MAX,
  isTaskPriority,
  isTaskStatus,
  taskHref,
} from "@/lib/tasks";
import type { ActionResult } from "@/lib/actionResult";

const TASKS_HREF = "/admin/team/tasks";

function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

type TaskValues = {
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueOn: Date | null;
  assignedToId: string | null;
  propertyId: string | null;
};

// Reads and checks the task form. Returns a reason the person can fix rather
// than throwing (see ActionResult). The assignee must be a real Admin or
// Office login in this company, and the property one of its own: a crafted
// POST can't point a task at someone or something else.
async function readTask(
  db: ScopedPrismaClient,
  formData: FormData,
): Promise<{ error: string } | { values: TaskValues; assigneeName: string | null }> {
  const title = str(formData, "title");
  if (!title) return { error: "Give the task a title" };
  if (title.length > TASK_TITLE_MAX) return { error: `Keep the title under ${TASK_TITLE_MAX} characters` };

  const description = str(formData, "description");
  if (description && description.length > TASK_NOTES_MAX) {
    return { error: `Keep the notes under ${TASK_NOTES_MAX} characters` };
  }

  const priorityRaw = str(formData, "priority");
  const priority: TaskPriority = isTaskPriority(priorityRaw) ? priorityRaw : "NORMAL";

  const dueRaw = str(formData, "dueOn");
  const dueOn = dueRaw ? parseDateOnly(dueRaw) : null;
  if (dueRaw && !dueOn) return { error: "That is not a valid due date" };

  const assignedToId = str(formData, "assignedToId");
  let assigneeName: string | null = null;
  if (assignedToId) {
    const assignee = await db.user.findFirst({
      where: { id: assignedToId, role: { in: ["ADMIN", "OFFICE"] }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
      select: { name: true },
    });
    if (!assignee) return { error: "That person can't be given tasks" };
    assigneeName = assignee.name;
  }

  const propertyId = str(formData, "propertyId");
  if (propertyId) {
    const property = await db.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!property) return { error: "That property no longer exists" };
  }

  return { values: { title, description, priority, dueOn, assignedToId, propertyId }, assigneeName };
}

function assignedNotice(taskId: string, actorName: string, userId: string, values: TaskValues) {
  const bits = [TASK_PRIORITY_LABELS[values.priority], values.dueOn ? `due ${formatDateOnly(values.dueOn)}` : null];
  return {
    userId,
    kind: "TASK_ASSIGNED" as const,
    title: `${actorName} gave you a task: ${values.title}`,
    body: bits.filter(Boolean).join(", "),
    href: taskHref(taskId),
  };
}

function refresh() {
  // The list and each task's own page.
  revalidatePath(TASKS_HREF, "layout");
  // The Team tab in the menu carries a count of your open tasks.
  revalidatePath("/admin", "layout");
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  const read = await readTask(db, formData);
  if ("error" in read) return read;
  const { values, assigneeName } = read;

  const created = await db.task.create({
    data: { organizationId: session.user.organizationId, createdById: session.user.id, ...values },
    select: { id: true },
  });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: created.id,
    summary: `Created task "${values.title}" (${TASK_PRIORITY_LABELS[values.priority]})${assigneeName ? `, assigned to ${assigneeName}` : ""}`,
  });
  if (values.assignedToId && values.assignedToId !== session.user.id) {
    await notify(db, [assignedNotice(created.id, session.user.name ?? "Someone", values.assignedToId, values)]);
  }

  refresh();
}

export async function updateTask(id: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  const read = await readTask(db, formData);
  if ("error" in read) return read;
  const { values, assigneeName } = read;

  const before = await db.task.findUnique({
    where: { id },
    select: { title: true, priority: true, dueOn: true, assignedToId: true, propertyId: true, assignedTo: { select: { name: true } } },
  });
  if (!before) return { error: "That task no longer exists" };

  await db.task.update({ where: { id }, data: values });

  const changes: string[] = [];
  if (before.title !== values.title) changes.push(`renamed from "${before.title}"`);
  if (before.priority !== values.priority) {
    changes.push(`importance changed from ${TASK_PRIORITY_LABELS[before.priority]} to ${TASK_PRIORITY_LABELS[values.priority]}`);
  }
  if (before.assignedToId !== values.assignedToId) {
    changes.push(
      assigneeName
        ? `assigned to ${assigneeName}${before.assignedTo ? ` (was ${before.assignedTo.name})` : ""}`
        : "made unassigned",
    );
  }
  if ((before.dueOn?.getTime() ?? null) !== (values.dueOn?.getTime() ?? null)) {
    changes.push(values.dueOn ? `due date set to ${formatDateOnly(values.dueOn)}` : "due date cleared");
  }
  if (before.propertyId !== values.propertyId) changes.push("property changed");
  if (changes.length > 0) {
    await logAudit(db, {
      actorId: session.user.id,
      entityType: "Task",
      entityId: id,
      summary: `"${values.title}": ${changes.join("; ")}`,
    });
  }
  if (values.assignedToId && values.assignedToId !== before.assignedToId && values.assignedToId !== session.user.id) {
    await notify(db, [assignedNotice(id, session.user.name ?? "Someone", values.assignedToId, values)]);
  }

  refresh();
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  if (!isTaskStatus(status)) return { error: "That is not a valid status" };

  const task = await db.task.findUnique({
    where: { id },
    select: { title: true, status: true, createdById: true },
  });
  if (!task) return { error: "That task no longer exists" };
  if (task.status === status) return;

  await db.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
      completedById: status === "DONE" ? session.user.id : null,
    },
  });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: id,
    summary: `"${task.title}" moved to ${TASK_STATUS_LABELS[status]}`,
  });
  // Tell whoever asked for it, unless they're the one who finished it.
  if (status === "DONE" && task.createdById && task.createdById !== session.user.id) {
    await notify(db, [
      {
        userId: task.createdById,
        kind: "TASK_COMPLETED",
        title: `${session.user.name ?? "Someone"} completed: ${task.title}`,
        href: taskHref(id),
      },
    ]);
  }

  refresh();
}

// An update on a task. Whoever it is with and whoever asked for it are told,
// unless they wrote it themselves.
export async function addTaskComment(id: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  const body = str(formData, "body");
  if (!body) return { error: "Write something first" };
  if (body.length > TASK_COMMENT_MAX) return { error: `Keep an update under ${TASK_COMMENT_MAX} characters` };

  const task = await db.task.findUnique({
    where: { id },
    select: { title: true, assignedToId: true, createdById: true },
  });
  if (!task) return { error: "That task no longer exists" };

  await db.taskComment.create({
    data: { organizationId: session.user.organizationId, taskId: id, authorId: session.user.id, body },
  });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: id,
    summary: `Added an update to "${task.title}"`,
  });

  const recipients = new Set([task.assignedToId, task.createdById]);
  recipients.delete(null);
  recipients.delete(session.user.id);
  if (recipients.size > 0) {
    const preview = body.length > 140 ? `${body.slice(0, 137)}...` : body;
    await notify(
      db,
      [...recipients].map((userId) => ({
        userId: userId as string,
        kind: "TASK_COMMENTED" as const,
        title: `${session.user.name ?? "Someone"} updated: ${task.title}`,
        body: preview,
        href: taskHref(id),
      })),
    );
  }

  refresh();
}

// The person who created a task or an Admin can delete it.
export async function deleteTask(id: string): Promise<ActionResult> {
  const { session, db } = await requireStaff();

  const task = await db.task.findUnique({ where: { id }, select: { title: true, createdById: true } });
  if (!task) return;
  if (session.user.role !== "ADMIN" && task.createdById !== session.user.id) {
    return { error: "Only the person who created a task, or an Admin, can delete it" };
  }

  await db.task.delete({ where: { id } });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: id,
    summary: `Deleted task "${task.title}"`,
  });

  refresh();
}
