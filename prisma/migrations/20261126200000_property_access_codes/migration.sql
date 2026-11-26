-- The code for a property's key safe, lockbox or keypad, apart from the free
-- text notes so it can be shown clearly.
ALTER TABLE "Property" ADD COLUMN "accessCodes" JSONB;
