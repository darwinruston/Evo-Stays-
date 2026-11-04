-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'TASK_DUE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "dueSoonNotifiedAt" TIMESTAMP(3),
ADD COLUMN "overdueNotifiedAt" TIMESTAMP(3);
