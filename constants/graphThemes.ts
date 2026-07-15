import type { GraphThemePresetId } from '@/types/graphTypes';

export interface GraphThemePreset {
  id: GraphThemePresetId;
  name: string;
  colors: readonly [string, string, string, string, string, string];
}

export const GRAPH_THEME_PRESETS: readonly GraphThemePreset[] = [
  { id: 'classic', name: '經典明亮', colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'] },
  { id: 'ocean', name: '深海藍調', colors: ['#1D4ED8', '#0284C7', '#0891B2', '#0F766E', '#2563EB', '#38BDF8'] },
  { id: 'emerald', name: '翡翠森林', colors: ['#047857', '#059669', '#0D9488', '#65A30D', '#16A34A', '#14B8A6'] },
  { id: 'sunset', name: '暖陽大地', colors: ['#C2410C', '#EA580C', '#D97706', '#CA8A04', '#DC2626', '#DB2777'] },
  { id: 'lavender', name: '薰衣草', colors: ['#6D28D9', '#7C3AED', '#9333EA', '#C026D3', '#4F46E5', '#A855F7'] },
  { id: 'midnight', name: '午夜霓虹', colors: ['#4F46E5', '#7C3AED', '#0891B2', '#DB2777', '#2563EB', '#059669'] },
] as const;

export function getGraphThemePreset(id: GraphThemePresetId): GraphThemePreset {
  return GRAPH_THEME_PRESETS.find((preset) => preset.id === id) ?? GRAPH_THEME_PRESETS[0];
}
