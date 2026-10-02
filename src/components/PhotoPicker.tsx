"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { button } from "@/lib/ui";

// A phone's camera hands back one photo per shot no matter what `multiple`
// says, so a plain file input can never collect a set from it. This keeps its
// own list instead: each shot or library pick is added to it, shown as a
// thumbnail, and the whole list is what gets submitted (copied onto a real
// `photos` input via DataTransfer, so the server action reads it exactly as
// it would from a normal multi-file input).
export function PhotoPicker({
  name = "photos",
  accept = "image/*",
  required = false,
  id,
}: {
  name?: string;
  accept?: string;
  required?: boolean;
  id?: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const realInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!realInput.current) return;
    const transfer = new DataTransfer();
    files.forEach((f) => transfer.items.add(f));
    realInput.current.files = transfer.files;
  }, [files]);

  function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    // Copied before the caller clears the input: the FileList is live, and
    // the state updater below runs later, by which point it would be empty.
    const picked = Array.from(list);
    setFiles((current) => [...current, ...picked]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => cameraInput.current?.click()} className={button("secondary", "md")}>
          Take photo
        </button>
        <button type="button" onClick={() => libraryInput.current?.click()} className={button("secondary", "md")}>
          Choose from library
        </button>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      {/* The one the form actually submits. Visually hidden rather than
          display:none so `required` still produces a validation message. */}
      <input
        ref={realInput}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

      {files.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-zinc-500">
            {files.length} {files.length === 1 ? "photo" : "photos"} ready. Take another or choose more to add to them.
          </p>
          <ul className="grid grid-cols-3 gap-2">
            {files.map((file, i) => (
              <li key={`${file.name}-${file.lastModified}-${i}`} className="relative overflow-hidden rounded-lg border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt={`Photo ${i + 1}`} className="h-20 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, j) => j !== i))}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
