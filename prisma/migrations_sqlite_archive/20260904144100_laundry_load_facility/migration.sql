/*
  Warnings:

  - Added the required column `facility` to the `LaundryLoad` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LaundryLoad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cost" REAL NOT NULL,
    "facility" TEXT NOT NULL,
    "receiptPath" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" DATETIME,
    CONSTRAINT "LaundryLoad_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LaundryLoad" ("collectedAt", "cost", "createdAt", "id", "receiptPath", "recordedById") SELECT "collectedAt", "cost", "createdAt", "id", "receiptPath", "recordedById" FROM "LaundryLoad";
DROP TABLE "LaundryLoad";
ALTER TABLE "new_LaundryLoad" RENAME TO "LaundryLoad";
CREATE INDEX "LaundryLoad_recordedById_idx" ON "LaundryLoad"("recordedById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
