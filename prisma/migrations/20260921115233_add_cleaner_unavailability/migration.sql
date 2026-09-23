-- CreateTable
CREATE TABLE "CleanerUnavailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cleanerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleanerUnavailability_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CleanerUnavailability_cleanerId_date_key" ON "CleanerUnavailability"("cleanerId", "date");
