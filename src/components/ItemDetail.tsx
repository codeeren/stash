import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ExecuteDialog } from "@/components/ExecuteDialog";
import { ItemEditor } from "@/components/ItemEditor";
import { MarkdownView } from "@/components/MarkdownView";
import { VariableFillDialog } from "@/components/VariableFillDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useItemDetail } from "@/hooks/useItemDetail";
import {
  deleteItem,
  duplicateItem,
  recordItemUse,
  toggleFavorite,
} from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";

export function ItemDetail() {
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const setSelectedItemId = useUiStore((s) => s.setSelectedItemId);
  const bumpItems = useUiStore((s) => s.bumpItems);
  const primaryActionSignal = useUiStore((s) => s.primaryActionSignal);
  const pendingTrayItemId = useUiStore((s) => s.pendingTrayItemId);
  const clearPendingTrayItem = useUiStore((s) => s.clearPendingTrayItem);
  const { item, loading, error } = useItemDetail(selectedItemId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rawMode, setRawMode] = useState(false);

  const lastSignalRef = useRef(0);
  useEffect(() => {
    if (primaryActionSignal === 0 || primaryActionSignal === lastSignalRef.current)
      return;
    if (!item || item.id !== selectedItemId) return;
    if (editorOpen || deleteOpen || fillOpen || executeOpen) return;
    lastSignalRef.current = primaryActionSignal;

    if (item.variables.length > 0) {
      setFillOpen(true);
    } else if (item.type === "command") {
      setExecuteOpen(true);
    } else {
      void (async () => {
        await navigator.clipboard.writeText(item.content);
        await recordItemUse(item.id);
        bumpItems();
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })();
    }
  }, [
    primaryActionSignal,
    item,
    selectedItemId,
    editorOpen,
    deleteOpen,
    fillOpen,
    executeOpen,
    bumpItems,
  ]);

  // Handle tray activation: act once the pending item is loaded.
  useEffect(() => {
    if (pendingTrayItemId === null) return;
    if (!item || item.id !== pendingTrayItemId) return;
    if (editorOpen || deleteOpen || fillOpen || executeOpen) return;

    clearPendingTrayItem();

    if (item.variables.length > 0) {
      setFillOpen(true);
    } else if (item.type === "command") {
      setExecuteOpen(true);
    } else {
      void (async () => {
        await navigator.clipboard.writeText(item.content);
        await recordItemUse(item.id);
        bumpItems();
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })();
    }
  }, [
    pendingTrayItemId,
    item,
    editorOpen,
    deleteOpen,
    fillOpen,
    executeOpen,
    clearPendingTrayItem,
    bumpItems,
  ]);

  if (selectedItemId === null) {
    return (
      <section className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Select an item to view.
      </section>
    );
  }

  if (loading && !item) {
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
  const isCommand = item.type === "command";

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

  const onDuplicate = async () => {
    const copy = await duplicateItem(item.id);
    bumpItems();
    setSelectedItemId(copy.id);
  };

  return (
    <section className="flex-1 overflow-y-auto flex flex-col">
      <header className="px-6 py-4 border-b">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <span>{item.type}</span>
          {item.category ? (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <CategoryIcon
                  icon={item.category.icon}
                  className="h-3.5 w-3.5"
                />
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
                  {isCommand ? "Fill & Run" : "Fill & Copy"}
                </Button>
                <Button size="sm" variant="outline" onClick={onCopy}>
                  {copied ? "Copied" : "Copy raw"}
                </Button>
              </>
            ) : (
              <>
                {isCommand ? (
                  <Button size="sm" onClick={() => setExecuteOpen(true)}>
                    Run
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={onCopy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </>
            )}
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
              onClick={onDuplicate}
              title="Duplicate"
              aria-label="Duplicate"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                {/* back document (solid) */}
                <rect
                  x="5"
                  y="1"
                  width="10"
                  height="12"
                  rx="2"
                  fill="currentColor"
                />
                {/* front document body — fills with button bg to occlude */}
                <rect
                  x="1"
                  y="3"
                  width="10"
                  height="12"
                  rx="2"
                  fill="var(--background)"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                {/* 3 content bars */}
                <rect x="3.2" y="6" width="5.6" height="1.2" rx="0.6" fill="currentColor" />
                <rect x="3.2" y="8.4" width="5.6" height="1.2" rx="0.6" fill="currentColor" />
                <rect x="3.2" y="10.8" width="5.6" height="1.2" rx="0.6" fill="currentColor" />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 py-4 space-y-4 flex-1">
        {(() => {
          const canRender = item.type === "prompt" || item.type === "note";
          const showRendered = canRender && !rawMode;
          return (
            <div className="space-y-2">
              {canRender ? (
                <div className="flex items-center justify-end gap-1 text-xs">
                  <button
                    onClick={() => setRawMode(false)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      !rawMode
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Rendered
                  </button>
                  <button
                    onClick={() => setRawMode(true)}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      rawMode
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Raw
                  </button>
                </div>
              ) : null}
              {showRendered ? (
                <MarkdownView content={item.content} />
              ) : (
                <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {item.content}
                </pre>
              )}
            </div>
          );
        })()}

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
      {isCommand && !hasVariables ? (
        <ExecuteDialog
          open={executeOpen}
          onOpenChange={setExecuteOpen}
          itemId={item.id}
          resolvedCommand={item.content}
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
