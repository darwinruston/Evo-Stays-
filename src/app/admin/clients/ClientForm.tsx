import { Avatar } from "@/components/Avatar";
import { button, inputCompact } from "@/lib/ui";

type ClientFields = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  photoPath: string | null;
  // Whether a Hostify key is already stored -- never the key itself (even
  // decrypted, showing a secret back into an HTML form value is bad
  // practice, visible in page source/devtools). Undefined on the create
  // form, where there's nothing to have yet.
  hasHostifyApiKey?: boolean;
};

// Shared between create and edit -- edit binds the id into the action, so
// this component never needs to know which mode it's in.
export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  client?: ClientFields;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={client?.name ?? "?"} photoPath={client?.photoPath} size={56} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="photo" className="text-sm font-medium">
            Photo or logo
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={client?.name ?? ""}
          placeholder="Harbour Lets"
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone
        </label>
        <input id="phone" name="phone" defaultValue={client?.phone ?? ""} className={inputCompact} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-black/5 pt-4">
        <label htmlFor="hostifyApiKey" className="text-sm font-medium">
          Hostify API key
        </label>
        {/* Deliberately blank, not prefilled like every other field above --
            the stored value is encrypted and never decrypted back into a
            form. Blank on submit means "leave the current key alone" (see
            updateClient), not "clear it". */}
        <input
          id="hostifyApiKey"
          name="hostifyApiKey"
          type="password"
          autoComplete="off"
          placeholder={client?.hasHostifyApiKey ? "•••••••• (unchanged)" : ""}
          className={inputCompact}
        />
        <p className="text-xs text-zinc-500">
          From Hostify → Settings → API Keys. Only needs the{" "}
          <code>reservations:read_no_guest</code> scope.
          {client?.hasHostifyApiKey && " Leave blank to keep the current key."}
        </p>
      </div>

      <div>
        <button type="submit" className={button("primary", "sm")}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
