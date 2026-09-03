// A property's cover photo, or a neutral placeholder when it has none.
// Plain <img> for the same reason as Avatar/EvoTick -- the on-the-fly
// optimizer 400s on these files.
export function PropertyCover({
  path,
  alt,
  className = "h-14 w-20",
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  if (!path) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-black/[0.06] text-xs text-zinc-400`}
        aria-hidden
      >
        No photo
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/photos/${path}`}
      alt={alt}
      className={`${className} shrink-0 rounded-lg object-cover`}
    />
  );
}
