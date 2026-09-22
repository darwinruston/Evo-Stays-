-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LaundryLoad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cost" REAL,
    "facilityId" TEXT NOT NULL,
    "receiptPath" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" DATETIME,
    CONSTRAINT "LaundryLoad_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "LaundryFacility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LaundryLoad_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LaundryLoad" ("collectedAt", "cost", "createdAt", "facilityId", "id", "receiptPath", "recordedById") SELECT "collectedAt", "cost", "createdAt", "facilityId", "id", "receiptPath", "recordedById" FROM "LaundryLoad";
DROP TABLE "LaundryLoad";
ALTER TABLE "new_LaundryLoad" RENAME TO "LaundryLoad";
CREATE INDEX "LaundryLoad_recordedById_idx" ON "LaundryLoad"("recordedById");
CREATE INDEX "LaundryLoad_facilityId_idx" ON "LaundryLoad"("facilityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
