-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'LINEN_ISSUE';

-- CreateTable
CREATE TABLE "LinenVisit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cleanId" TEXT NOT NULL,
    "chosenArrivalAt" TIMESTAMP(3),
    "issueNote" TEXT,
    "issueRaisedAt" TIMESTAMP(3),
    "issueResolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinenVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinenVisit_cleanId_key" ON "LinenVisit"("cleanId");

-- CreateIndex
CREATE INDEX "LinenVisit_organizationId_idx" ON "LinenVisit"("organizationId");

-- AddForeignKey
ALTER TABLE "LinenVisit" ADD CONSTRAINT "LinenVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinenVisit" ADD CONSTRAINT "LinenVisit_cleanId_fkey" FOREIGN KEY ("cleanId") REFERENCES "Clean"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "LinenVisit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LinenVisit" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LinenVisit"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "LinenVisit" TO evo_app;
