"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actionResult";
import { MAX_STOCK_AREA_NAME } from "@/lib/stockAreas";
import { button, card, inputCompact } from "@/lib/ui";

export type StockAreaRow = { id: string; name: string; itemCount: number };

// The places stock is kept, in the order a cleaner walks through them. Move
// one up or down to change that order, rename it, or delete it (its items are
// kept, just without an area). New areas go on the end.
export function StockAreasManager({
  areas,
  create,
  rename,
  move,
  remove,
  addUsual,
}: {
  areas: StockAreaRow[];
  create: (formData: FormData) => Promise<ActionResult>;
  rename: (id: string, formData: FormData) => Promise<ActionResult>;
  move: (id: string, direction: "up" | "down") => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
  addUsual: () => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result) setError(result.error);
        else onOk?.();
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <section className={card("flex flex-col gap-4 p-5 ring-1 ring-black/[0.04]")} aria-labelledby="areas-heading">
      <div>
        <h2 id="areas-heading" className="text-base font-semibold">
          Where stock is kept
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Cleaners go through stock one area at a time, in this order, so they are not back and forth between rooms.
          Give each item an area when you add or edit it. If something lives in two places, like hand soap, add it once
          for each, for example &quot;Hand soap (kitchen)&quot; and &quot;Hand soap (bathroom)&quot;.
        </p>
      </div>

      {areas.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-zinc-600">No areas yet.</p>
          <button type="button" disabled={pending} onClick={() => run(addUsual)} className={button("primary", "sm")}>
            Add the usual areas
          </button>
          <p className="text-xs text-zinc-500">
            Kitchen, Kitchen cupboard, Bathroom, Bedroom, Living area and Store cupboard. You can rename, reorder or
            delete any of them.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-black/5 rounded-lg border border-black/5">
          {areas.map((area, index) => (
            <li key={area.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
              <span className="w-5 shrink-0 text-center text-xs text-zinc-400">{index + 1}</span>
              {editingId === area.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    run(() => rename(area.id, formData), () => setEditingId(null));
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <input
                    name="name"
                    required
                    autoFocus
                    maxLength={MAX_STOCK_AREA_NAME}
                    defaultValue={area.name}
                    aria-label="Area name"
                    className={`${inputCompact} max-w-56`}
                  />
                  <button type="submit" disabled={pending} className={button("primary", "sm")}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className={button("ghost", "sm")}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium [overflow-wrap:anywhere]">{area.name}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {area.itemCount} {area.itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      disabled={pending || index === 0}
                      onClick={() => run(() => move(area.id, "up"))}
                      aria-label={`Move ${area.name} earlier`}
                      className="rounded-md border border-black/10 px-2 py-1 text-zinc-600 hover:bg-black/[0.04] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={pending || index === areas.length - 1}
                      onClick={() => run(() => move(area.id, "down"))}
                      aria-label={`Move ${area.name} later`}
                      className="rounded-md border border-black/10 px-2 py-1 text-zinc-600 hover:bg-black/[0.04] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => setEditingId(area.id)} className="ml-2 text-zinc-500 hover:text-zinc-900">
                      Rename
                    </button>
                    {confirmingId === area.id ? (
                      <span className="ml-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => remove(area.id), () => setConfirmingId(null))}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Yes, delete
                        </button>
                        <button type="button" onClick={() => setConfirmingId(null)} className="text-zinc-500 hover:underline">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmingId(area.id)} className="ml-2 text-zinc-400 hover:text-red-600">
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {areas.length > 0 &&
        (adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              run(() => create(formData), () => setAdding(false));
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              name="name"
              required
              autoFocus
              maxLength={MAX_STOCK_AREA_NAME}
              placeholder="e.g. Utility room"
              aria-label="New area name"
              className={`${inputCompact} max-w-56`}
            />
            <button type="submit" disabled={pending} className={button("primary", "sm")}>
              Add area
            </button>
            <button type="button" onClick={() => setAdding(false)} className={button("ghost", "sm")}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setAdding(true)} className={button("secondary", "sm")}>
              + Add an area
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(addUsual)}
              className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900"
            >
              Add any usual areas that are missing
            </button>
          </div>
        ))}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
