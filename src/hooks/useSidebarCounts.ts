import { useEffect, useState } from "react";
import { getSidebarCounts, type SidebarCounts } from "@/lib/items";
import { useUiStore } from "@/stores/uiStore";

const EMPTY: SidebarCounts = {
  total: 0,
  favorites: 0,
  uncategorized: 0,
  byType: {},
  byCategory: {},
  byTag: {},
};

// Sidebar item-count badges. Re-runs whenever items, categories, or tags
// change so the numbers stay in sync.
export function useSidebarCounts(): SidebarCounts {
  const itemsVersion = useUiStore((s) => s.itemsVersion);
  const categoriesVersion = useUiStore((s) => s.categoriesVersion);
  const tagsVersion = useUiStore((s) => s.tagsVersion);

  const [counts, setCounts] = useState<SidebarCounts>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    getSidebarCounts()
      .then((c) => {
        if (!cancelled) setCounts(c);
      })
      .catch(() => {
        // Count badges are best-effort; ignore failures.
      });
    return () => {
      cancelled = true;
    };
  }, [itemsVersion, categoriesVersion, tagsVersion]);

  return counts;
}
