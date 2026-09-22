-- CreateTable
CREATE TABLE "PropertyCleaner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyCleaner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropertyCleaner_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PropertyCleaner_cleanerId_idx" ON "PropertyCleaner"("cleanerId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCleaner_propertyId_cleanerId_key" ON "PropertyCleaner"("propertyId", "cleanerId");
