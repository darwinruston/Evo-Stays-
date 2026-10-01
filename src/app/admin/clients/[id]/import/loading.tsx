import { Spinner } from "@/components/Icons";

// Next renders this instantly while the page's own server component is still
// awaiting adapter.listListings -- without it, opening this page was a blank
// pause with nothing to show a click had registered. Generic copy since this
// loads before the page itself knows which provider's connected.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-zinc-500">← Loading…</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import listings</h1>
      </div>
      <p className="flex items-center gap-2 text-sm text-zinc-600">
        <Spinner />
        Fetching listings…
      </p>
    </div>
  );
}
