import { CategoryId, Phase } from '../engine/types';

// NASA palette, lifted where needed for legibility on the dark hull. Crew keeps
// NASA blue in spirit but #0b3d91 is unreadable against #0d1526, so the UI hue
// is the brightened variant; the deep blue survives as structural chrome in CSS.
export const CATEGORY_COLOR: Record<CategoryId, string> = {
  fuel: '#ffb612',
  crew: '#4d8bf5',
  artifact: '#fc3d21',
  chart: '#c7cdd4',
  data: '#00b4d8',
};

export const CATEGORY_ICON: Record<CategoryId, string> = {
  fuel: '⛽',
  crew: '🧑‍🚀',
  artifact: '👽',
  chart: '🗺️',
  data: '📡',
};

// Short nomenclature for the gauge faces, where the full label will not fit.
export const CATEGORY_SHORT: Record<CategoryId, string> = {
  fuel: 'Fuel',
  crew: 'Crew',
  artifact: 'Artifact',
  chart: 'Charts',
  data: 'Data',
};

export const PHASE_LABEL: Record<Phase, string> = {
  gift: 'Supply Phase',
  auction: 'Auction Phase',
  scoring: 'Scoring',
};
