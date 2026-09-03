-- CreateTable
CREATE TABLE "Clean" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "requestedByClientId" TEXT,
    "clientNote" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" DATETIME,
    "arrivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Clean_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clean_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Clean_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Clean_requestedByClientId_fkey" FOREIGN KEY ("requestedByClientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CleanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cleanId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "note" TEXT,
    "arrivedAt" DATETIME,
    "departedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleanLog_cleanId_fkey" FOREIGN KEY ("cleanId") REFERENCES "Clean" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CleanLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CleanPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CleanPhoto_logId_fkey" FOREIGN KEY ("logId") REFERENCES "CleanLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Clean_propertyId_idx" ON "Clean"("propertyId");

-- CreateIndex
CREATE INDEX "Clean_assignedToId_idx" ON "Clean"("assignedToId");

-- CreateIndex
CREATE INDEX "Clean_scheduledFor_idx" ON "Clean"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "CleanLog_cleanId_key" ON "CleanLog"("cleanId");

-- CreateIndex
CREATE INDEX "CleanPhoto_logId_idx" ON "CleanPhoto"("logId");
