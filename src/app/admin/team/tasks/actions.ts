"use server";

import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskRepeat, TaskStatus } from "@prisma/client";
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
import { TASK_REPEAT_LABELS, isTaskRepeat, nextDueDate, repeatPhrase } from "@/lib/taskRepeat";
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
  repeat: TaskRepeat | null;
  propertyId: string | null;
};

// Reads and checks the task form. Returns a reason the person can fix rather
// than throwing (see ActionResult). The assignee must be a real Admin or
// Office login in this company, and the property one of its own: a crafted
// POST can't point a task at someone or something else.
async function readTask(
  db: ScopedPrismaClient,
  formData: FormData,
): Promise<{ error: string } | { values: TaskValues; assignees: { id: string; name: string }[] }> {
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

  const repeatRaw = str(formData, "repeat");
  if (repeatRaw && !isTaskRepeat(repeatRaw)) return { error: "That is not a way a task can repeat" };
  const repeat = repeatRaw && isTaskRepeat(repeatRaw) ? repeatRaw : null;
  // The next one is counted from this one's due date.
  if (repeat && !dueOn) return { error: "Set a due date to make a task repeat" };

  // Everyone ticked, each checked to be a real Admin or Office login in this
  // company. A repeated id counts once.
  const wanted = [...new Set(formData.getAll("assigneeIds").filter((v): v is string => typeof v === "string" && v !== ""))];
  const assignees =
    wanted.length === 0
      ? []
      : await db.user.findMany({
          where: { id: { in: wanted }, role: { in: ["ADMIN", "OFFICE"] }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });
  if (assignees.length !== wanted.length) return { error: "One of those people can't be given tasks" };

  const propertyId = str(formData, "propertyId");
  if (propertyId) {
    const property = await db.property.findUnique({ where: { id: propertyId }, select: { id: true } });
    if (!property) return { error: "That property no longer exists" };
  }

  return { values: { title, description, priority, dueOn, repeat, propertyId }, assignees };
}

// "Alex and Sam", "Alex, Sam and Jo", or "the whole team" when everyone is on it.
function peopleList(names: string[], wholeTeam: boolean): string {
  if (wholeTeam && names.length > 1) return "the whole team";
  if (names.length <= 1) return names[0] ?? "nobody";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// How many people can be given tasks in this company, to tell "the whole team"
// from "several people".
async function teamSize(db: ScopedPrismaClient): Promise<number> {
  return db.user.count({
    where: { role: { in: ["ADMIN", "OFFICE"] }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
  });
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
  const { values, assignees } = read;

  const created = await db.task.create({
    data: {
      organizationId: session.user.organizationId,
      createdById: session.user.id,
      ...values,
      assignees: {
        create: assignees.map((a) => ({ organizationId: session.user.organizationId, userId: a.id })),
      },
    },
    select: { id: true },
  });

  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: created.id,
    summary: `Created task "${values.title}" (${TASK_PRIORITY_LABELS[values.priority]})${values.repeat ? `, ${repeatPhrase(values.repeat).toLowerCase()}` : ""}${assignees.length > 0 ? `, assigned to ${peopleList(assignees.map((a) => a.name), assignees.length === (await teamSize(db)))}` : ""}`,
  });
  const told = assignees.filter((a) => a.id !== session.user.id);
  if (told.length > 0) {
    await notify(db, told.map((a) => assignedNotice(created.id, session.user.name ?? "Someone", a.id, values)));
  }

  refresh();
}

export async function updateTask(id: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  const read = await readTask(db, formData);
  if ("error" in read) return read;
  const { values, assignees } = read;

  const before = await db.task.findUnique({
    where: { id },
    select: {
      title: true,
      priority: true,
      dueOn: true,
      repeat: true,
      propertyId: true,
      assignees: { select: { userId: true, user: { select: { name: true } } } },
    },
  });
  if (!before) return { error: "That task no longer exists" };

  const beforeIds = new Set(before.assignees.map((a) => a.userId));
  const afterIds = new Set(assignees.map((a) => a.id));
  const peopleChanged = beforeIds.size !== afterIds.size || [...afterIds].some((x) => !beforeIds.has(x));

  // One nested write, so the task and its people change together.
  await db.task.update({
    where: { id },
    data: {
      ...values,
      ...(peopleChanged
        ? {
            assignees: {
              deleteMany: { userId: { notIn: [...afterIds] } },
              create: assignees
                .filter((a) => !beforeIds.has(a.id))
                .map((a) => ({ userId: a.id, organizationId: session.user.organizationId })),
            },
          }
        : {}),
    },
  });

  const changes: string[] = [];
  if (before.title !== values.title) changes.push(`renamed from "${before.title}"`);
  if (before.priority !== values.priority) {
    changes.push(`importance changed from ${TASK_PRIORITY_LABELS[before.priority]} to ${TASK_PRIORITY_LABELS[values.priority]}`);
  }
  if (peopleChanged) {
    const size = await teamSize(db);
    const nowNames = assignees.map((a) => a.name);
    const wasNames = before.assignees.map((a) => a.user.name).sort((a, b) => a.localeCompare(b));
    changes.push(
      nowNames.length > 0
        ? `assigned to ${peopleList(nowNames, nowNames.length === size)}${wasNames.length > 0 ? ` (was ${peopleList(wasNames, wasNames.length === size)})` : ""}`
        : "made unassigned",
    );
  }
  if ((before.dueOn?.getTime() ?? null) !== (values.dueOn?.getTime() ?? null)) {
    changes.push(values.dueOn ? `due date set to ${formatDateOnly(values.dueOn)}` : "due date cleared");
  }
  if (before.propertyId !== values.propertyId) changes.push("property changed");
  if (before.repeat !== values.repeat) {
    changes.push(values.repeat ? repeatPhrase(values.repeat).toLowerCase() : "no longer repeats");
  }
  if (changes.length > 0) {
    await logAudit(db, {
      actorId: session.user.id,
      entityType: "Task",
      entityId: id,
      summary: `"${values.title}": ${changes.join("; ")}`,
    });
  }
  // Only the people newly given it are told.
  const added = assignees.filter((a) => !beforeIds.has(a.id) && a.id !== session.user.id);
  if (added.length > 0) {
    await notify(db, added.map((a) => assignedNotice(id, session.user.name ?? "Someone", a.id, values)));
  }

  refresh();
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  if (!isTaskStatus(status)) return { error: "That is not a valid status" };

  const task = await db.task.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      priority: true,
      status: true,
      createdById: true,
      dueOn: true,
      repeat: true,
      propertyId: true,
      assignees: { select: { userId: true } },
      // Already made from this one (it was finished, reopened and finished again).
      followUps: { select: { id: true }, take: 1 },
    },
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
  // A task that repeats makes the next one as it is finished, once.
  if (status === "DONE" && task.repeat && task.dueOn && task.followUps.length === 0) {
    const dueOn = nextDueDate(task.dueOn, task.repeat);
    const next = await db.task.create({
      data: {
        organizationId: session.user.organizationId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueOn,
        repeat: task.repeat,
        propertyId: task.propertyId,
        createdById: task.createdById,
        previousId: id,
        assignees: {
          create: task.assignees.map((a) => ({ userId: a.userId, organizationId: session.user.organizationId })),
        },
      },
      select: { id: true },
    });
    await logAudit(db, {
      actorId: session.user.id,
      entityType: "Task",
      entityId: next.id,
      summary: `Made the next "${task.title}" (${TASK_REPEAT_LABELS[task.repeat].toLowerCase()}), due ${formatDateOnly(dueOn)}`,
    });
    const told = task.assignees.filter((a) => a.userId !== session.user.id);
    if (told.length > 0) {
      await notify(
        db,
        told.map((a) => ({
          userId: a.userId,
          kind: "TASK_ASSIGNED" as const,
          title: `Due again: ${task.title}`,
          body: `Due ${formatDateOnly(dueOn)}`,
          href: taskHref(next.id),
        })),
      );
    }
  }
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

// "Pick this up": a task given to the whole team (or to nobody) becomes yours
// alone, so the rest of the team can see someone has it. Only for those, so one
// person can't take a task that was given to specific people.
export async function claimTask(id: string): Promise<ActionResult> {
  const { session, db } = await requireStaff();

  const task = await db.task.findUnique({
    where: { id },
    select: { title: true, status: true, assignees: { select: { userId: true } } },
  });
  if (!task) return { error: "That task no longer exists" };
  if (task.status === "DONE") return { error: "That task is already done" };

  const team = await teamSize(db);
  const open = task.assignees.length === 0 || (team > 1 && task.assignees.length === team);
  if (!open) return { error: "That task was given to specific people" };

  await db.task.update({
    where: { id },
    data: {
      assignees: {
        deleteMany: { userId: { not: session.user.id } },
        ...(task.assignees.some((a) => a.userId === session.user.id)
          ? {}
          : { create: [{ userId: session.user.id, organizationId: session.user.organizationId }] }),
      },
    },
  });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: id,
    summary: `${session.user.name ?? "Someone"} picked up "${task.title}"`,
  });

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
    select: { title: true, createdById: true, assignees: { select: { userId: true } } },
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

  const recipients = new Set<string | null>([task.createdById, ...task.assignees.map((a) => a.userId)]);
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
