import type { PmsProvider } from "@prisma/client";

// One entry per credential value a provider's adapter needs (e.g. Lodgify
// needs just an API key; Hostaway/Guesty/OwnerRez need two fields each).
// Drives both the dynamic form in PmsCredentialFields.tsx (key becomes the
// `cred_<key>` input name) and the Record<string,string> shape stored,
// JSON-stringified and encrypted, in Client.pmsCredentials.
export type PmsCredentialField = {
  key: string;
  label: string;
  helpText?: string;
};

export type PmsCredentials = Record<string, string>;

// A property as the PMS's own API describes it -- the normalized shape the
// "Import from <provider>" picker works from, replacing what was Hostify's
// own HostifyListing type.
export type PmsListing = {
  externalId: string;
  name: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  propertyType: "APARTMENT" | "HOUSE" | "STUDIO" | "COTTAGE" | "OTHER";
  bedrooms: number | null;
  bathrooms: number | null;
  maxOccupancy: number | null;
};

// Whether a reservation should create, leave alone, or cancel a Clean --
// see each adapter's own status-classification step, since the raw status
// vocabulary is different per provider (Hostify's "accepted"/"cancelled"/...
// vs whatever Guesty, Hostaway, Lodgify or OwnerRez use).
export type PmsReservationOutcome = "active" | "cancelled" | "pending";

export type PmsReservation = {
  externalId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number | null;
  status: string;
  outcome: PmsReservationOutcome;
};

// One implementation per provider under src/lib/pms/, assembled into the
// registry in src/lib/pms/registry.ts. fetchCoverPhotoUrl is optional --
// only Hostify's adapter implements it in this first wave; every call site
// treats it as possibly undefined.
export type PmsAdapter = {
  provider: PmsProvider;
  displayName: string;
  credentialFields: PmsCredentialField[];
  listListings(credentials: PmsCredentials): Promise<PmsListing[]>;
  fetchReservations(
    credentials: PmsCredentials,
    listingId: string,
    startDate: Date,
    endDate: Date | null,
  ): Promise<PmsReservation[]>;
  fetchCoverPhotoUrl?(credentials: PmsCredentials, listingId: string): Promise<string | null>;
};
