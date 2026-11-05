"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@prisma/client";
import { requireStaff } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { formatDateOnly } from "@/lib/dateOnly";
import {
  SUBTASKS_MAX,
  SUBTASK_TITLE_MAX,
  TASK_COMMENT_MAX,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  isTaskStatus,
  taskHref,
} from "@/lib/tasks";
import { TASK_REPEAT_LABELS, nextDueDate, repeatPhrase } from "@/lib/taskRepeat";
import { assignedNotice, createTaskFromForm, peopleList, readTask, str, teamSize } from "@/lib/taskRecords";
import type { ActionResult } from "@/lib/actionResult";

const TASKS_HREF = "/admin/team/tasks";

function refresh() {
  // The list and each task's own page.
  revalidatePath(TASKS_HREF, "layout");
  // The Operations heading in the menu carries a count of your open tasks.
  revalidatePath("/admin", "layout");
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();
  const created = await createTaskFromForm(
    db,
    { id: session.user.id, name: session.user.name ?? null, organizationId: session.user.organizationId },
    formData,
  );
  if ("error" in created) return created;

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

  const dueChanged = (before.dueOn?.getTime() ?? null) !== (values.dueOn?.getTime() ?? null);

  // One nested write, so the task and its people change together.
  await db.task.update({
    where: { id },
    data: {
      ...values,
      // A new due date reminds afresh (see src/lib/taskReminders.ts).
      ...(dueChanged ? { dueSoonNotifiedAt: null, overdueNotifiedAt: null } : {}),
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
      // Only a top-level task repeats its subtasks: they are copied across too.
      children: {
        orderBy: { position: "asc" },
        select: {
          title: true,
          description: true,
          priority: true,
          propertyId: true,
          position: true,
          dueOn: true,
          createdById: true,
          assignees: { select: { userId: true } },
        },
      },
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
        // The same subtasks, none of them done, their dates moved on by as much
        // as the main task's.
        children: {
          create: task.children.map((child) => ({
            organizationId: session.user.organizationId,
            title: child.title,
            description: child.description,
            priority: child.priority,
            propertyId: child.propertyId,
            position: child.position,
            createdById: child.createdById,
            dueOn: child.dueOn && task.dueOn ? new Date(child.dueOn.getTime() + (dueOn.getTime() - task.dueOn.getTime())) : null,
            assignees: {
              create: child.assignees.map((a) => ({ userId: a.userId, organizationId: session.user.organizationId })),
            },
          })),
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

// Adds subtasks to a task. Each non-empty line of what was typed or pasted
// becomes one, so a whole list can go in at once. A subtask is a task in its
// own right (it gets a due date, notes, people and updates when you open it),
// so this only makes the shell: a title under the main task, at the same
// property. A subtask has no subtasks of its own.
export async function addSubtasks(taskId: string, formData: FormData): Promise<ActionResult> {
  const { session, db } = await requireStaff();

  const raw = formData.get("titles");
  const titles = (typeof raw === "string" ? raw : "")
    .split(/\r?\n/)
    // A pasted list often arrives with bullets or numbers already on it.
    .map((line) => line.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s+/, "").trim())
    .filter((line) => line !== "");
  if (titles.length === 0) return { error: "Write the subtask first" };
  if (titles.some((t) => t.length > SUBTASK_TITLE_MAX)) {
    return { error: `Keep each subtask under ${SUBTASK_TITLE_MAX} characters` };
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { title: true, parentId: true, propertyId: true, _count: { select: { children: true } } },
  });
  if (!task) return { error: "That task no longer exists" };
  if (task.parentId) return { error: "A subtask can't have subtasks of its own" };
  if (task._count.children + titles.length > SUBTASKS_MAX) {
    return { error: `A task can have up to ${SUBTASKS_MAX} subtasks. Split it into separate tasks.` };
  }

  const last = await db.task.findFirst({ where: { parentId: taskId }, orderBy: { position: "desc" }, select: { position: true } });
  const start = (last?.position ?? -1) + 1;
  await db.task.createMany({
    data: titles.map((title, i) => ({
      organizationId: session.user.organizationId,
      createdById: session.user.id,
      title,
      parentId: taskId,
      propertyId: task.propertyId,
      position: start + i,
    })),
  });
  await logAudit(db, {
    actorId: session.user.id,
    entityType: "Task",
    entityId: taskId,
    summary: `Added ${titles.length === 1 ? `the subtask "${titles[0]}"` : `${titles.length} subtasks`} to "${task.title}"`,
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
