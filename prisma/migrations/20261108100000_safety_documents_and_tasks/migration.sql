-- AlterTable
ALTER TABLE "PropertySafetyCheck" ADD COLUMN "taskCreatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "safetyCheckId" TEXT;

-- CreateTable
CREATE TABLE "SafetyDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "completedOn" TIMESTAMP(3),
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SafetyDocument_organizationId_idx" ON "SafetyDocument"("organizationId");

-- CreateIndex
CREATE INDEX "SafetyDocument_checkId_createdAt_idx" ON "SafetyDocument"("checkId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_safetyCheckId_idx" ON "Task"("safetyCheckId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_safetyCheckId_fkey" FOREIGN KEY ("safetyCheckId") REFERENCES "PropertySafetyCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyDocument" ADD CONSTRAINT "SafetyDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyDocument" ADD CONSTRAINT "SafetyDocument_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "PropertySafetyCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyDocument" ADD CONSTRAINT "SafetyDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "SafetyDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SafetyDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SafetyDocument"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "SafetyDocument" TO evo_app;
