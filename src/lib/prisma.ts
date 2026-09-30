import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// The raw, unscoped client -- every organization's data, no filtering. Only
// ever used where that's actually correct: the platform-owner Organizations
// page (spans every tenant by design), the background sync loop's outer
// per-Organization iteration (src/lib/runAllSyncs.ts, before it has picked
// an organization to scope into), and building the scoped clients below.
// Everywhere else (any page, action or shared lib helper working with one
// organization's data) should receive a scoped `db` instead -- see
// scopedDb().
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type AnyRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value);
}

// Prisma Client Extensions only see the outermost operation's args -- a
// nested write, e.g. issue.create({ data: { photos: { create: [...] } } }),
// never surfaces as a create operation of its own, so without this the
// nested photo row would be created with no organizationId at all. Walks
// down through every create/createMany.data/connectOrCreate.create it finds
// and stamps organizationId onto each one, however deep. Leaves `where`,
// `select`, `include`, `connect` and `update` alone -- those reference or
// change existing rows, which already carry the right organizationId (or, in
// the case of `connect`, must already belong to this organization for the
// relation to be valid, which RLS itself enforces).
function withOrganizationId(data: unknown, organizationId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => withOrganizationId(item, organizationId));
  }
  if (!isPlainObject(data)) return data;

  const result: AnyRecord = { ...data, organizationId };
  for (const [key, value] of Object.entries(result)) {
    if (!isPlainObject(value)) continue;
    const nested: AnyRecord = { ...value };
    let changed = false;

    if ("create" in nested) {
      nested.create = withOrganizationId(nested.create, organizationId);
      changed = true;
    }
    if (isPlainObject(nested.createMany) && "data" in nested.createMany) {
      nested.createMany = {
        ...nested.createMany,
        data: withOrganizationId((nested.createMany as AnyRecord).data, organizationId),
      };
      changed = true;
    }
    if ("connectOrCreate" in nested) {
      const connectOrCreate = nested.connectOrCreate;
      const stamp = (entry: unknown) =>
        isPlainObject(entry) ? { ...entry, create: withOrganizationId(entry.create, organizationId) } : entry;
      nested.connectOrCreate = Array.isArray(connectOrCreate)
        ? connectOrCreate.map(stamp)
        : stamp(connectOrCreate);
      changed = true;
    }

    if (changed) result[key] = nested;
  }
  return result;
}

// Every table this can be called for has an organizationId column -- Organization
// itself is the one model that doesn't, and is never created through a scoped
// client anyway (there's no organization to scope into yet when one is being
// created).
const UNSCOPED_MODELS = new Set(["Organization"]);

export type ScopedPrismaClient = ReturnType<typeof scopedDb>;

// Builds a per-request Prisma client scoped to one organization -- the two
// halves of tenant isolation described in the multi-tenant plan:
//
// 1. Every query this client runs is issued inside its own transaction that
//    first sets the Postgres session variable app.current_organization_id
//    (via set_config(..., true), i.e. local to that one transaction), so the
//    Row-Level Security policies on every scoped table (see the RLS
//    migration) can see which organization is asking and filter accordingly.
//    This is the real backstop -- true even for a raw query that bypasses
//    this extension entirely.
// 2. create/createMany/upsert calls get organizationId stamped onto their
//    payload automatically (including nested writes, see withOrganizationId
//    above), so a page or action never has to remember to set it by hand and
//    can't accidentally write a row into the wrong organization -- or, worse,
//    a row RLS would then hide from everyone, including its own organization.
//
// Layer 2 is ergonomics and a write-time safety net; layer 1 is the actual
// guarantee. Neither replaces the other.
export function scopedDb(organizationId: string) {
  return prisma.$extends({
    name: "organization-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scopedArgs = { ...(args as AnyRecord) };

          if (!UNSCOPED_MODELS.has(model)) {
            if ((operation === "create" || operation === "createMany") && "data" in scopedArgs) {
              scopedArgs.data = withOrganizationId(scopedArgs.data, organizationId);
            }
            if (operation === "upsert" && "create" in scopedArgs) {
              scopedArgs.create = withOrganizationId(scopedArgs.create, organizationId);
            }
          }

          // Array form of $transaction batches these two onto the same
          // connection as one Postgres transaction -- the set_config has to
          // land in the same transaction as the query it's guarding, or RLS
          // sees no organization and (per the DENY-by-default policies) the
          // query returns nothing.
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, TRUE)`,
            query(scopedArgs as never),
          ]);
          return result;
        },
      },
    },
  });
}
