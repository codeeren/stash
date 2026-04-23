import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { ItemDetail } from "@/components/ItemDetail";
import { ItemList } from "@/components/ItemList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useItems";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  getItemWithRelations,
  listItems,
  recordItemUse,
} from "@/lib/items";
import { seedSampleData } from "@/lib/seed";
import { matches } from "@/lib/shortcuts";
import type { SortValue, ThemeValue } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

function EmptyDatabaseOverlay() {
  const { items, loading } = useItems();
  const query = useUiStore((s) => s.searchQuery);
  const filters = useUiStore((s) => s.filters);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const bumpCategories = useUiStore((s) => s.bumpCategories);
  const bumpTags = useUiStore((s) => s.bumpTags);

  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters =
    Boolean(query.trim()) ||
    filters.type !== undefined ||
    filters.categoryId !== undefined ||
    Boolean(filters.favoritesOnly) ||
    (filters.tagIds && filters.tagIds.length > 0);

  if (loading || items.length > 0 || hasFilters) return null;

  const onSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      await seedSampleData();
      bumpItems();
      bumpCategories();
      bumpTags();
    } catch (e) {
      setError(String(e));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-10">
      <div className="max-w-sm text-center space-y-4 p-6 border rounded-lg bg-card shadow-sm">
        <div className="text-4xl">📚</div>
        <h2 className="text-lg font-semibold">Your stash is empty</h2>
        <p className="text-sm text-muted-foreground">
          Load a handful of sample commands, prompts, and snippets to see
          Stash in action.
        </p>
        <Button onClick={onSeed} disabled={seeding}>
          {seeding ? "Loading…" : "Load sample data"}
        </Button>
        {error ? (
          <div className="text-xs text-destructive">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  const loadSettings = useSettingsStore((s) => s.load);
  const paletteShortcut = useSettingsStore(
    (s) => s.values["shortcut.commandPalette"],
  );
  const theme = useSettingsStore((s) => s.values.theme) as ThemeValue;
  const trayEnabled = useSettingsStore(
    (s) => s.values["tray.enabled"] !== "false",
  );
  const traySort = useSettingsStore((s) => s.values["tray.sort"]) as SortValue;

  const requestFocusSearch = useUiStore((s) => s.requestFocusSearch);
  const requestNewItem = useUiStore((s) => s.requestNewItem);
  const requestPrimaryAction = useUiStore((s) => s.requestPrimaryAction);
  const requestTrayItem = useUiStore((s) => s.requestTrayItem);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const itemsVersion = useUiStore((s) => s.itemsVersion);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void invoke("set_tray_visible", { visible: trayEnabled });
  }, [trayEnabled]);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const effectiveShortcut = paletteShortcut?.trim() || "Mod+K";
      if (matches(e, effectiveShortcut)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (e.key === "Enter" && !inInput && !mod) {
        requestPrimaryAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteShortcut, requestPrimaryAction]);

  useEffect(() => {
    const unlisten = Promise.all([
      listen("menu:settings", () => setSettingsOpen(true)),
      listen("menu:new_item", () => requestNewItem()),
      listen("menu:find", () => requestFocusSearch()),
      listen<number>("tray:activate", async (evt) => {
        const id = evt.payload;
        try {
          const full = await getItemWithRelations(id);
          if (!full) return;
          const copyOnly =
            full.variables.length === 0 && full.type !== "command";
          if (copyOnly) {
            // Silent copy + a brief "✓ Copied" label next to the tray icon.
            await navigator.clipboard.writeText(full.content);
            await recordItemUse(full.id);
            bumpItems();
            try {
              await invoke("set_tray_title", { title: "✓ Copied" });
              setTimeout(() => {
                void invoke("set_tray_title", { title: "" });
              }, 1500);
            } catch {
              // Title flash is best-effort.
            }
          } else {
            // Command / has-vars items need the window (confirmation or form).
            await invoke("show_main_window");
            requestTrayItem(id);
          }
        } catch (e) {
          console.error(e);
        }
      }),
    ]);
    return () => {
      unlisten.then((fns) => fns.forEach((fn) => fn()));
    };
  }, [requestFocusSearch, requestNewItem, requestTrayItem, bumpItems]);

  // Sync tray quick-access menu with current favorites + items list.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [favRows, allRows] = await Promise.all([
          listItems({ favoritesOnly: true }, traySort),
          listItems({}, traySort),
        ]);
        if (cancelled) return;
        const favorites = favRows
          .slice(0, 20)
          .map((i) => ({ id: i.id, title: i.title }));
        const recent = allRows
          .slice(0, 20)
          .map((i) => ({ id: i.id, title: i.title }));
        await invoke("set_tray_items", { favorites, recent });
      } catch {
        // Tray update is best-effort; ignore failures.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemsVersion, trayEnabled, traySort]);

  return (
    <div className="relative h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <ItemList />
      <ItemDetail />
      <EmptyDatabaseOverlay />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default App;
