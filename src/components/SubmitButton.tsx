"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/Icons";
import { button, type ButtonVariant, type ButtonSize } from "@/lib/ui";

// A submit button that shows it's working, for a plain
// `<form action={serverAction}>` that redirects on success rather than
// returning -- useFormStatus reads the browser's own pending state for the
// nearest form, so it keeps showing "pending" right through the redirect
// instead of racing the thrown NEXT_REDIRECT the way manually calling the
// action in a try/catch would. Must render inside the <form> it's for.
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "sm",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${button(variant, size)} inline-flex items-center gap-2`}>
      {pending && <Spinner className="h-3.5 w-3.5" />}
      {pending ? pendingLabel : children}
    </button>
  );
}
