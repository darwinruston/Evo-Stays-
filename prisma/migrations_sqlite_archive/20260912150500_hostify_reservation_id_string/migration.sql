-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SyncedHostifyReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "hostifyReservationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "guests" INTEGER,
    "cleanId" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncedHostifyReservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SyncedHostifyReservation_cleanId_fkey" FOREIGN KEY ("cleanId") REFERENCES "Clean" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SyncedHostifyReservation" ("cancelled", "checkIn", "checkOut", "cleanId", "createdAt", "guests", "hostifyReservationId", "id", "propertyId", "status", "updatedAt") SELECT "cancelled", "checkIn", "checkOut", "cleanId", "createdAt", "guests", "hostifyReservationId", "id", "propertyId", "status", "updatedAt" FROM "SyncedHostifyReservation";
DROP TABLE "SyncedHostifyReservation";
ALTER TABLE "new_SyncedHostifyReservation" RENAME TO "SyncedHostifyReservation";
CREATE UNIQUE INDEX "SyncedHostifyReservation_cleanId_key" ON "SyncedHostifyReservation"("cleanId");
CREATE UNIQUE INDEX "SyncedHostifyReservation_propertyId_hostifyReservationId_key" ON "SyncedHostifyReservation"("propertyId", "hostifyReservationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
