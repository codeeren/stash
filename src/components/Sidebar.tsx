import { useState, type ComponentType, type ReactNode } from "react";
import {
  ChevronDownIcon,
  CodeIcon,
  FileIcon,
  FileTextIcon,
  HashIcon,
  LayersIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { CategoryEditor } from "@/components/CategoryEditor";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useCategories } from "@/hooks/useCategories";
import { useSidebarCounts } from "@/hooks/useSidebarCounts";
import { useTags } from "@/hooks/useTags";
import { deleteCategory } from "@/lib/categories";
import { deleteTag } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import type { Category, ItemType, Tag } from "@/types";

type IconType = ComponentType<{ className?: string }>;

const TYPE_OPTIONS: { value: ItemType; label: string; Icon: IconType }[] = [
  { value: "command", label: "Commands", Icon: TerminalIcon },
  { value: "prompt", label: "Prompts", Icon: MessageSquareIcon },
  { value: "snippet", label: "Snippets", Icon: CodeIcon },
  { value: "note", label: "Notes", Icon: FileTextIcon },
];

type NavRowProps = {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  trailing?: ReactNode;
};

// Single unified row used by every sidebar entry — views, types,
// categories, and tags — so the whole sidebar speaks one visual language.
function NavRow({ icon, label, count, active, onClick, trailing }: NavRowProps) {
  return (
    <div
      className={cn(
        "relative flex items-center rounded-md text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <span className="w-5 flex-shrink-0 flex items-center justify-center">
          {icon}
        </span>
        <span className="truncate flex-1">{label}</span>
        {count !== undefined && !trailing ? (
          <span
            className={cn(
              "text-xs tabular-nums",
              active
                ? "text-accent-foreground/60"
                : "text-muted-foreground/60",
            )}
          >
            {count}
          </span>
        ) : null}
      </button>
      {trailing}
    </div>
  );
}

type SectionProps = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

function Section({
  title,
  collapsed,
  onToggle,
  actions,
  children,
}: SectionProps) {
  return (
    <div className="border-t border-border/50 pt-2 mt-2">
      <div className="flex items-center justify-between pl-1.5 pr-1 pb-0.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDownIcon
            className={cn(
              "h-3 w-3 transition-transform",
              collapsed && "-rotate-90",
            )}
          />
          <span>{title}</span>
        </button>
        {actions ? (
          <div className="flex items-center gap-0.5">{actions}</div>
        ) : null}
      </div>
      {!collapsed ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  );
}

type SidebarProps = {
  onOpenSettings: () => void;
};

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { categories, loading } = useCategories();
  const { tags } = useTags();
  const counts = useSidebarCounts();
  const filters = useUiStore((s) => s.filters);
  const setFilters = useUiStore((s) => s.setFilters);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const bumpCategories = useUiStore((s) => s.bumpCategories);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const bumpTags = useUiStore((s) => s.bumpTags);

  const activeTagIds = filters.tagIds ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<Tag | null>(null);
  const [tagEditMode, setTagEditMode] = useState(false);
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [typesCollapsed, setTypesCollapsed] = useState(false);
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);

  const selectCategory = (categoryId: number | null | undefined) => {
    setFilters({ categoryId, favoritesOnly: false });
    setSelectedItemId(null);
  };
  const toggleFavorites = () => {
    setFilters({ favoritesOnly: !filters.favoritesOnly, categoryId: undefined });
    setSelectedItemId(null);
  };
  const toggleType = (t: ItemType) => {
    setFilters({ type: filters.type === t ? undefined : t });
    setSelectedItemId(null);
  };
  const toggleTag = (id: number) => {
    const next = activeTagIds.includes(id)
      ? activeTagIds.filter((x) => x !== id)
      : [...activeTagIds, id];
    setFilters({ tagIds: next.length > 0 ? next : undefined });
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

  const allActive = filters.categoryId === undefined && !filters.favoritesOnly;

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
      <div className="px-4 py-3 border-b">
        <h1 className="text-sm font-semibold tracking-tight">Stash</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {/* Library — primary views */}
        <div className="space-y-0.5">
          <NavRow
            icon={<LayersIcon className="h-4 w-4" />}
            label="All items"
            count={counts.total}
            active={allActive}
            onClick={() => selectCategory(undefined)}
          />
          <NavRow
            icon={<StarIcon className="h-4 w-4" />}
            label="Favorites"
            count={counts.favorites}
            active={!!filters.favoritesOnly}
            onClick={toggleFavorites}
          />
          <NavRow
            icon={<FileIcon className="h-4 w-4" />}
            label="Uncategorized"
            count={counts.uncategorized}
            active={filters.categoryId === null}
            onClick={() => selectCategory(null)}
          />
        </div>

        {/* Categories */}
        <div className="group/cats">
          <Section
            title="Categories"
            collapsed={categoriesCollapsed}
            onToggle={() => setCategoriesCollapsed((v) => !v)}
            actions={
              <>
                {categories.length > 0 ? (
                  <button
                    onClick={() => setCategoryEditMode((v) => !v)}
                    title={categoryEditMode ? "Done" : "Edit categories"}
                    className={cn(
                      "h-5 w-5 flex items-center justify-center rounded hover:bg-accent hover:text-foreground transition-opacity",
                      categoryEditMode
                        ? "bg-accent text-foreground opacity-100"
                        : "opacity-0 group-hover/cats:opacity-100",
                    )}
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                ) : null}
                <button
                  onClick={openNew}
                  title="New category"
                  className={cn(
                    "h-5 w-5 flex items-center justify-center rounded hover:bg-accent hover:text-foreground transition-opacity",
                    categoryEditMode
                      ? "opacity-100"
                      : "opacity-0 group-hover/cats:opacity-100",
                  )}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </>
            }
          >
            {loading ? (
              <div className="px-3 py-1 text-xs text-muted-foreground">
                Loading…
              </div>
            ) : categories.length === 0 ? (
              <div className="px-3 py-1 text-xs text-muted-foreground">
                No categories yet.
              </div>
            ) : (
              categories.map((c) => (
                <NavRow
                  key={c.id}
                  icon={<CategoryIcon icon={c.icon} className="h-4 w-4" />}
                  label={c.name}
                  count={counts.byCategory[c.id] ?? 0}
                  active={filters.categoryId === c.id}
                  onClick={() => selectCategory(c.id)}
                  trailing={
                    categoryEditMode ? (
                      <div className="flex items-center gap-0.5 pr-1">
                        <button
                          onClick={() => openEdit(c)}
                          title="Edit category"
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-background/60"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          title="Delete category"
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-background/60"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              ))
            )}
          </Section>
        </div>

        {/* Types */}
        <Section
          title="Types"
          collapsed={typesCollapsed}
          onToggle={() => setTypesCollapsed((v) => !v)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <NavRow
              key={opt.value}
              icon={<opt.Icon className="h-4 w-4" />}
              label={opt.label}
              count={counts.byType[opt.value] ?? 0}
              active={filters.type === opt.value}
              onClick={() => toggleType(opt.value)}
            />
          ))}
        </Section>

        {/* Tags */}
        {tags.length > 0 ? (
          <div className="group/tags">
            <Section
              title="Tags"
              collapsed={tagsCollapsed}
              onToggle={() => setTagsCollapsed((v) => !v)}
              actions={
                <button
                  onClick={() => setTagEditMode((v) => !v)}
                  title={tagEditMode ? "Done" : "Edit tags"}
                  className={cn(
                    "h-5 w-5 flex items-center justify-center rounded hover:bg-accent hover:text-foreground transition-opacity",
                    tagEditMode
                      ? "bg-accent text-foreground opacity-100"
                      : "opacity-0 group-hover/tags:opacity-100",
                  )}
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              }
            >
              {tags.map((t) => (
                <NavRow
                  key={t.id}
                  icon={<HashIcon className="h-4 w-4" />}
                  label={t.name}
                  count={counts.byTag[t.id] ?? 0}
                  active={activeTagIds.includes(t.id)}
                  onClick={() => toggleTag(t.id)}
                  trailing={
                    tagEditMode ? (
                      <div className="flex items-center pr-1">
                        <button
                          onClick={() => setDeleteTagTarget(t)}
                          title="Delete tag"
                          aria-label={`Delete tag ${t.name}`}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-background/60"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              ))}
            </Section>
          </div>
        ) : null}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
        >
          <span className="w-5 flex-shrink-0 flex items-center justify-center">
            <SettingsIcon className="h-4 w-4" />
          </span>
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
      <ConfirmDeleteDialog
        open={deleteTagTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTagTarget(null);
        }}
        title={
          deleteTagTarget ? `Delete tag “#${deleteTagTarget.name}”?` : "Delete?"
        }
        description="The tag will be removed from all items. This cannot be undone."
        onConfirm={async () => {
          if (!deleteTagTarget) return;
          await deleteTag(deleteTagTarget.id);
          if (activeTagIds.includes(deleteTagTarget.id)) {
            const next = activeTagIds.filter(
              (id) => id !== deleteTagTarget.id,
            );
            setFilters({ tagIds: next.length > 0 ? next : undefined });
          }
          bumpTags();
          bumpItems();
        }}
      />
    </aside>
  );
}
