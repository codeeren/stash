import { useItemDetail } from "@/hooks/useItemDetail";
import { useUiStore } from "@/stores/uiStore";

export function ItemDetail() {
  const selectedItemId = useUiStore((s) => s.selectedItemId);
  const { item, loading, error } = useItemDetail(selectedItemId);

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

  return (
    <section className="flex-1 overflow-y-auto">
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
        <h2 className="text-xl font-semibold tracking-tight">{item.title}</h2>
        {item.description ? (
          <p className="text-sm text-muted-foreground mt-1">
            {item.description}
          </p>
        ) : null}
      </header>

      <div className="px-6 py-4 space-y-4">
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
    </section>
  );
}
