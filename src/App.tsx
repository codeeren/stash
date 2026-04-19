import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { ItemDetail } from "@/components/ItemDetail";
import { ItemList } from "@/components/ItemList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useItems";
import { seedSampleData } from "@/lib/seed";
import { matches } from "@/lib/shortcuts";
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

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (matches(e, paletteShortcut)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteShortcut]);

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
