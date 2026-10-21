-- With the window now closing a fixed time before the clean ends, a 30 minute
-- handover left almost no window on a short clean. 15 is a better starting point.
ALTER TABLE "LaundryFacility" ALTER COLUMN "handoverMinutes" SET DEFAULT 15;
