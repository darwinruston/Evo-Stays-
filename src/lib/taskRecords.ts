import type { TaskPriority, TaskRepeat } from "@prisma/client";
import type { ScopedPrismaClient } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { SYSTEM_USER_ID_PREFIX } from "@/lib/systemUser";
import { formatDateOnly, parseDateOnly } from "@/lib/dateOnly";
import {
  TASK_NOTES_MAX,
  TASK_PRIORITY_LABELS,
  TASK_TITLE_MAX,
  isTaskPriority,
  taskHref,
} from "@/lib/tasks";
import { isTaskRepeat, repeatPhrase } from "@/lib/taskRepeat";

// What both the Tasks page and an issue being turned into a task need to read a
// task form and make the task. Kept out of the server-action files so these
// helpers aren't exposed as actions of their own.

export function str(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export type TaskValues = {
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
export async function readTask(
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
export function peopleList(names: string[], wholeTeam: boolean): string {
  if (wholeTeam && names.length > 1) return "the whole team";
  if (names.length <= 1) return names[0] ?? "nobody";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// How many people can be given tasks in this company, to tell "the whole team"
// from "several people".
export async function teamSize(db: ScopedPrismaClient): Promise<number> {
  return db.user.count({
    where: { role: { in: ["ADMIN", "OFFICE"] }, NOT: { id: { startsWith: SYSTEM_USER_ID_PREFIX } } },
  });
}

export function assignedNotice(taskId: string, actorName: string, userId: string, values: TaskValues) {
  const bits = [TASK_PRIORITY_LABELS[values.priority], values.dueOn ? `due ${formatDateOnly(values.dueOn)}` : null];
  return {
    userId,
    kind: "TASK_ASSIGNED" as const,
    title: `${actorName} gave you a task: ${values.title}`,
    body: bits.filter(Boolean).join(", "),
    href: taskHref(taskId),
  };
}

// Makes a task from the task form: the task and its people, the activity
// entry, and a notice to everyone given it (except the person making it).
// Used by createTask and by turning an issue into a task. Returns the new
// task's id, or a reason the person can fix.
export async function createTaskFromForm(
  db: ScopedPrismaClient,
  actor: { id: string; name: string | null; organizationId: string },
  formData: FormData,
  auditNote = "",
): Promise<{ error: string } | { id: string; title: string }> {
  const read = await readTask(db, formData);
  if ("error" in read) return read;
  const { values, assignees } = read;

  const created = await db.task.create({
    data: {
      organizationId: actor.organizationId,
      createdById: actor.id,
      ...values,
      assignees: {
        create: assignees.map((a) => ({ organizationId: actor.organizationId, userId: a.id })),
      },
    },
    select: { id: true },
  });

  const team = assignees.length > 0 ? await teamSize(db) : 0;
  await logAudit(db, {
    actorId: actor.id,
    entityType: "Task",
    entityId: created.id,
    summary: `Created task "${values.title}" (${TASK_PRIORITY_LABELS[values.priority]})${values.repeat ? `, ${repeatPhrase(values.repeat).toLowerCase()}` : ""}${
      assignees.length > 0 ? `, assigned to ${peopleList(assignees.map((a) => a.name), assignees.length === team)}` : ""
    }${auditNote}`,
  });
  const told = assignees.filter((a) => a.id !== actor.id);
  if (told.length > 0) {
    await notify(db, told.map((a) => assignedNotice(created.id, actor.name ?? "Someone", a.id, values)));
  }

  return { id: created.id, title: values.title };
}
