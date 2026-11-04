-- AlterTable
ALTER TABLE "Issue" ADD COLUMN "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Issue_taskId_idx" ON "Issue"("taskId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
