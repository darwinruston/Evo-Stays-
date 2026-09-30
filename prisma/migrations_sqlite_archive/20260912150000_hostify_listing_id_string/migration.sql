-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "type" TEXT NOT NULL DEFAULT 'APARTMENT',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "maxOccupancy" INTEGER,
    "sofaBedSleeps" INTEGER,
    "accessOptions" JSONB,
    "accessNotes" TEXT,
    "notes" TEXT,
    "minBillableHours" REAL,
    "syncHorizonDays" INTEGER,
    "hostifyListingId" TEXT,
    "hostifyLastSyncedAt" DATETIME,
    "hostifyLastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Property" ("accessNotes", "accessOptions", "address", "bathrooms", "bedrooms", "clientId", "createdAt", "hostifyLastSyncError", "hostifyLastSyncedAt", "hostifyListingId", "id", "latitude", "longitude", "maxOccupancy", "minBillableHours", "name", "notes", "sofaBedSleeps", "syncHorizonDays", "type", "updatedAt") SELECT "accessNotes", "accessOptions", "address", "bathrooms", "bedrooms", "clientId", "createdAt", "hostifyLastSyncError", "hostifyLastSyncedAt", "hostifyListingId", "id", "latitude", "longitude", "maxOccupancy", "minBillableHours", "name", "notes", "sofaBedSleeps", "syncHorizonDays", "type", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE UNIQUE INDEX "Property_hostifyListingId_key" ON "Property"("hostifyListingId");
CREATE INDEX "Property_clientId_idx" ON "Property"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
