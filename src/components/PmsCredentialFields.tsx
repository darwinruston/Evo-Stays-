"use client";

import { useState } from "react";
import { inputCompact } from "@/lib/ui";

type ProviderOption = {
  provider: string;
  displayName: string;
  credentialFields: { key: string; label: string; helpText?: string }[];
};

// The provider picker plus whichever provider's 1-or-2 credential fields are
// currently relevant -- generalizes what was a single hardcoded "Hostify API
// key" field in ClientForm. Needs client-side state since which fields show
// depends on the <select>'s own live value, not just what was initially
// saved.
export function PmsCredentialFields({
  providers,
  currentProvider,
  hasCredentials,
}: {
  providers: ProviderOption[];
  currentProvider: string | null;
  hasCredentials: boolean;
}) {
  const [selected, setSelected] = useState(currentProvider ?? "");
  const adapter = providers.find((p) => p.provider === selected) ?? null;
  // Fields only count as "already filled in" for the provider that's
  // actually stored -- switching to a different one has nothing to leave
  // unchanged, so every one of its fields is required (see updateClient).
  const isStoredProvider = hasCredentials && selected === currentProvider;

  return (
    <div className="flex flex-col gap-3 border-t border-black/5 pt-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pmsProvider" className="text-sm font-medium">
          Property management system
        </label>
        <select
          id="pmsProvider"
          name="pmsProvider"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={inputCompact}
        >
          <option value="">Not connected</option>
          {providers.map((p) => (
            <option key={p.provider} value={p.provider}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>

      {adapter && (
        <div className="flex flex-col gap-3">
          {adapter.credentialFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label htmlFor={`cred_${field.key}`} className="text-sm font-medium">
                {field.label}
              </label>
              {/* Deliberately blank, not prefilled -- the stored value is
                  encrypted and never decrypted back into a form. Blank on
                  submit means "leave the current value alone" when this is
                  already the stored provider, not "clear it". */}
              <input
                id={`cred_${field.key}`}
                name={`cred_${field.key}`}
                type="password"
                autoComplete="off"
                placeholder={isStoredProvider ? "•••••••• (unchanged)" : ""}
                className={inputCompact}
              />
              {field.helpText && <p className="text-xs text-zinc-500">{field.helpText}</p>}
            </div>
          ))}
          {isStoredProvider && (
            <p className="text-xs text-zinc-500">Leave blank to keep the current credentials.</p>
          )}
        </div>
      )}
    </div>
  );
}
