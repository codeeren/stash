import { useEffect, useRef, useState } from "react";
import {
  CodeIcon,
  FileTextIcon,
  MessageSquareIcon,
  TerminalIcon,
} from "lucide-react";
import { DragRegion } from "@/components/DragRegion";
import { ItemEditor } from "@/components/ItemEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useItems } from "@/hooks/useItems";
import { setDraggedItem } from "@/lib/dnd";
import type { SortValue } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import type { Item, ItemType } from "@/types";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "recent", label: "Recently used" },
  { value: "mostUsed", label: "Most used" },
  { value: "newest", label: "Newest" },
  { value: "alpha", label: "A → Z" },
];

const TYPE_ICON: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  command: TerminalIcon,
  prompt: MessageSquareIcon,
  snippet: CodeIcon,
  note: FileTextIcon,
};

const TYPE_NAME: Record<ItemType, string> = {
  command: "Command",
  prompt: "Prompt",
  snippet: "Snippet",
  note: "Note",
};

type ItemRowProps = {
  item: Item;
  active: boolean;
  onClick: () => void;
};

function ItemRow({ item, active, onClick }: ItemRowProps) {
  const TypeIcon = TYPE_ICON[item.type];
  const setDraggingItemId = useUiStore((s) => s.setDraggingItemId);
  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        setDraggedItem(e.dataTransfer, item.id);
        setDraggingItemId(item.id);
      }}
      onDragEnd={() => setDraggingItemId(null)}
      className={cn(
        "w-full text-left px-3 py-2 border-b border-border/40 transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.title}</div>
          {item.description ? (
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {item.description}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
          {item.locked ? (
            <span className="text-xs leading-none" aria-label="Locked" title="Locked">
              🔒
            </span>
          ) : null}
          {item.isFavorite ? (
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-400/80"
              aria-label="Favorite"
              title="Favorite"
            />
          ) : null}
          <TypeIcon
            className="h-3.5 w-3.5 text-muted-foreground/60"
            aria-label={TYPE_NAME[item.type]}
          />
        </div>
      </div>
    </button>
  );
}

export function ItemList() {
  const { items, loading, error } = useItems();
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const focusSearchSignal = useUiStore((s) => s.focusSearchSignal);
  const newItemSignal = useUiStore((s) => s.newItemSignal);
  const sort = useSettingsStore((s) => s.values["items.sort"]) as SortValue;
  const setSetting = useSettingsStore((s) => s.set);

  const [editorOpen, setEditorOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusSearchSignal > 0) searchRef.current?.focus();
  }, [focusSearchSignal]);

  useEffect(() => {
    if (newItemSignal > 0) setEditorOpen(true);
  }, [newItemSignal]);

  useEffect(() => {
    if (!selectedItemId) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-item-id="${selectedItemId}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedItemId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (e.key === "Escape" && target === searchRef.current) {
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery("");
        }
        return;
      }

      if (inInput) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (items.length === 0) return;
        e.preventDefault();
        const idx = items.findIndex((i) => i.id === selectedItemId);
        const next =
          e.key === "ArrowDown"
            ? Math.min(items.length - 1, idx < 0 ? 0 : idx + 1)
            : Math.max(0, idx < 0 ? 0 : idx - 1);
        setSelectedItemId(items[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selectedItemId, setSelectedItemId, searchQuery, setSearchQuery]);

  const hasSearch = searchQuery.trim().length > 0;
  const sortDisabled = hasSearch;

  return (
    <section className="w-96 shrink-0 border-r flex flex-col">
      <DragRegion />
      <div className="p-2 border-b flex items-center gap-2">
        <Input
          ref={searchRef}
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

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4 text-sm text-destructive">{error}</div>
        ) : loading && items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center space-y-1">
            <div className="text-2xl">{hasSearch ? "🔍" : "📭"}</div>
            <div className="text-sm font-medium">
              {hasSearch ? "No matches" : "No items here"}
            </div>
            <div className="text-xs text-muted-foreground">
              {hasSearch
                ? `Nothing matches “${searchQuery}”.`
                : "Create a new item with +"}
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} data-item-id={item.id}>
              <ItemRow
                item={item}
                active={selectedItemId === item.id}
                onClick={() => setSelectedItemId(item.id)}
              />
            </div>
          ))
        )}
      </div>
      <div className="h-8 px-3 border-t text-xs text-muted-foreground flex items-center justify-between gap-2">
        <span>
          {loading ? "…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </span>
        <Select
          value={sort}
          onValueChange={(v) => void setSetting("items.sort", v)}
          disabled={sortDisabled}
        >
          <SelectTrigger
            className="h-6 data-[size=default]:h-6 text-xs border-0 bg-transparent dark:bg-transparent shadow-none px-1.5 py-0 gap-1 hover:bg-accent dark:hover:bg-accent hover:text-foreground focus:ring-0 focus-visible:ring-0 w-auto"
            title={sortDisabled ? "Search uses relevance ranking" : "Sort items"}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
