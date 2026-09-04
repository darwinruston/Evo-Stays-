-- CreateTable
CREATE TABLE "PropertyCalendarFeed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyCalendarFeed_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncedBookingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "externalUid" TEXT NOT NULL,
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "cleanId" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncedBookingEvent_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "PropertyCalendarFeed" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SyncedBookingEvent_cleanId_fkey" FOREIGN KEY ("cleanId") REFERENCES "Clean" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PropertyCalendarFeed_propertyId_idx" ON "PropertyCalendarFeed"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedBookingEvent_cleanId_key" ON "SyncedBookingEvent"("cleanId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedBookingEvent_feedId_externalUid_key" ON "SyncedBookingEvent"("feedId", "externalUid");
