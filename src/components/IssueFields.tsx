import {
  ISSUE_CATEGORY_HINTS,
  ISSUE_CATEGORY_LABELS,
  ISSUE_CATEGORY_ORDER,
  ISSUE_DESCRIPTION_MAX,
} from "@/lib/issues";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/imageTypes";
import { inputCompact } from "@/lib/ui";

// The inputs shared by the cleaner's mid-clean report and staff's "Log an
// issue" form -- see IssueForm, which wraps these with the action, error
// display and any extra fields (staff also pick the property).
// parseIssueForm in src/lib/issueRecords.ts reads exactly these names back.
//
// Facts only: what's wrong, a description, photos. There's deliberately no
// "how urgent?" -- the person reporting (usually a cleaner) isn't the one to
// judge that; the system works it out from what's wrong, the property and
// when the next guests are due (see src/lib/issueSeverity.ts), and staff
// can adjust it.
//
// `defaults` puts back what was typed after a rejected submission. idPrefix
// keeps label/input ids unique if a page ever renders two of these at once.
export function IssueFields({
  idPrefix = "issue",
  defaults = {},
}: {
  idPrefix?: string;
  defaults?: { category?: string; description?: string };
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-category`} className="text-sm font-medium">
          What&apos;s wrong?
        </label>
        <select
          id={`${idPrefix}-category`}
          name="category"
          required
          defaultValue={defaults.category ?? ""}
          className={inputCompact}
        >
          <option value="" disabled>
            Choose…
          </option>
          {ISSUE_CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {ISSUE_CATEGORY_HINTS[c]
                ? `${ISSUE_CATEGORY_LABELS[c]} (${ISSUE_CATEGORY_HINTS[c]})`
                : ISSUE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-description`} className="text-sm font-medium">
          Describe it
        </label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          rows={3}
          required
          maxLength={ISSUE_DESCRIPTION_MAX}
          defaultValue={defaults.description ?? ""}
          placeholder="e.g. Shower tray cracked along the back edge, water getting underneath."
          className={inputCompact}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-photos`} className="text-sm font-medium">
          Photos <span className="font-normal text-zinc-500">(optional, but they help)</span>
        </label>
        <input
          id={`${idPrefix}-photos`}
          name="photos"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
      </div>
    </>
  );
}
