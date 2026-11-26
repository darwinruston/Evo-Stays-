"use client";

import { useState, useTransition } from "react";
import { requestFormReset } from "react-dom";
import type { ActionResult } from "@/lib/actionResult";

// Just under the most one request may carry (bodySizeLimit in next.config.ts).
// Anything bigger is refused before the action runs, so it can't say why.
const MOST_BYTES = 14.5 * 1024 * 1024;

type Props = Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & {
  action: (formData: FormData) => Promise<ActionResult>;
};

// A <form> for a server action that can turn the request down. The reason
// shows at the foot of the form, beside the button, and what the person had
// typed or picked stays put so they can correct it. A plain <form action>
// would empty the fields and has nowhere to show the reason.
//
// SubmitButton and useFormStatus work inside it as usual. method="post" is so
// that a press before the page has finished loading never puts what was typed
// into the address bar.
export function ActionForm({ action, children, ...rest }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <form
      {...rest}
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form, (event.nativeEvent as SubmitEvent).submitter);
        setError(null);
        let bytes = 0;
        for (const value of formData.values()) if (value instanceof File) bytes += value.size;
        if (bytes > MOST_BYTES) {
          setError("Those files are too big to send together (15 MB at most). Choose fewer, or smaller ones.");
          return;
        }
        // Not caught: a redirect, and anything unexpected, carry on to Next as
        // they would from a plain form.
        startTransition(async () => {
          const result = await action(formData);
          startTransition(() => {
            if (result) setError(result.error);
            // It went through: clear the fields, as a plain form would.
            else requestFormReset(form);
          });
        });
      }}
    >
      {children}
      {error && (
        <p role="alert" className="col-span-full w-full basis-full text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
