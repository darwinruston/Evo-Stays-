-- Generalizes the previously Hostify-only PMS integration into a
-- provider-agnostic framework (see src/lib/pms/). Column/table renames
-- preserve data, indexes, foreign keys and the RLS policy already on
-- "SyncedHostifyReservation" (Postgres carries all of these through a
-- RENAME automatically). "Client"."hostifyApiKey" is intentionally left in
-- place here -- it still holds the only copy of each client's live Hostify
-- key, and gets migrated into the new "pmsCredentials" shape by the
-- one-off scripts/migrate-pms-credentials.ts script (which needs the live
-- ENCRYPTION_KEY to decrypt/re-encrypt, so it can't be done in plain SQL).
-- A trailing migration drops the old column once that script has run and
-- Stage 1 is verified.

-- CreateEnum
CREATE TYPE "PmsProvider" AS ENUM ('HOSTIFY', 'GUESTY', 'HOSTAWAY', 'LODGIFY', 'OWNERREZ');

-- AlterTable: Client gets the new generic credential shape alongside the
-- still-present hostifyApiKey.
ALTER TABLE "Client" ADD COLUMN "pmsProvider" "PmsProvider";
ALTER TABLE "Client" ADD COLUMN "pmsCredentials" TEXT;

-- Backfill: every client with a stored Hostify key is, by definition,
-- already connected via Hostify.
UPDATE "Client" SET "pmsProvider" = 'HOSTIFY' WHERE "hostifyApiKey" IS NOT NULL;

-- AlterTable: Property's three Hostify-specific columns become generic.
ALTER TABLE "Property" ADD COLUMN "pmsProvider" "PmsProvider";
ALTER TABLE "Property" RENAME COLUMN "hostifyListingId" TO "pmsListingId";
ALTER TABLE "Property" RENAME COLUMN "hostifyLastSyncedAt" TO "pmsLastSyncedAt";
ALTER TABLE "Property" RENAME COLUMN "hostifyLastSyncError" TO "pmsLastSyncError";

-- Backfill, same reasoning as Client above.
UPDATE "Property" SET "pmsProvider" = 'HOSTIFY' WHERE "pmsListingId" IS NOT NULL;

-- The old uniqueness constraint only worked because exactly one provider
-- existed -- listing ids are only unique *within* one provider's own
-- numbering, so the new one includes pmsProvider to avoid a cross-provider
-- collision.
DROP INDEX "Property_organizationId_hostifyListingId_key";
CREATE UNIQUE INDEX "Property_organizationId_pmsProvider_pmsListingId_key" ON "Property"("organizationId", "pmsProvider", "pmsListingId");

-- RenameTable: Postgres carries indexes, foreign keys, and the
-- tenant_isolation RLS policy through automatically.
ALTER TABLE "SyncedHostifyReservation" RENAME TO "SyncedPmsReservation";
ALTER TABLE "SyncedPmsReservation" RENAME COLUMN "hostifyReservationId" TO "externalReservationId";

ALTER INDEX "SyncedHostifyReservation_pkey" RENAME TO "SyncedPmsReservation_pkey";
ALTER INDEX "SyncedHostifyReservation_cleanId_key" RENAME TO "SyncedPmsReservation_cleanId_key";
ALTER INDEX "SyncedHostifyReservation_organizationId_idx" RENAME TO "SyncedPmsReservation_organizationId_idx";
ALTER INDEX "SyncedHostifyReservation_propertyId_hostifyReservationId_key" RENAME TO "SyncedPmsReservation_propertyId_externalReservationId_key";

-- Cosmetic (Postgres doesn't care that a constraint name embeds the old
-- table name), but kept in step with the rest so a future introspection
-- or diff doesn't flag drift that isn't really there.
ALTER TABLE "SyncedPmsReservation" RENAME CONSTRAINT "SyncedHostifyReservation_organizationId_fkey" TO "SyncedPmsReservation_organizationId_fkey";
ALTER TABLE "SyncedPmsReservation" RENAME CONSTRAINT "SyncedHostifyReservation_propertyId_fkey" TO "SyncedPmsReservation_propertyId_fkey";
ALTER TABLE "SyncedPmsReservation" RENAME CONSTRAINT "SyncedHostifyReservation_cleanId_fkey" TO "SyncedPmsReservation_cleanId_fkey";
