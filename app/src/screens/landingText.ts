import type { Skill } from '../exercises/schema.ts';

export const SKILL_LABEL: Record<Skill, string> = {
  hierarchy: 'Hierarchy',
  spacing: 'Spacing',
  alignment: 'Alignment',
  typography: 'Typography',
  color: 'Color',
};

export const pct = (n: number) => `${Math.round(n * 100)}%`;
