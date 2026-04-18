import { useEffect, useState } from "react";
import { listItems, searchItems } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";
import type { Item } from "@/types";

type UseItemsResult = {
  items: Item[];
  loading: boolean;
  error: string | null;
};

export function useItems(): UseItemsResult {
  const filters = useUiStore((s) => s.filters);
  const query = useUiStore((s) => s.searchQuery);
  const version = useUiStore((s) => s.itemsVersion);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetcher = query.trim()
      ? searchItems(query, filters)
      : listItems(filters);

    fetcher
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, query, version]);

  return { items, loading, error };
}
