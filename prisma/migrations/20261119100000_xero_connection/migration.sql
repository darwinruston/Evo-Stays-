-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "xeroInvoiceId" TEXT,
ADD COLUMN "xeroSyncedAt" TIMESTAMP(3),
ADD COLUMN "xeroPaymentId" TEXT,
ADD COLUMN "xeroError" TEXT;

-- CreateTable
CREATE TABLE "XeroConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "expenseAccountCode" TEXT,
    "bankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeroConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XeroConnection_organizationId_key" ON "XeroConnection"("organizationId");

-- AddForeignKey
ALTER TABLE "XeroConnection" ADD CONSTRAINT "XeroConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same per-company isolation as every other table that carries organizationId,
-- and the grants the restricted runtime role needs on a new table.
ALTER TABLE "XeroConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "XeroConnection" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "XeroConnection"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON "XeroConnection" TO evo_app;
