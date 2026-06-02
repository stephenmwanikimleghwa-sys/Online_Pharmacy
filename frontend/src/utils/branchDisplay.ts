import { BranchInfo } from '../context/AuthContext';

/** Default location labels when branch.address is empty (legacy names). */
const SUBTITLE_BY_NAME: Record<string, string> = {
  TRANSCOUNTY_MAIN: 'Kitale Town',
  TRANSCOUNTY_ANNEX: 'Kitale Annex',
  PEAKFARM: 'Agrovet Branch',
};

export function getBranchSubtitle(branch: Pick<BranchInfo, 'name' | 'subtitle' | 'type'>): string {
  if (branch.subtitle?.trim()) return branch.subtitle.trim();
  if (branch.name && SUBTITLE_BY_NAME[branch.name]) return SUBTITLE_BY_NAME[branch.name];
  if (branch.type === 'AGROVET') return 'Agrovet Branch';
  return 'Chemist Branch';
}

export function getBranchIcon(branch: Pick<BranchInfo, 'type'>): string {
  return branch.type === 'AGROVET' ? '🌱' : '💊';
}

export function getBranchTypeLabel(type?: string): string {
  if (!type || type === 'CHEMIST') return 'Chemist';
  if (type === 'AGROVET') return 'Agrovet';
  return type;
}
