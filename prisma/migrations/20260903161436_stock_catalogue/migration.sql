-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PropertyStockLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "parQty" INTEGER NOT NULL,
    "onHandQty" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropertyStockLevel_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropertyStockLevel_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "logId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "countedQty" INTEGER NOT NULL,
    "restockedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockUsageLog_logId_fkey" FOREIGN KEY ("logId") REFERENCES "CleanLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockUsageLog_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_name_key" ON "StockItem"("name");

-- CreateIndex
CREATE INDEX "PropertyStockLevel_propertyId_idx" ON "PropertyStockLevel"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyStockLevel_propertyId_stockItemId_key" ON "PropertyStockLevel"("propertyId", "stockItemId");

-- CreateIndex
CREATE INDEX "StockUsageLog_logId_idx" ON "StockUsageLog"("logId");

-- CreateIndex
CREATE UNIQUE INDEX "StockUsageLog_logId_stockItemId_key" ON "StockUsageLog"("logId", "stockItemId");
