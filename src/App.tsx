import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { RunResultDialog } from "@/components/RunResultDialog";
import { Toast } from "@/components/Toast";
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
import { exportBackup } from "@/lib/backup";
import { STARTER_PACKS, seedPacks } from "@/lib/seed";
import { runItemSilently } from "@/lib/silentRun";
import { matches, toAccelerator } from "@/lib/shortcuts";
import type { SortValue, ThemeValue } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

// Shown only on a genuinely empty database (fresh install). Lets a new
// user load curated starter packs, or dismiss to start empty. An existing
// user's stash is untouched — this never appears once items exist.
function EmptyDatabaseOverlay() {
  const { items, loading } = useItems();
  const query = useUiStore((s) => s.searchQuery);
  const filters = useUiStore((s) => s.filters);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const bumpCategories = useUiStore((s) => s.bumpCategories);
  const bumpTags = useUiStore((s) => s.bumpTags);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [seeding, setSeeding] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters =
    Boolean(query.trim()) ||
    filters.type !== undefined ||
    filters.categoryId !== undefined ||
    Boolean(filters.favoritesOnly) ||
    (filters.tagIds && filters.tagIds.length > 0);

  if (loading || items.length > 0 || hasFilters || dismissed) return null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totalItems = STARTER_PACKS.filter((p) => selected.has(p.id)).reduce(
    (sum, p) => sum + p.items.length,
    0,
  );

  const onConfirm = async () => {
    if (selected.size === 0) {
      setDismissed(true);
      return;
    }
    setSeeding(true);
    setError(null);
    try {
      await seedPacks([...selected]);
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
    <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-10 p-6">
      <div className="w-full max-w-md max-h-full flex flex-col border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="p-5 space-y-1 text-center border-b">
          <div className="text-3xl">📚</div>
          <h2 className="text-lg font-semibold">Welcome to Stash</h2>
          <p className="text-sm text-muted-foreground">
            Pick a few starter packs to explore, or start empty. You can
            edit or delete anything later.
          </p>
        </div>
        <div className="overflow-y-auto p-2">
          {STARTER_PACKS.map((pack) => {
            const checked = selected.has(pack.id);
            return (
              <label
                key={pack.id}
                className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(pack.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {pack.name}
                    <span className="font-normal text-xs text-muted-foreground">
                      {" "}
                      · {pack.items.length} items
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pack.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="p-4 border-t space-y-2">
          {error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : null}
          <Button
            className="w-full"
            onClick={onConfirm}
            disabled={seeding}
          >
            {seeding
              ? "Adding…"
              : selected.size > 0
                ? `Add ${selected.size} pack${
                    selected.size === 1 ? "" : "s"
                  } (${totalItems} items)`
                : "Start with an empty Stash"}
          </Button>
        </div>
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
  const globalShortcutEnabled = useSettingsStore(
    (s) => s.values["shortcut.global.enabled"] === "true",
  );
  const globalShortcutKey = useSettingsStore(
    (s) => s.values["shortcut.global.key"],
  );
  const backupAuto = useSettingsStore((s) => s.values["backup.auto"]);
  const backupLastAt = useSettingsStore(
    (s) => s.values["backup.lastAutoAt"],
  );
  const setSetting = useSettingsStore((s) => s.set);

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

  // Automatic local backup: on startup, write a JSON snapshot if enough
  // time has passed since the last one. Best-effort and silent.
  useEffect(() => {
    if (backupAuto === "off") return;
    const intervalMs =
      backupAuto === "daily" ? 86_400_000 : 604_800_000;
    const last = backupLastAt ? Date.parse(backupLastAt) : NaN;
    if (Number.isFinite(last) && Date.now() - last < intervalMs) return;
    void (async () => {
      try {
        const backup = await exportBackup();
        await invoke("write_auto_backup", {
          json: JSON.stringify(backup, null, 2),
        });
        await setSetting("backup.lastAutoAt", new Date().toISOString());
      } catch (e) {
        console.error("auto backup failed", e);
      }
    })();
  }, [backupAuto, backupLastAt, setSetting]);

  // Global shortcut: registration happens in Rust (robust against webview
  // permission/event quirks). We just push the current setting down.
  useEffect(() => {
    const accel = globalShortcutEnabled
      ? toAccelerator(globalShortcutKey)
      : "";
    void invoke("set_global_shortcut", {
      enabled: globalShortcutEnabled && accel !== "",
      accelerator: accel,
    });
  }, [globalShortcutEnabled, globalShortcutKey]);

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
          // Locked items always need the window so the user can unlock —
          // never silently copy their content from the tray.
          const copyOnly =
            !full.locked &&
            full.variables.length === 0 &&
            full.type !== "command";
          // A silent command asks nothing, so the window never has to
          // appear: run it straight from the menu bar and flash the result
          // next to the tray icon.
          const silentRun =
            !full.locked &&
            full.variables.length === 0 &&
            full.type === "command" &&
            full.silent;
          if (silentRun) {
            await runItemSilently(full.id, full.content, { fromTray: true });
          } else if (copyOnly) {
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
      <RunResultDialog />
      <Toast />
    </div>
  );
}

export default App;
