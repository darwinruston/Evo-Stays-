import { Avatar } from "@/components/Avatar";

type Person = { id: string; name: string };

// Who a task is with, in the list and on the task's page. Everyone is just
// "Whole team"; a few people show as overlapping faces and their first names
// (in the list) or one line each (on the page).
export function TaskAssignees({
  people,
  wholeTeam,
  layout,
}: {
  people: Person[];
  wholeTeam: boolean;
  layout: "inline" | "stacked";
}) {
  if (people.length === 0) return <span className="font-normal text-zinc-500">Nobody yet</span>;

  if (wholeTeam) {
    return (
      <span className="inline-flex items-center gap-2">
        <Faces people={people} size={layout === "inline" ? 18 : 22} />
        Whole team
      </span>
    );
  }

  if (layout === "stacked") {
    return (
      <ul className="flex flex-col items-end gap-1.5">
        {people.map((p) => (
          <li key={p.id} className="inline-flex items-center gap-2">
            <Avatar name={p.name} size={22} />
            {p.name}
          </li>
        ))}
      </ul>
    );
  }

  const shown = people.slice(0, 2);
  const more = people.length - shown.length;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Faces people={people} size={18} />
      {shown.map((p) => p.name).join(", ")}
      {more > 0 && ` +${more}`}
    </span>
  );
}

// Up to three avatars side by side.
function Faces({ people, size }: { people: Person[]; size: number }) {
  return (
    <span className="inline-flex gap-1">
      {people.slice(0, 3).map((p) => (
        <span key={p.id}>
          <Avatar name={p.name} size={size} />
        </span>
      ))}
    </span>
  );
}
