-- CreateTable
CREATE TABLE "LaundryLoad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cost" REAL NOT NULL,
    "receiptPath" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaundryLoad_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CleanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cleanId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "note" TEXT,
    "arrivedAt" DATETIME,
    "departedAt" DATETIME,
    "laundryLoadId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleanLog_cleanId_fkey" FOREIGN KEY ("cleanId") REFERENCES "Clean" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CleanLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CleanLog_laundryLoadId_fkey" FOREIGN KEY ("laundryLoadId") REFERENCES "LaundryLoad" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CleanLog" ("arrivedAt", "cleanId", "createdAt", "departedAt", "id", "note", "recordedById") SELECT "arrivedAt", "cleanId", "createdAt", "departedAt", "id", "note", "recordedById" FROM "CleanLog";
DROP TABLE "CleanLog";
ALTER TABLE "new_CleanLog" RENAME TO "CleanLog";
CREATE UNIQUE INDEX "CleanLog_cleanId_key" ON "CleanLog"("cleanId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LaundryLoad_recordedById_idx" ON "LaundryLoad"("recordedById");
