import { useState } from "react";
import { ItemEditor } from "@/components/ItemEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useItems } from "@/hooks/useItems";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import type { Item, ItemType } from "@/types";

const TYPE_LABEL: Record<ItemType, string> = {
  command: "CMD",
  prompt: "PMT",
  snippet: "SNP",
  note: "NTE",
};

const TYPE_COLOR: Record<ItemType, string> = {
  command: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  prompt: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  snippet: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  note: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

type ItemRowProps = {
  item: Item;
  active: boolean;
  onClick: () => void;
};

function ItemRow({ item, active, onClick }: ItemRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 border-b transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wide",
            TYPE_COLOR[item.type],
          )}
        >
          {TYPE_LABEL[item.type]}
        </span>
        {item.isFavorite ? <span className="text-xs">⭐</span> : null}
        <span className="text-sm font-medium truncate flex-1">
          {item.title}
        </span>
      </div>
      {item.description ? (
        <div className="text-xs text-muted-foreground line-clamp-1">
          {item.description}
        </div>
      ) : null}
    </button>
  );
}

export function ItemList() {
  const { items, loading, error } = useItems();
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);

  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <section className="w-96 shrink-0 border-r flex flex-col">
      <div className="p-2 border-b flex items-center gap-2">
        <Input
          placeholder="Search items…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />
        <Button
          size="icon"
          variant="outline"
          title="New item"
          onClick={() => setEditorOpen(true)}
        >
          +
        </Button>
      </div>
      <ItemEditor open={editorOpen} onOpenChange={setEditorOpen} />

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4 text-sm text-destructive">{error}</div>
        ) : loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No items match.
          </div>
        ) : (
          items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              active={selectedItemId === item.id}
              onClick={() => setSelectedItemId(item.id)}
            />
          ))
        )}
      </div>
      <div className="px-3 py-1.5 border-t text-xs text-muted-foreground">
        {loading ? "…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
      </div>
    </section>
  );
}
