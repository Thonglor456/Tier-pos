import type { Category } from "@/../../drizzle/schema";

interface Props {
  categories: Category[];
  selectedId: number | undefined;
  onSelect: (id: number | undefined) => void;
}

export default function CategoryTabs({ categories, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 border-b border-border bg-card scrollbar-none">
      <button
        onClick={() => onSelect(undefined)}
        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          selectedId === undefined
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        ทั้งหมด
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            selectedId === cat.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

