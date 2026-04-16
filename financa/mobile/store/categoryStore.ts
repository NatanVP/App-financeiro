import { create } from 'zustand';
import { type RPGIconName } from '@/components/ui/RPGIcon';

export interface Category {
  id: string;
  name: string;
  icon: RPGIconName;
  /** 'income' | 'expense' | 'both' — used to filter in the transaction form */
  type: 'income' | 'expense' | 'both';
  /** Whether this is a built-in system category that cannot be deleted */
  system?: boolean;
}

/**
 * Built-in categories that always exist.
 * User-created categories are merged on top.
 */
const DEFAULT_CATEGORIES: Category[] = [
  // System (cannot delete)
  { id: 'goal_deposit', name: 'Tesouro',         icon: 'chest',       type: 'expense', system: true },
  { id: 'debt_payment', name: 'Quitar divida',   icon: 'hammer',      type: 'expense', system: true },
  { id: 'income',       name: 'Recompensa',      icon: 'coin_bag',    type: 'income',  system: true },
  // User categories (deletable)
  { id: 'cat_besteiras',  name: 'Besteiras',            icon: 'barrel',      type: 'expense' },
  { id: 'cat_jogos',      name: 'Jogos',                icon: 'potion_blue', type: 'expense' },
  { id: 'cat_noiva',      name: 'Noiva',                icon: 'villager',    type: 'expense' },
  { id: 'cat_amigos',     name: 'Sair com os amigos',   icon: 'potion_red',  type: 'expense' },
  { id: 'cat_api',        name: 'API',                  icon: 'orb',         type: 'expense' },
];

interface CategoryState {
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'system'>>) => void;
  getCategoryName: (id: string) => string;
  getCategoryIcon: (id: string) => RPGIconName;
  getByType: (type: 'income' | 'expense') => Category[];
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,

  addCategory: (cat) =>
    set((state) => ({
      categories: [
        ...state.categories,
        { ...cat, id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` },
      ],
    })),

  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id || c.system),
    })),

  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id && !c.system ? { ...c, ...updates } : c,
      ),
    })),

  getCategoryName: (id) =>
    get().categories.find((c) => c.id === id)?.name ?? 'Outros',

  getCategoryIcon: (id) =>
    get().categories.find((c) => c.id === id)?.icon ?? 'coin_bag',

  getByType: (type) =>
    get().categories.filter((c) => c.type === type || c.type === 'both'),
}));
