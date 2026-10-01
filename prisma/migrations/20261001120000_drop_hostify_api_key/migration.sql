-- Trailing half of the PMS generalization (see the 20261001110000 migration
-- and scripts/migrate-pms-credentials.ts). Safe now that script has run
-- against every environment -- confirmed against the local dev database: it
-- found zero clients with a stored hostifyApiKey left to migrate (today's
-- only live-connected client went through the new ClientForm UI directly,
-- which writes pmsCredentials from the start).

ALTER TABLE "Client" DROP COLUMN "hostifyApiKey";
