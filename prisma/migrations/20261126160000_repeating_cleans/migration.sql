-- CreateEnum
CREATE TYPE "CleanFrequency" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'FOUR_WEEKLY', 'MONTHLY', 'QUARTERLY');

-- AlterTable
ALTER TABLE "Clean" ADD COLUMN "seriesId" TEXT;

-- CreateTable
CREATE TABLE "CleanSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "frequency" "CleanFrequency" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "guestCount" INTEGER,
    "instructions" TEXT,
    "nextIndex" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleanSeries_organizationId_idx" ON "CleanSeries"("organizationId");
CREATE INDEX "CleanSeries_propertyId_idx" ON "CleanSeries"("propertyId");
CREATE INDEX "Clean_seriesId_idx" ON "Clean"("seriesId");

-- AddForeignKey
ALTER TABLE "Clean" ADD CONSTRAINT "Clean_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CleanSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CleanSeries" ADD CONSTRAINT "CleanSeries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleanSeries" ADD CONSTRAINT "CleanSeries_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleanSeries" ADD CONSTRAINT "CleanSeries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CleanSeries" ADD CONSTRAINT "CleanSeries_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "CleanSeries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CleanSeries" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CleanSeries"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "CleanSeries" TO evo_app;
