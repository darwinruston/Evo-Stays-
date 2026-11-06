"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { removeProfilePhoto, uploadProfilePhoto } from "@/app/account/actions";
import { PROFILE_PHOTO_SIZE } from "@/lib/profile";
import { button } from "@/lib/ui";

// Crops the middle square out of the picture and shrinks it, so what is sent
// is a small JPEG however big the phone's photo was. Done in the browser: it
// also turns whatever the camera produced into a format every browser can
// show. Throws if this browser can't read the picture at all.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_PHOTO_SIZE;
  canvas.height = PROFILE_PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    PROFILE_PHOTO_SIZE,
    PROFILE_PHOTO_SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No image"))), "image/jpeg", 0.88);
  });
}

// "Add a photo" / "Change photo" and "Remove photo" for the signed-in person's
// own profile. Picking a file sends it straight away.
export function ProfilePhotoForm({ hasPhoto }: { hasPhoto: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const blob = await toSquareJpeg(file);
        const formData = new FormData();
        formData.set("photo", new File([blob], "profile.jpg", { type: "image/jpeg" }));
        const result = await uploadProfilePhoto(formData);
        if (result) setError(result.error);
        else router.refresh();
      } catch {
        setError("That photo couldn't be read. Try a JPEG or PNG.");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeProfilePhoto();
        if (result) setError(result.error);
        else router.refresh();
      } catch {
        setError("Something went wrong.");
      }
      setConfirmingRemove(false);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a profile photo"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button type="button" disabled={pending} onClick={() => inputRef.current?.click()} className={button("secondary", "sm")}>
          {pending ? "Saving…" : hasPhoto ? "Change photo" : "Add a photo"}
        </button>
        {hasPhoto &&
          (confirmingRemove ? (
            <span className="flex items-center gap-3 text-sm">
              <button type="button" disabled={pending} onClick={remove} className="font-medium text-red-600 hover:underline">
                Yes, remove it
              </button>
              <button type="button" onClick={() => setConfirmingRemove(false)} className="text-zinc-500 hover:underline">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmingRemove(true)} className={button("ghost", "sm")}>
              Remove photo
            </button>
          ))}
      </div>
      <p className="text-xs text-zinc-500">
        {hasPhoto ? "Shown in the top bar." : "Without one, your initials show in a circle."}
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
