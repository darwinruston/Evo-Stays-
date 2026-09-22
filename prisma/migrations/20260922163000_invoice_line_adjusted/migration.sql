-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "cleanLogId" TEXT NOT NULL,
    "arrivedAt" DATETIME NOT NULL,
    "departedAt" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "adjusted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceLine_cleanLogId_fkey" FOREIGN KEY ("cleanLogId") REFERENCES "CleanLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceLine" ("amount", "arrivedAt", "cleanLogId", "departedAt", "hours", "id", "invoiceId") SELECT "amount", "arrivedAt", "cleanLogId", "departedAt", "hours", "id", "invoiceId" FROM "InvoiceLine";
DROP TABLE "InvoiceLine";
ALTER TABLE "new_InvoiceLine" RENAME TO "InvoiceLine";
CREATE UNIQUE INDEX "InvoiceLine_cleanLogId_key" ON "InvoiceLine"("cleanLogId");
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

