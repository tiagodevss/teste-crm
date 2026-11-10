import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Target,
  Kanban,
  TrendingUp,
  Users,
  PieChart,
  Building,
  Megaphone,
  LayoutGrid,
  Activity,
  Briefcase,
  ShoppingCart,
  Heart,
  Zap,
} from 'lucide-react';

/** Ícones permitidos para customização do pipe (nome salvo no banco). */
export const PIPE_ICON_NAMES = [
  'BarChart3',
  'Target',
  'Kanban',
  'TrendingUp',
  'Users',
  'PieChart',
  'Building',
  'Megaphone',
  'LayoutGrid',
  'Activity',
  'Briefcase',
  'ShoppingCart',
  'Heart',
  'Zap',
] as const;

export type PipeIconName = (typeof PIPE_ICON_NAMES)[number];

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Target,
  Kanban,
  TrendingUp,
  Users,
  PieChart,
  Building,
  Megaphone,
  LayoutGrid,
  Activity,
  Briefcase,
  ShoppingCart,
  Heart,
  Zap,
};

/** Opções para o seletor de ícone (value = nome Lucide, label = texto amigável). */
export const PIPE_ICON_OPTIONS: { value: PipeIconName; label: string }[] = [
  { value: 'BarChart3', label: 'Gráfico' },
  { value: 'Target', label: 'Alvo' },
  { value: 'Kanban', label: 'Kanban' },
  { value: 'TrendingUp', label: 'Tendência' },
  { value: 'Users', label: 'Usuários' },
  { value: 'PieChart', label: 'Pizza' },
  { value: 'Building', label: 'Empresa' },
  { value: 'Megaphone', label: 'Megafone' },
  { value: 'LayoutGrid', label: 'Grade' },
  { value: 'Activity', label: 'Atividade' },
  { value: 'Briefcase', label: 'Maleta' },
  { value: 'ShoppingCart', label: 'Carrinho' },
  { value: 'Heart', label: 'Coração' },
  { value: 'Zap', label: 'Raio' },
];

/**
 * Retorna o componente de ícone Lucide pelo nome salvo no banco.
 * Se inválido ou vazio, retorna BarChart3.
 */
export function getPipeIconComponent(iconName: string | null | undefined): LucideIcon {
  if (!iconName || typeof iconName !== 'string') return BarChart3;
  const Icon = ICON_MAP[iconName];
  return Icon ?? BarChart3;
}
