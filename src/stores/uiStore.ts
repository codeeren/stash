import { create } from "zustand";
import type { SilentResult } from "@/lib/execute";
import type { SearchFilters } from "@/types";

// A short-lived confirmation chip, e.g. "✓ Done" after a silent run.
export type Toast = {
  id: number;
  kind: "success" | "error";
  text: string;
};

// Outcome of a silent run that is worth stopping for — it failed, or it
// printed something the user should read.
export type RunResult = {
  command: string;
  result: SilentResult | null;
  error: string | null;
};

type UiStore = {
  selectedItemId: number | null;
  setSelectedItemId: (id: number | null) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  filters: SearchFilters;
  setFilters: (patch: Partial<SearchFilters>) => void;
  resetFilters: () => void;

  itemsVersion: number;
  bumpItems: () => void;

  categoriesVersion: number;
  bumpCategories: () => void;

  tagsVersion: number;
  bumpTags: () => void;

  focusSearchSignal: number;
  requestFocusSearch: () => void;

  newItemSignal: number;
  requestNewItem: () => void;

  primaryActionSignal: number;
  requestPrimaryAction: () => void;

  pendingTrayItemId: number | null;
  requestTrayItem: (id: number) => void;
  clearPendingTrayItem: () => void;

  // Id of the item currently being dragged from the list, or null. Tracked
  // in the store because WebKit does not expose custom dataTransfer types
  // during `dragover`, so drop targets cannot detect the drag otherwise.
  draggingItemId: number | null;
  setDraggingItemId: (id: number | null) => void;

  toast: Toast | null;
  showToast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;

  runResult: RunResult | null;
  setRunResult: (r: RunResult | null) => void;
};

const emptyFilters: SearchFilters = {};

export const useUiStore = create<UiStore>((set) => ({
  selectedItemId: null,
  setSelectedItemId: (id) => set({ selectedItemId: id }),

  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  filters: emptyFilters,
  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: emptyFilters }),

  itemsVersion: 0,
  bumpItems: () => set((s) => ({ itemsVersion: s.itemsVersion + 1 })),

  categoriesVersion: 0,
  bumpCategories: () =>
    set((s) => ({ categoriesVersion: s.categoriesVersion + 1 })),

  tagsVersion: 0,
  bumpTags: () => set((s) => ({ tagsVersion: s.tagsVersion + 1 })),

  focusSearchSignal: 0,
  requestFocusSearch: () =>
    set((s) => ({ focusSearchSignal: s.focusSearchSignal + 1 })),

  newItemSignal: 0,
  requestNewItem: () => set((s) => ({ newItemSignal: s.newItemSignal + 1 })),

  primaryActionSignal: 0,
  requestPrimaryAction: () =>
    set((s) => ({ primaryActionSignal: s.primaryActionSignal + 1 })),

  pendingTrayItemId: null,
  requestTrayItem: (id) =>
    set({ selectedItemId: id, pendingTrayItemId: id }),
  clearPendingTrayItem: () => set({ pendingTrayItemId: null }),

  draggingItemId: null,
  setDraggingItemId: (id) => set({ draggingItemId: id }),

  toast: null,
  showToast: (text, kind = "success") =>
    set({ toast: { id: Date.now() + Math.random(), kind, text } }),
  // Id-checked so a stale timer can't dismiss a newer toast.
  dismissToast: (id) =>
    set((s) => (s.toast?.id === id ? { toast: null } : {})),

  runResult: null,
  setRunResult: (r) => set({ runResult: r }),
}));
