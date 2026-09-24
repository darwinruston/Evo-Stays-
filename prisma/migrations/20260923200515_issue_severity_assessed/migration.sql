-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "cleanId" TEXT,
    "reportedById" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "severityReason" TEXT,
    "severityOverridden" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_cleanId_fkey" FOREIGN KEY ("cleanId") REFERENCES "Clean" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("category", "cleanId", "createdAt", "description", "id", "propertyId", "reportedById", "resolutionNote", "resolvedAt", "resolvedById", "severity", "status", "updatedAt") SELECT "category", "cleanId", "createdAt", "description", "id", "propertyId", "reportedById", "resolutionNote", "resolvedAt", "resolvedById", "severity", "status", "updatedAt" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
CREATE INDEX "Issue_propertyId_status_idx" ON "Issue"("propertyId", "status");
CREATE INDEX "Issue_status_idx" ON "Issue"("status");
CREATE INDEX "Issue_cleanId_idx" ON "Issue"("cleanId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
