import { Avatar } from "@/components/Avatar";
import { PmsCredentialFields } from "@/components/PmsCredentialFields";
import { PMS_PROVIDERS } from "@/lib/pms/registry";
import { button, inputCompact } from "@/lib/ui";

type ClientFields = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  photoPath: string | null;
  // Which PMS, if any, is currently connected -- never the credentials
  // themselves (even decrypted, showing a secret back into an HTML form
  // value is bad practice, visible in page source/devtools). Undefined on
  // the create form, where there's nothing to have yet.
  pmsProvider?: string | null;
  hasPmsCredentials?: boolean;
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

      <PmsCredentialFields
        providers={PMS_PROVIDERS.map((a) => ({
          provider: a.provider,
          displayName: a.displayName,
          credentialFields: a.credentialFields,
        }))}
        currentProvider={client?.pmsProvider ?? null}
        hasCredentials={client?.hasPmsCredentials ?? false}
      />

      <div>
        <button type="submit" className={button("primary", "sm")}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
