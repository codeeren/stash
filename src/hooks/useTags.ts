import { useEffect, useState } from "react";
import { listTags } from "@/lib/tags";
import { useUiStore } from "@/stores/uiStore";
import type { Tag } from "@/types";

type UseTagsResult = {
  tags: Tag[];
  loading: boolean;
  error: string | null;
};

export function useTags(): UseTagsResult {
  const version = useUiStore((s) => s.tagsVersion);

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listTags()
      .then((rows) => {
        if (cancelled) return;
        setTags(rows);
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

  return { tags, loading, error };
}
