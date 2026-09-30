-- Replaces the parQty/onHandQty pair (and StockUsageLog's matching
-- countedQty/restockedQty) with a single `band` column -- the level a
-- cleaner or staff member actually reads off a shelf (High/Medium/Low/None),
-- with no numeric par to configure first and no fabricated on-hand count
-- behind it. Also drops StockItem.usagePerGuestNight, which only existed to
-- drive a prediction against the old numeric on-hand figure.
--
-- Existing rows are converted, not dropped: PropertyStockLevel.band is
-- computed from its own onHandQty/parQty using the same thirds-of-par
-- thresholds the app already displayed (see stockLevelBand in
-- src/lib/stock.ts, before this migration). StockUsageLog.band is computed
-- the same way from its countedQty against the par that was in effect on
-- that property for that item at the time -- found by joining back through
-- CleanLog -> Clean -> Property, since a usage log row doesn't carry a par
-- of its own. This has to happen *before* PropertyStockLevel is rebuilt
-- below, while its old parQty column still exists to join against. A usage
-- log whose property no longer configures that item (or never matches) has
-- nothing to compare against, so it's given "MEDIUM" -- a neutral read
-- rather than a guess at either extreme, for what by then is just a
-- historical display row on a past visit, not anything the app still acts on.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- StockUsageLog first, while the old PropertyStockLevel columns are still there to join against.
CREATE TABLE "new_StockUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockUsageLog_logId_fkey" FOREIGN KEY ("logId") REFERENCES "CleanLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockUsageLog_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockUsageLog" ("id", "logId", "stockItemId", "band", "createdAt")
SELECT
  u."id", u."logId", u."stockItemId",
  CASE
    WHEN psl."parQty" IS NULL THEN 'MEDIUM'
    WHEN u."countedQty" <= 0 THEN 'NONE'
    WHEN u."countedQty" * 3 >= psl."parQty" * 2 THEN 'HIGH'
    WHEN u."countedQty" * 3 >= psl."parQty" * 1 THEN 'MEDIUM'
    ELSE 'LOW'
  END,
  u."createdAt"
FROM "StockUsageLog" u
LEFT JOIN "CleanLog" cl ON cl."id" = u."logId"
LEFT JOIN "Clean" c ON c."id" = cl."cleanId"
LEFT JOIN "PropertyStockLevel" psl ON psl."propertyId" = c."propertyId" AND psl."stockItemId" = u."stockItemId";
DROP TABLE "StockUsageLog";
ALTER TABLE "new_StockUsageLog" RENAME TO "StockUsageLog";
CREATE INDEX "StockUsageLog_logId_idx" ON "StockUsageLog"("logId");
CREATE UNIQUE INDEX "StockUsageLog_logId_stockItemId_key" ON "StockUsageLog"("logId", "stockItemId");

-- PropertyStockLevel, computed from its own onHandQty/parQty.
CREATE TABLE "new_PropertyStockLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyStockLevel_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropertyStockLevel_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PropertyStockLevel" ("id", "propertyId", "stockItemId", "band", "createdAt", "updatedAt")
SELECT
  "id", "propertyId", "stockItemId",
  CASE
    WHEN "onHandQty" <= 0 THEN 'NONE'
    WHEN "onHandQty" * 3 >= "parQty" * 2 THEN 'HIGH'
    WHEN "onHandQty" * 3 >= "parQty" * 1 THEN 'MEDIUM'
    ELSE 'LOW'
  END,
  "createdAt", "updatedAt"
FROM "PropertyStockLevel";
DROP TABLE "PropertyStockLevel";
ALTER TABLE "new_PropertyStockLevel" RENAME TO "PropertyStockLevel";
CREATE INDEX "PropertyStockLevel_propertyId_idx" ON "PropertyStockLevel"("propertyId");
CREATE UNIQUE INDEX "PropertyStockLevel_propertyId_stockItemId_key" ON "PropertyStockLevel"("propertyId", "stockItemId");

-- StockItem, dropping usagePerGuestNight.
CREATE TABLE "new_StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StockItem" ("id", "name", "unit", "active", "createdAt", "updatedAt")
SELECT "id", "name", "unit", "active", "createdAt", "updatedAt" FROM "StockItem";
DROP TABLE "StockItem";
ALTER TABLE "new_StockItem" RENAME TO "StockItem";
CREATE UNIQUE INDEX "StockItem_name_key" ON "StockItem"("name");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
