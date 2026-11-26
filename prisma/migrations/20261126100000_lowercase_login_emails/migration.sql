-- Logins are now matched without regard to capitals (see src/lib/emailAddress.ts),
-- so existing addresses are stored in lower case. An address is left exactly as
-- it is if another login already has the same one in different capitals: those
-- two have to be sorted out by hand rather than merged or broken here.
--
-- "User" has row-level security forced on its owner too, which would silently
-- update nothing, so it is lifted for this one statement and put straight back.
ALTER TABLE "User" NO FORCE ROW LEVEL SECURITY;

UPDATE "User" AS u
SET "email" = lower(btrim(u."email"))
WHERE u."email" <> lower(btrim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS other
    WHERE other."id" <> u."id" AND lower(btrim(other."email")) = lower(btrim(u."email"))
  );

ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
