/*
  Warnings:

  - You are about to drop the column `facility` on the `LaundryLoad` table. All the data in the column will be lost.
  - Added the required column `facilityId` to the `LaundryLoad` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "LaundryFacility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LaundryLoad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cost" REAL NOT NULL,
    "facilityId" TEXT NOT NULL,
    "receiptPath" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedAt" DATETIME,
    CONSTRAINT "LaundryLoad_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "LaundryFacility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LaundryLoad_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LaundryLoad" ("collectedAt", "cost", "createdAt", "id", "receiptPath", "recordedById") SELECT "collectedAt", "cost", "createdAt", "id", "receiptPath", "recordedById" FROM "LaundryLoad";
DROP TABLE "LaundryLoad";
ALTER TABLE "new_LaundryLoad" RENAME TO "LaundryLoad";
CREATE INDEX "LaundryLoad_recordedById_idx" ON "LaundryLoad"("recordedById");
CREATE INDEX "LaundryLoad_facilityId_idx" ON "LaundryLoad"("facilityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LaundryFacility_name_key" ON "LaundryFacility"("name");
