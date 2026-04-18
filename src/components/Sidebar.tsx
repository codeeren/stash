import { useCategories } from "@/hooks/useCategories";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

type SidebarRowProps = {
  active: boolean;
  onClick: () => void;
  icon?: string | null;
  label: string;
  badge?: string;
};

function SidebarRow({ active, onClick, icon, label, badge }: SidebarRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {icon ? <span className="text-base leading-none">{icon}</span> : null}
      <span className="truncate flex-1">{label}</span>
      {badge ? (
        <span className="text-xs text-muted-foreground">{badge}</span>
      ) : null}
    </button>
  );
}

export function Sidebar() {
  const { categories, loading } = useCategories();
  const filters = useUiStore((s) => s.filters);
  const setFilters = useUiStore((s) => s.setFilters);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);

  const selectCategory = (categoryId: number | null | undefined) => {
    setFilters({ categoryId, favoritesOnly: false });
    setSelectedItemId(null);
  };
  const toggleFavorites = () => {
    setFilters({ favoritesOnly: !filters.favoritesOnly, categoryId: undefined });
    setSelectedItemId(null);
  };

  const allActive =
    filters.categoryId === undefined && !filters.favoritesOnly;

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
      <div className="px-4 py-3 border-b">
        <h1 className="text-sm font-semibold tracking-tight">Stash</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        <div className="space-y-0.5">
          <SidebarRow
            active={allActive}
            onClick={() => selectCategory(undefined)}
            icon="📚"
            label="All items"
          />
          <SidebarRow
            active={!!filters.favoritesOnly}
            onClick={toggleFavorites}
            icon="⭐"
            label="Favorites"
          />
          <SidebarRow
            active={filters.categoryId === null}
            onClick={() => selectCategory(null)}
            icon="📄"
            label="Uncategorized"
          />
        </div>

        <div>
          <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Categories
          </div>
          {loading ? (
            <div className="px-3 py-1 text-xs text-muted-foreground">
              Loading…
            </div>
          ) : categories.length === 0 ? (
            <div className="px-3 py-1 text-xs text-muted-foreground">
              No categories yet.
            </div>
          ) : (
            <div className="space-y-0.5">
              {categories.map((c) => (
                <SidebarRow
                  key={c.id}
                  active={filters.categoryId === c.id}
                  onClick={() => selectCategory(c.id)}
                  icon={c.icon}
                  label={c.name}
                />
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
