-- AlterTable
ALTER TABLE "User" ADD COLUMN "hourlyRate" REAL;

-- CreateTable
CREATE TABLE "BillingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "cadence" TEXT NOT NULL DEFAULT 'MONTHLY',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cleanerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "hourlyRate" REAL NOT NULL,
    "totalHours" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "cleanLogId" TEXT NOT NULL,
    "arrivedAt" DATETIME NOT NULL,
    "departedAt" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceLine_cleanLogId_fkey" FOREIGN KEY ("cleanLogId") REFERENCES "CleanLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Invoice_cleanerId_idx" ON "Invoice"("cleanerId");

-- CreateIndex
CREATE INDEX "Invoice_propertyId_idx" ON "Invoice"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_cleanLogId_key" ON "InvoiceLine"("cleanLogId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
