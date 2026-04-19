import { useState } from "react";
import { CategoryEditor } from "@/components/CategoryEditor";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useCategories } from "@/hooks/useCategories";
import { deleteCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import type { Category } from "@/types";

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

type CategoryRowProps = {
  category: Category;
  active: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function CategoryRow({
  category,
  active,
  onClick,
  onEdit,
  onDelete,
}: CategoryRowProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center rounded-md text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 text-left"
      >
        {category.icon ? (
          <span className="text-base leading-none">{category.icon}</span>
        ) : null}
        <span className="truncate flex-1">{category.name}</span>
      </button>
      <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
        <button
          onClick={onEdit}
          title="Edit"
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-background/60 text-xs"
        >
          ✎
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-background/60 text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

type SidebarProps = {
  onOpenSettings: () => void;
};

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { categories, loading } = useCategories();
  const filters = useUiStore((s) => s.filters);
  const setFilters = useUiStore((s) => s.setFilters);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const bumpCategories = useUiStore((s) => s.bumpCategories);
  const bumpItems = useUiStore((s) => s.bumpItems);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const selectCategory = (categoryId: number | null | undefined) => {
    setFilters({ categoryId, favoritesOnly: false });
    setSelectedItemId(null);
  };
  const toggleFavorites = () => {
    setFilters({ favoritesOnly: !filters.favoritesOnly, categoryId: undefined });
    setSelectedItemId(null);
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setEditorOpen(true);
  };
  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id);
    if (filters.categoryId === deleteTarget.id) {
      setFilters({ categoryId: undefined });
    }
    bumpCategories();
    bumpItems();
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
          <div className="px-3 pb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Categories</span>
            <button
              onClick={openNew}
              title="New category"
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent hover:text-foreground text-sm leading-none"
            >
              +
            </button>
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
                <CategoryRow
                  key={c.id}
                  category={c}
                  active={filters.categoryId === c.id}
                  onClick={() => selectCategory(c.id)}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t p-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
        >
          <span className="text-base leading-none">⚙</span>
          <span>Settings</span>
        </button>
      </div>

      <CategoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        existing={editing}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title={
          deleteTarget ? `Delete category “${deleteTarget.name}”?` : "Delete?"
        }
        description="Items in this category will move to Uncategorized. This cannot be undone."
        onConfirm={onConfirmDelete}
      />
    </aside>
  );
}
