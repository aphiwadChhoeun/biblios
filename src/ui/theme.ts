import { CategoryId } from '../engine/types';

export const CATEGORY_COLOR: Record<CategoryId, string> = {
  fuel: '#3b82f6',
  crew: '#a16207',
  artifact: '#dc2626',
  chart: '#16a34a',
  data: '#ea580c',
};

export const CATEGORY_ICON: Record<CategoryId, string> = {
  fuel: '⛽',
  crew: '🧑‍🚀',
  artifact: '👽',
  chart: '🗺️',
  data: '📡',
};
