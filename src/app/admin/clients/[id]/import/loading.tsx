import { Spinner } from "@/components/Icons";

// Next renders this instantly while the page's own server component is still
// awaiting fetchHostifyListings -- without it, opening this page was a blank
// pause with nothing to show a click had registered.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-zinc-500">← Loading…</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import from Hostify</h1>
      </div>
      <p className="flex items-center gap-2 text-sm text-zinc-600">
        <Spinner />
        Fetching listings from Hostify…
      </p>
    </div>
  );
}
