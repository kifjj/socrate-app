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
  // KAN-4 clamp: do not advance past write_points until later phases exist
  const idx = phaseIndex[current];
  const writeIdx = phaseIndex['write_points'];
  if (idx >= writeIdx) return 'write_points';
  return PHASE_ORDER[Math.min(idx + 1, writeIdx)];
}

export function canTransition(from: Phase, to: Phase): boolean {
  // Disallow transitions beyond write_points (temporary clamp)
  const writeIdx = phaseIndex['write_points'];
  const toIdx = phaseIndex[to];
  if (toIdx > writeIdx) return false;
  return toIdx >= phaseIndex[from];
}

export function isTerminal(phase: Phase): boolean {
  // Treat write_points as terminal while later phases are unimplemented
  return phase === 'write_points';
}
