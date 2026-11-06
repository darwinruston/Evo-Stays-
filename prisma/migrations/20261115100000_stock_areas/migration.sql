-- CreateTable
CREATE TABLE "StockArea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockArea_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN "areaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StockArea_organizationId_name_key" ON "StockArea"("organizationId", "name");

-- CreateIndex
CREATE INDEX "StockArea_organizationId_position_idx" ON "StockArea"("organizationId", "position");

-- AddForeignKey
ALTER TABLE "StockArea" ADD CONSTRAINT "StockArea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "StockArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "StockArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockArea" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StockArea"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "StockArea" TO evo_app;
