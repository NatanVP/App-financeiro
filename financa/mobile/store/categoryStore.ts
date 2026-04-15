import { create } from 'zustand';
import { CATEGORY_MAP } from '@/constants/categories';

export interface ServerCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface CategoryState {
  categories: ServerCategory[];
  setCategories: (categories: ServerCategory[]) => void;
  /** Resolve a category_id to a display name.
   *  Tries server categories first, falls back to local CATEGORY_MAP, then 'Outros'. */
  getCategoryName: (id: string) => string;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],

  setCategories: (categories) => set({ categories }),

  getCategoryName: (id) => {
    const serverMatch = get().categories.find((c) => c.id === id);
    if (serverMatch) return serverMatch.name;
    return CATEGORY_MAP[id]?.name ?? 'Outros';
  },
}));
