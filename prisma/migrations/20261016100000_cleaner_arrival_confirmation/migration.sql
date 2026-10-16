-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'ARRIVAL_UNCONFIRMED';

-- AlterTable
ALTER TABLE "Clean" ADD COLUMN "plannedArrivalAt" TIMESTAMP(3),
ADD COLUMN "arrivalReminderNotifiedAt" TIMESTAMP(3);
