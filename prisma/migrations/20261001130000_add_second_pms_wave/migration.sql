-- Second wave of self-service PMS adapters (see src/lib/pms/) -- Hospitable,
-- Smoobu, Hostfully, Beds24. Each ALTER TYPE ... ADD VALUE is its own
-- statement (required by Postgres: a newly added enum value can't be used
-- in the same transaction that added it, but adding several values is
-- fine) -- nothing in this migration uses the new values yet, only later
-- application code does.
ALTER TYPE "PmsProvider" ADD VALUE 'HOSPITABLE';
ALTER TYPE "PmsProvider" ADD VALUE 'SMOOBU';
ALTER TYPE "PmsProvider" ADD VALUE 'HOSTFULLY';
ALTER TYPE "PmsProvider" ADD VALUE 'BEDS24';
