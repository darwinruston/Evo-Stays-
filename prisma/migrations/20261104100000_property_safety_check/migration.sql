-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'SAFETY_CHECK_DUE';

-- CreateTable
CREATE TABLE "PropertySafetyCheck" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "templateKey" TEXT,
    "title" TEXT NOT NULL,
    "intervalMonths" INTEGER NOT NULL,
    "lastCompletedOn" TIMESTAMP(3),
    "dueOn" TIMESTAMP(3),
    "note" TEXT,
    "notApplicable" BOOLEAN NOT NULL DEFAULT false,
    "dueSoonNotifiedAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySafetyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertySafetyCheck_propertyId_templateKey_key" ON "PropertySafetyCheck"("propertyId", "templateKey");

-- CreateIndex
CREATE INDEX "PropertySafetyCheck_organizationId_idx" ON "PropertySafetyCheck"("organizationId");

-- CreateIndex
CREATE INDEX "PropertySafetyCheck_propertyId_idx" ON "PropertySafetyCheck"("propertyId");

-- CreateIndex
CREATE INDEX "PropertySafetyCheck_dueOn_idx" ON "PropertySafetyCheck"("dueOn");

-- AddForeignKey
ALTER TABLE "PropertySafetyCheck" ADD CONSTRAINT "PropertySafetyCheck_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySafetyCheck" ADD CONSTRAINT "PropertySafetyCheck_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "PropertySafetyCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertySafetyCheck" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PropertySafetyCheck"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "PropertySafetyCheck" TO evo_app;
