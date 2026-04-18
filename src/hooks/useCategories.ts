import { useEffect, useState } from "react";
import { listCategories } from "@/lib/categories";
import { useUiStore } from "@/stores/uiStore";
import type { Category } from "@/types";

type UseCategoriesResult = {
  categories: Category[];
  loading: boolean;
  error: string | null;
};

export function useCategories(): UseCategoriesResult {
  const version = useUiStore((s) => s.categoriesVersion);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listCategories()
      .then((rows) => {
        if (cancelled) return;
        setCategories(rows);
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
  }, [version]);

  return { categories, loading, error };
}
