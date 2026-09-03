// Plain <img>, not next/image -- same reason as the Evo branding: the
// on-the-fly optimizer 400s on these files even though they're valid images.
// Used for people and client orgs (a circular profile photo), as opposed to
// properties (a place), which get a landscape cover photo instead.
export function Avatar({
  name,
  photoPath,
  size = 40,
}: {
  name: string;
  photoPath?: string | null;
  size?: number;
}) {
  if (photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/profile-photos/${photoPath}`}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-black/10 font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
    >
      {initials}
    </div>
  );
}
