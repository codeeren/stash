import { useEffect, useState } from "react";
import { getItemWithRelations } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";
import type { ItemWithRelations } from "@/types";

type UseItemDetailResult = {
  item: ItemWithRelations | null;
  loading: boolean;
  error: string | null;
};

export function useItemDetail(id: number | null): UseItemDetailResult {
  const version = useUiStore((s) => s.itemsVersion);

  const [item, setItem] = useState<ItemWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) {
      setItem(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setItem((prev) => (prev && prev.id === id ? prev : null));
    setLoading(true);
    setError(null);

    getItemWithRelations(id)
      .then((result) => {
        if (cancelled) return;
        setItem(result);
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
  }, [id, version]);

  return { item, loading, error };
}
