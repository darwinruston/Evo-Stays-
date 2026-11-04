-- CreateEnum
CREATE TYPE "TaskRepeat" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SIX_MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "repeat" "TaskRepeat",
ADD COLUMN "previousId" TEXT;

-- CreateIndex
CREATE INDEX "Task_previousId_idx" ON "Task"("previousId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
