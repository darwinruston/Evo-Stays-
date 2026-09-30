-- AlterTable
ALTER TABLE "Client" ADD COLUMN "hostifyApiKey" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "hostifyLastSyncError" TEXT;
ALTER TABLE "Property" ADD COLUMN "hostifyLastSyncedAt" DATETIME;
ALTER TABLE "Property" ADD COLUMN "hostifyListingId" INTEGER;

-- CreateTable
CREATE TABLE "SyncedHostifyReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "hostifyReservationId" INTEGER NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "SyncedHostifyReservation_cleanId_key" ON "SyncedHostifyReservation"("cleanId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedHostifyReservation_propertyId_hostifyReservationId_key" ON "SyncedHostifyReservation"("propertyId", "hostifyReservationId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_hostifyListingId_key" ON "Property"("hostifyListingId");
