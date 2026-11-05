-- A subtask is now a task in its own right, sitting under a parent task, so it
-- gets dates, notes, updates and people like any other. The checklist-only
-- table goes; anything already in it is carried over as tasks first.

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "parentId" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Task_parentId_position_idx" ON "Task"("parentId", "position");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry over existing subtasks as tasks under their parent.
INSERT INTO "Task" ("id", "organizationId", "title", "priority", "status", "propertyId", "createdById", "completedAt", "completedById", "parentId", "position", "createdAt", "updatedAt")
SELECT 'sub' || s."id", s."organizationId", s."title", 'NORMAL', CASE WHEN s."done" THEN 'DONE' ELSE 'TODO' END::"TaskStatus",
       t."propertyId", t."createdById", s."doneAt", s."doneById", s."taskId", s."position", s."createdAt", s."createdAt"
FROM "TaskSubtask" s
JOIN "Task" t ON t."id" = s."taskId";

-- DropTable
DROP TABLE "TaskSubtask";
