// Small outline icons for the public landing page (src/app/page.tsx). Hand-
// drawn rather than pulled from an icon library -- this app has stayed
// dependency-light everywhere else (see EvoTick.tsx for the same reasoning
// applied to the logo), and six simple glyphs don't earn a whole package.
// Shared stroke style keeps them reading as one family; each just supplies
// its own <path>/<rect>/<circle> children.

type IconProps = { className?: string };

function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Clipboard + checkmark -- the guided, gated turnover flow.
export function ChecklistIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M8.5 12.5 11 15l4.5-5" />
    </Icon>
  );
}

// An open package -- stock and par levels.
export function BoxIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
      <path d="M3 7.5v9L12 21l9-4.5v-9" />
      <path d="M12 12v9" />
    </Icon>
  );
}

// A receipt -- invoices generated from real visit times.
export function ReceiptIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
    </Icon>
  );
}

// A washing machine -- laundry tracked door to door.
export function WashingMachineIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M7.5 6h2" />
      <circle cx="12" cy="14" r="5" />
      <path d="M9 14a3 3 0 0 0 6 0" />
    </Icon>
  );
}

// A 2x2 grid -- the portfolio dashboard.
export function GridIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Icon>
  );
}

// A shield + checkmark -- access scoped to what a cleaner is assigned.
export function ShieldIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 3 4.5 6v6c0 5 3.2 8.4 7.5 9 4.3-.6 7.5-4 7.5-9V6L12 3Z" />
      <path d="M9 12.5 11 14.5 15.5 10" />
    </Icon>
  );
}
