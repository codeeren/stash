import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ItemEditor } from "@/components/ItemEditor";
import { VariableFillDialog } from "@/components/VariableFillDialog";
import { Button } from "@/components/ui/button";
import { useItemDetail } from "@/hooks/useItemDetail";
import { deleteItem, recordItemUse, toggleFavorite } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";

export function ItemDetail() {
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const { item, loading, error } = useItemDetail(selectedItemId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (selectedItemId === null) {
    return (
      <section className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Select an item to view.
      </section>
    );
  }

  if (loading) {
    return (
      <section className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex-1 flex items-center justify-center text-sm text-destructive">
        {error}
      </section>
    );
  }

  if (!item) {
    return (
      <section className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Item not found.
      </section>
    );
  }

  const hasVariables = item.variables.length > 0;

  const onCopy = async () => {
    await navigator.clipboard.writeText(item.content);
    await recordItemUse(item.id);
    bumpItems();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onToggleFavorite = async () => {
    await toggleFavorite(item.id);
    bumpItems();
  };

  const onDelete = async () => {
    await deleteItem(item.id);
    setSelectedItemId(null);
    bumpItems();
  };

  return (
    <section className="flex-1 overflow-y-auto flex flex-col">
      <header className="px-6 py-4 border-b">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <span>{item.type}</span>
          {item.category ? (
            <>
              <span>·</span>
              <span>
                {item.category.icon ? `${item.category.icon} ` : ""}
                {item.category.name}
              </span>
            </>
          ) : null}
          {item.isFavorite ? <span>· ⭐</span> : null}
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 basis-[16rem]">
            <h2 className="text-xl font-semibold tracking-tight break-words">
              {item.title}
            </h2>
            {item.description ? (
              <p className="text-sm text-muted-foreground mt-1 break-words">
                {item.description}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {hasVariables ? (
              <>
                <Button size="sm" onClick={() => setFillOpen(true)}>
                  Fill & Copy
                </Button>
                <Button size="sm" variant="outline" onClick={onCopy}>
                  {copied ? "Copied" : "Copy raw"}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={onCopy}>
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleFavorite}
              title={item.isFavorite ? "Unfavorite" : "Favorite"}
            >
              {item.isFavorite ? "★" : "☆"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditorOpen(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 py-4 space-y-4 flex-1">
        <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
          {item.content}
        </pre>

        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                #{t.name}
              </span>
            ))}
          </div>
        ) : null}

        {item.variables.length > 0 ? (
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Variables
            </div>
            <ul className="text-sm space-y-1">
              {item.variables.map((v) => (
                <li
                  key={v.id}
                  className="flex items-baseline gap-2 text-muted-foreground"
                >
                  <code className="text-foreground">{`{{${v.name}}}`}</code>
                  <span>·</span>
                  <span>{v.label ?? v.name}</span>
                  <span className="text-xs">({v.fieldType})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
          <dt>Created</dt>
          <dd>{item.createdAt}</dd>
          <dt>Updated</dt>
          <dd>{item.updatedAt}</dd>
          {item.lastUsedAt ? (
            <>
              <dt>Last used</dt>
              <dd>{item.lastUsedAt}</dd>
            </>
          ) : null}
          <dt>Use count</dt>
          <dd>{item.useCount}</dd>
        </dl>
      </div>

      <ItemEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        existing={item}
      />
      {hasVariables ? (
        <VariableFillDialog
          open={fillOpen}
          onOpenChange={setFillOpen}
          item={item}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${item.title}”?`}
        description="This cannot be undone. Associated tags and variables will be removed with it."
        onConfirm={onDelete}
      />
    </section>
  );
}
