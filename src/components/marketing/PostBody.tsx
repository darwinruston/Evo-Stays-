import Link from "next/link";
import type { ReactNode } from "react";

// Renders the small subset of Markdown the blog posts are written in (see
// src/lib/blog/types.ts). Built into React elements, never injected as HTML.

// **bold** and [links](url) inside a line.
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i} className="font-semibold text-zinc-900">{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!link) return part;
    const [, label, href] = link;
    const style = "font-medium text-teal-700 underline underline-offset-4 hover:text-teal-900";
    return href.startsWith("/") ? (
      <Link key={i} href={href} className={style}>
        {label}
      </Link>
    ) : (
      <a key={i} href={href} className={style} rel="noopener" target="_blank">
        {label}
      </a>
    );
  });
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function PostBody({ source }: { source: string }) {
  // Blocks are separated by blank lines.
  const blocks = source.trim().split(/\n\s*\n/);

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        const first = lines[0];

        if (first.startsWith("### ")) {
          return <h3 key={i} className="mt-6 text-lg font-semibold text-zinc-900">{inline(first.slice(4))}</h3>;
        }
        if (first.startsWith("## ")) {
          return <h2 key={i} className="mt-10 text-2xl font-semibold tracking-tight text-zinc-900">{inline(first.slice(3))}</h2>;
        }
        if (first.startsWith("|")) {
          const [head, , ...rows] = lines;
          return (
            // Scrolls sideways on its own on a phone, so the page never does.
            <div key={i} className="mt-5 overflow-x-auto rounded-xl border border-black/10 bg-surface">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="bg-teal-50 text-zinc-900">
                  <tr>{cells(head).map((c, n) => <th key={n} className="px-4 py-3 font-semibold">{inline(c)}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((row, r) => (
                    <tr key={r}>{cells(row).map((c, n) => <td key={n} className="px-4 py-3 align-top">{inline(c)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // A bold line directly above a list is that list's own heading.
        const bullets = lines.filter((l) => l.startsWith("- "));
        const lead = lines.filter((l) => !l.startsWith("- ") && !/^\d+\. /.test(l));
        if (bullets.length > 0) {
          return (
            <div key={i} className="mt-4">
              {lead.length > 0 && <p>{inline(lead.join(" "))}</p>}
              <ul className="mt-2 list-disc pl-5 marker:text-teal-600">
                {bullets.map((l, n) => <li key={n} className="mt-1.5">{inline(l.slice(2))}</li>)}
              </ul>
            </div>
          );
        }
        if (/^\d+\. /.test(first)) {
          return (
            <ol key={i} className="mt-4 list-decimal pl-5 marker:font-semibold marker:text-teal-700">
              {lines.map((l, n) => <li key={n} className="mt-1.5">{inline(l.replace(/^\d+\. /, ""))}</li>)}
            </ol>
          );
        }
        return <p key={i} className="mt-4 leading-relaxed">{inline(lines.join(" "))}</p>;
      })}
    </>
  );
}
