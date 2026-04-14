import { MaterialCommunityIcons } from '@expo/vector-icons';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface Category {
  id: string;
  name: string;
  icon: MCIName;
}

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Mercado',     icon: 'cart-outline' },
  { id: '2', name: 'Gasolina',   icon: 'gas-station-outline' },
  { id: '3', name: 'Aluguel',    icon: 'home-outline' },
  { id: '4', name: 'Lazer',      icon: 'movie-open-outline' },
  { id: '5', name: 'Saúde',      icon: 'pill' },
  { id: '6', name: 'Transporte', icon: 'bus-outline' },
  { id: '7', name: 'Salário',    icon: 'cash-multiple' },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);
