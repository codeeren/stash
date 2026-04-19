import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listItems, searchItems } from "@/lib/items";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import type { Item, ItemType } from "@/types";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TYPE_LABEL: Record<ItemType, string> = {
  command: "CMD",
  prompt: "PMT",
  snippet: "SNP",
  note: "NTE",
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const itemsVersion = useUiStore((s) => s.itemsVersion);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetcher = query.trim() ? searchItems(query, {}) : listItems({});
    fetcher.then((rows) => {
      if (cancelled) return;
      setResults(rows.slice(0, 50));
      setActiveIdx(0);
    });
    return () => {
      cancelled = true;
    };
  }, [open, query, itemsVersion]);

  const visible = useMemo(() => results, [results]);

  const select = (item: Item) => {
    setSelectedItemId(item.id);
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = visible[activeIdx];
      if (picked) select(picked);
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden"
        onKeyDown={onKeyDown}
      >
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search items…"
            className="border-0 shadow-none focus-visible:ring-0 text-sm"
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-1"
        >
          {visible.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No items match.
            </div>
          ) : (
            visible.map((item, i) => (
              <button
                key={item.id}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => select(item)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center gap-2 text-sm",
                  i === activeIdx
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/60",
                )}
              >
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                  {TYPE_LABEL[item.type]}
                </span>
                {item.isFavorite ? (
                  <span className="text-xs shrink-0">⭐</span>
                ) : null}
                <span className="truncate flex-1">{item.title}</span>
                {item.description ? (
                  <span className="text-xs text-muted-foreground truncate max-w-[40%]">
                    {item.description}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
