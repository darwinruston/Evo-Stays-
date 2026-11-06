import { Avatar } from "@/components/Avatar";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { ProfilePhotoForm } from "@/components/ProfilePhotoForm";
import { badge, card } from "@/lib/ui";

// Who you are signed in as, and the password. One view for every kind of
// login (staff, cleaner, linen company): each area has its own page around it.
//
// The password is never shown: it is stored scrambled (hashed), so not even
// Evo Stays can read it back. What you can do is change it, and the boxes have
// a Show button so you can check what you have typed.
export function ProfileView({
  name,
  email,
  photoPath,
  roleLabel,
  organisationName,
  passwordChanged,
  canChangePassword,
}: {
  name: string;
  email: string;
  photoPath: string | null;
  roleLabel: string;
  organisationName: string | null;
  passwordChanged: boolean;
  canChangePassword: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center gap-5">
        <Avatar name={name} photoPath={photoPath} size={88} />
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span className={badge("neutral")}>{roleLabel}</span>
              {organisationName && <span>{organisationName}</span>}
            </p>
          </div>
          <ProfilePhotoForm hasPhoto={photoPath !== null} />
        </div>
      </div>

      <section className={card("p-5 ring-1 ring-black/[0.04]")} aria-labelledby="signed-in-heading">
        <h2 id="signed-in-heading" className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Signed in as
        </h2>
        <dl className="mt-2 divide-y divide-black/5 text-sm">
          <div className="flex min-h-11 items-center justify-between gap-4 py-2">
            <dt className="text-zinc-500">Name</dt>
            <dd className="text-right font-medium [overflow-wrap:anywhere]">{name}</dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-4 py-2">
            <dt className="text-zinc-500">Email</dt>
            <dd className="text-right font-medium [overflow-wrap:anywhere]">{email}</dd>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-4 py-2">
            <dt className="text-zinc-500">Password</dt>
            <dd className="text-right font-medium tracking-widest" aria-label="Hidden">
              ••••••••••
            </dd>
          </div>
        </dl>
      </section>

      <section className={card("flex flex-col gap-4 p-5 ring-1 ring-black/[0.04]")} aria-labelledby="password-heading">
        <div>
          <h2 id="password-heading" className="text-base font-semibold">
            Password
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your password is stored scrambled, so nobody can read it back, not even us. You can set a new one at any
            time.
          </p>
        </div>
        {passwordChanged && (
          <p role="status" className="rounded-lg bg-black/[0.04] px-3 py-2 text-sm text-zinc-800">
            Your password has been changed. Any other devices you were signed in on have been signed out.
          </p>
        )}
        {canChangePassword ? (
          // Keyed on the "just changed" flag so the form starts empty again after
          // a successful change, rather than keeping the passwords typed.
          <ChangePasswordForm key={passwordChanged ? "changed" : "fresh"} />
        ) : (
          <p className="text-sm text-zinc-500">
            A password can&apos;t be changed while you are viewing this account as support.
          </p>
        )}
      </section>
    </div>
  );
}
