import { create } from "zustand";
import type { SearchFilters } from "@/types";

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
}));
