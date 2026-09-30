-- Login authenticates by email alone, before the app knows which
-- organization the account belongs to -- a legitimately cross-tenant read
-- (User.email is globally unique platform-wide; there's no org picker at
-- login). The tenant_isolation policy on "User" (see the row-level-security
-- migration) would otherwise deny this lookup entirely, since no
-- app.current_organization_id is set yet at that point.
--
-- Rather than a broad bypass (BYPASSRLS on some role, which would ignore
-- RLS on every table, not just this one lookup), this grants a dedicated,
-- narrowly-scoped role SELECT-only access to just this table, via an
-- additional permissive policy scoped to that role alone (Postgres ORs
-- multiple permissive policies together, so this doesn't loosen
-- tenant_isolation for anyone else). This role has no other grants: it
-- cannot write anything, and cannot read any other table.
CREATE ROLE evo_auth LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
GRANT USAGE ON SCHEMA public TO evo_auth;
GRANT SELECT ON "User" TO evo_auth;
CREATE POLICY auth_lookup ON "User" FOR SELECT TO evo_auth USING (true);
