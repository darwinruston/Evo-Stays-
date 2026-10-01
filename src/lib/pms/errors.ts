// Thrown by an adapter's listListings/fetchReservations on a 401/403, so the
// generic sync.ts and credential-testing call sites can point staff at the
// stored credentials specifically, rather than a generic message that could
// mean anything from a typo'd listing id to an outage. Replaces what was a
// per-provider HostifyAuthError.
export class PmsAuthError extends Error {}
