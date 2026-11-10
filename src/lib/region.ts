import * as React from "react";

// What changes with the country a company says it works in. A company picks
// its country once (Settings, or the first-run questions) and the things below
// follow: how money and dates are written, the clock, what an address code is
// called, the tax name, which health and safety starter list it gets, and
// which address lookup is used.
//
// Not here yet: the time zone. The app still reads and shows times in the
// time zone of the server it runs on (what is "today", the time a cleaner
// types, the time shown back), so changing only how times are DISPLAYED would
// shift them. A per-company time zone needs the whole scheduling layer moving
// over to it; until then a server for a company in another zone runs with that
// zone (the TZ setting) and everything stays consistent.

// Which starter list of health and safety checks a country gets. "uk" is the
// UK legislation the first version was built around; "generic" is a neutral
// list that makes no claim about any country's law. See src/lib/safetyChecks.ts.
export type SafetyPack = "uk" | "generic";

// Which service turns an address into a place on a map, for the linen van's
// drive-time estimates. "uk-postcodes" only understands UK postcodes; "none"
// means the estimate falls back to a typical drive time.
export type AddressLookup = "uk-postcodes" | "none";

export type CountryProfile = {
  code: string;
  name: string;
  currency: string;
  // The English variant used to write dates and numbers: the order of day and
  // month, and 12 or 24-hour time. The app itself is in English everywhere.
  locale: "en-GB" | "en-IE" | "en-US" | "en-CA" | "en-AU" | "en-NZ";
  dateOrder: "dmy" | "mdy";
  // What the code on an address is called here.
  postcodeLabel: string;
  taxLabel: string;
  safetyPack: SafetyPack;
  lookup: AddressLookup;
};

// A starting set, easy to extend: add a line. Anything not listed can still
// pick "Other" and gets the neutral defaults.
export const COUNTRIES: CountryProfile[] = [
  { code: "GB", name: "United Kingdom", currency: "GBP", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postcode", taxLabel: "VAT", safetyPack: "uk", lookup: "uk-postcodes" },
  { code: "IE", name: "Ireland", currency: "EUR", locale: "en-IE", dateOrder: "dmy", postcodeLabel: "Eircode", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "US", name: "United States", currency: "USD", locale: "en-US", dateOrder: "mdy", postcodeLabel: "ZIP code", taxLabel: "Sales tax", safetyPack: "generic", lookup: "none" },
  { code: "CA", name: "Canada", currency: "CAD", locale: "en-CA", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "GST/HST", safetyPack: "generic", lookup: "none" },
  { code: "AU", name: "Australia", currency: "AUD", locale: "en-AU", dateOrder: "dmy", postcodeLabel: "Postcode", taxLabel: "GST", safetyPack: "generic", lookup: "none" },
  { code: "NZ", name: "New Zealand", currency: "NZD", locale: "en-NZ", dateOrder: "dmy", postcodeLabel: "Postcode", taxLabel: "GST", safetyPack: "generic", lookup: "none" },
  { code: "FR", name: "France", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "DE", name: "Germany", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "ES", name: "Spain", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "PT", name: "Portugal", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "IT", name: "Italy", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "NL", name: "Netherlands", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "GR", name: "Greece", currency: "EUR", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "VAT", safetyPack: "generic", lookup: "none" },
  { code: "XX", name: "Other", currency: "USD", locale: "en-GB", dateOrder: "dmy", postcodeLabel: "Postal code", taxLabel: "Tax", safetyPack: "generic", lookup: "none" },
];

// The currencies a company can choose between (the country sets the starting
// one). Changing it only changes how amounts are written: nothing is converted.
export const CURRENCIES: { code: string; name: string }[] = [
  { code: "GBP", name: "Pound sterling (£)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "USD", name: "US dollar ($)" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "NZD", name: "New Zealand dollar" },
  { code: "CHF", name: "Swiss franc" },
  { code: "SEK", name: "Swedish krona" },
  { code: "NOK", name: "Norwegian krone" },
  { code: "DKK", name: "Danish krone" },
  { code: "AED", name: "UAE dirham" },
  { code: "ZAR", name: "South African rand" },
];

export function countryByCode(code: string | null | undefined): CountryProfile {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRIES.some((c) => c.code === value);
}

export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && CURRENCIES.some((c) => c.code === value);
}

// What the rest of the app reads: the country's profile with the company's own
// currency on it.
export type Region = CountryProfile & { currency: string };

export const DEFAULT_REGION: Region = { ...COUNTRIES[0] };

export function regionFor(country: string | null | undefined, currency: string | null | undefined): Region {
  const profile = countryByCode(country);
  return { ...profile, currency: isCurrencyCode(currency) ? currency : profile.currency };
}

// The region of the request being served. Set once per request by the sign-in
// guards in src/lib/authz.ts, then read by the date and money helpers, so a
// page does not have to pass it to every one of them. Per request (React's
// cache), never shared between companies. Outside a request (a script) it is
// the UK default, so a background job that works for a company passes that
// company's region explicitly.
// React's cache only exists in server code; a client component that imports
// this file (through a date helper) just gets the UK default, and is handed
// anything company-specific as props by its server parent.
const makeHolder = () => ({ region: null as Region | null });
const reactCache = (React as unknown as { cache?: <T>(fn: () => T) => () => T }).cache;
const requestRegion = reactCache ? reactCache(makeHolder) : (() => {
  const shared = makeHolder();
  return () => shared;
})();

export function setRequestRegion(region: Region): void {
  requestRegion().region = region;
}

// A background job (no request) runs inside runWithRegion in
// src/lib/regionServer.ts, which keeps that company's region in an
// AsyncLocalStorage on globalThis (not imported here, so browser code stays
// free of Node modules).
type RegionStore = { getStore(): Region | undefined };

export function currentRegion(): Region {
  const background = (globalThis as { __evoRegionStore?: RegionStore }).__evoRegionStore?.getStore();
  return requestRegion().region ?? background ?? DEFAULT_REGION;
}

// An amount written the way the company's country writes money: "£12.00",
// "$12.00", "€12.00". Nothing is converted: only the symbol and style change.
export function formatMoney(amount: number, region: Region = currentRegion()): string {
  return new Intl.NumberFormat(region.locale, { style: "currency", currency: region.currency }).format(amount);
}

// Just the symbol ("£", "$", "€"), for a label such as "Flat fee per clean (£)".
export function currencySymbol(region: Region = currentRegion()): string {
  const parts = new Intl.NumberFormat(region.locale, { style: "currency", currency: region.currency }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? region.currency;
}
