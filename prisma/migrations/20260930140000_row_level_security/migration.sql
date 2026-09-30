-- Row-Level Security: the real backstop behind per-organization tenant
-- isolation (see src/lib/prisma.ts for the scoped client that sets
-- app.current_organization_id, which this policy reads). FORCE is
-- required, not just ENABLE -- without it, RLS is bypassed for whichever
-- Postgres role owns the table, which is this app's own connection role
-- in a simple single-role deployment. current_setting(..., true) returns
-- NULL rather than erroring when unset, which the policy's = comparison
-- then evaluates false for -- i.e. deny by default, not open by default,
-- if a query somehow runs with no organization scope set at all.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Client"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Property"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "PropertyImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyImage" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PropertyImage"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "Clean" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Clean" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Clean"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "CleanLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CleanLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CleanLog"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "CleanPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CleanPhoto" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CleanPhoto"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StockItem"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "PropertyStockLevel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyStockLevel" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PropertyStockLevel"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "PropertyCleaner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyCleaner" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PropertyCleaner"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "CleanerUnavailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CleanerUnavailability" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CleanerUnavailability"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "StockUsageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockUsageLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StockUsageLog"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "BillingSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillingSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BillingSettings"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invoice"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceLine" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InvoiceLine"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "LaundryLoad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaundryLoad" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LaundryLoad"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "LaundryFacility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaundryFacility" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LaundryFacility"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "PropertyCalendarFeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyCalendarFeed" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PropertyCalendarFeed"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "SyncedBookingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncedBookingEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SyncedBookingEvent"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "SyncedHostifyReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncedHostifyReservation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SyncedHostifyReservation"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Issue"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "IssuePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IssuePhoto" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "IssuePhoto"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "PropertyChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyChecklistItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PropertyChecklistItem"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

