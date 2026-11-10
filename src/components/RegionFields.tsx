"use client";

import { useState } from "react";
import { COUNTRIES, CURRENCIES, countryByCode } from "@/lib/region";
import { inputCompact } from "@/lib/ui";

// The country and currency pickers. Choosing a country sets its usual
// currency, which can then still be changed (a company in Switzerland may
// invoice in euros, say).
export function RegionFields({ country: initialCountry, currency: initialCurrency }: { country: string; currency: string }) {
  const [country, setCountry] = useState(initialCountry);
  const [currency, setCurrency] = useState(initialCurrency);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Country</span>
        <select
          name="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setCurrency(countryByCode(e.target.value).currency);
          }}
          className={inputCompact}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Currency</span>
        <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCompact}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
