-- Stock areas were set up by hand per company; the order a cleaner checks stock
-- in is now worked out automatically from the item names, so the tables go.

-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT IF EXISTS "StockItem_areaId_fkey";

-- AlterTable
ALTER TABLE "StockItem" DROP COLUMN IF EXISTS "areaId";

-- DropTable
DROP TABLE IF EXISTS "StockArea";
