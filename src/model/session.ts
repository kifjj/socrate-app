export type Phase =
  | 'paste'
  | 'hide_notes'
  | 'write_points'
  | 'elaborate'
  | 'gap_review'
  | 'spaced_return';

export type Session = {
  id: string;
  phase: Phase;
  sourceNotes: string;
  points: string[];
  elaborations: Record<string, string>;
  gaps: string[];
  updatedAt: number;
};

export const PHASE_ORDER: readonly Phase[] = [
  'paste',
  'hide_notes',
  'write_points',
  'elaborate',
  'gap_review',
  'spaced_return'
] as const;

const phaseIndex: Record<Phase, number> = PHASE_ORDER.reduce((acc, p, i) => {
  acc[p] = i;
  return acc;
}, {} as Record<Phase, number>);

export function nextPhase(current: Phase): Phase {
  const idx = phaseIndex[current];
  return PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
}

export function canTransition(from: Phase, to: Phase): boolean {
  return phaseIndex[to] >= phaseIndex[from];
}

export function isTerminal(phase: Phase): boolean {
  return phase === 'spaced_return';
}
