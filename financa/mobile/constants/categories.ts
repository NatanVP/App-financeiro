import { MaterialCommunityIcons } from '@expo/vector-icons';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface Category {
  id: string;
  name: string;
  icon: MCIName;
}

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Armazém',    icon: 'storefront-outline' },    // Mercado
  { id: '2', name: 'Estábulo',   icon: 'horse' },                  // Gasolina
  { id: '3', name: 'Taverna',    icon: 'home-outline' },          // Aluguel/Moradia
  { id: '4', name: 'Arena',      icon: 'sword-cross' },           // Lazer/Entretenimento
  { id: '5', name: 'Alquimia',   icon: 'flask-outline' },         // Saúde/Poções
  { id: '6', name: 'Caravana',   icon: 'transit-connection-variant' }, // Transporte/Viagem
  { id: '7', name: 'Recompensa', icon: 'seal-variant' },          // Salário/Income
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);
