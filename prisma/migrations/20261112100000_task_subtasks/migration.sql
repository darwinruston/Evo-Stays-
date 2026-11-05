-- CreateTable
CREATE TABLE "TaskSubtask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskSubtask_organizationId_idx" ON "TaskSubtask"("organizationId");

-- CreateIndex
CREATE INDEX "TaskSubtask_taskId_position_idx" ON "TaskSubtask"("taskId", "position");

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubtask" ADD CONSTRAINT "TaskSubtask_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "TaskSubtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskSubtask" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TaskSubtask"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "TaskSubtask" TO evo_app;
