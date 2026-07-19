import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  CodeIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
  TerminalIcon,
} from "lucide-react";
import { listItems, searchItems } from "@/lib/items";
import type { ThemeValue } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Item, ItemType } from "@/types";

const TYPE_ICON: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  command: TerminalIcon,
  prompt: MessageSquareIcon,
  snippet: CodeIcon,
  note: FileTextIcon,
};

const TYPE_LABEL: Record<ItemType, string> = {
  command: "Command",
  prompt: "Prompt",
  snippet: "Snippet",
  note: "Note",
};

// Standalone launcher rendered in the transparent quicklaunch window. It
// reuses the item search and, on activation, emits `tray:activate` so the
// main window's existing handler runs the item (copy / fill / execute).
export function QuickLaunch() {
  const loadSettings = useSettingsStore((s) => s.load);
  const theme = useSettingsStore((s) => s.values.theme) as ThemeValue;

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hide = useCallback(() => {
    void getCurrentWindow().hide();
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Search: empty query shows recently-used items.
  useEffect(() => {
    let cancelled = false;
    const run = query.trim()
      ? searchItems(query, {})
      : listItems({}, "recent");
    run
      .then((rows) => {
        if (cancelled) return;
        setItems(rows.slice(0, 50));
        setActiveIndex(0);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Reset and focus when the window gains focus; hide when it loses focus
  // (clicking away dismisses, like Spotlight / Raycast).
  useEffect(() => {
    const w = getCurrentWindow();
    const unlisten = w.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
      } else {
        void w.hide();
      }
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // Keep the highlighted row visible.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const activate = useCallback(
    (item: Item) => {
      void emit("tray:activate", item.id);
      hide();
    },
    [hide],
  );

  // Open the main window and pop the New Item editor. The main window
  // already listens for `menu:new_item` and opens the editor.
  const createNew = useCallback(() => {
    void invoke("show_main_window").catch(() => {});
    void emit("menu:new_item");
    hide();
  }, [hide]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "n") {
      e.preventDefault();
      createNew();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      hide();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) activate(item);
    }
  };

  return (
    <div className="h-screen w-screen flex items-start justify-center p-5 bg-transparent">
      <div className="w-full rounded-xl border bg-popover text-popover-foreground shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b">
          <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="Search Stash…"
            autoFocus
            className="flex-1 py-3 text-base bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query.trim() ? "No matches" : "No items yet"}
            </div>
          ) : (
            items.map((item, idx) => {
              const TypeIcon = TYPE_ICON[item.type];
              const active = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  data-active={active}
                  onClick={() => activate(item)}
                  onMouseMove={() => setActiveIndex(idx)}
                  className={cn(
                    "w-full text-left px-3 py-2 mx-1 rounded-md flex items-center gap-2.5",
                    active ? "bg-accent" : "",
                  )}
                  style={{ width: "calc(100% - 0.5rem)" }}
                >
                  <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-sm">
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {TYPE_LABEL[item.type]}
                  </span>
                  {active ? (
                    <CornerDownLeftIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t px-2 py-1.5">
          <button
            onClick={createNew}
            className="w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PlusIcon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">New item…</span>
            <kbd className="text-[10px] font-medium text-muted-foreground border rounded px-1.5 py-0.5">
              ⌘N
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
