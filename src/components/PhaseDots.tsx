import { PHASE_ORDER, type Phase } from '../model/session';

type PhaseDotsProps = {
  current: Phase;
  onDotClick?: (phase: Phase) => void;
};

export function PhaseDots({ current, onDotClick }: PhaseDotsProps) {
  return (
    <ol className="phase-dots" aria-label="Session phases">
      {PHASE_ORDER.map((p) => {
        const idx = PHASE_ORDER.indexOf(p);
        const currentIdx = PHASE_ORDER.indexOf(current);
        const reached = idx <= currentIdx;
        return (
          <li key={p}>
            <button
              type="button"
              className={`phase-dot ${reached ? 'reached' : ''} ${p === current ? 'current' : ''}`}
              aria-current={p === current ? 'step' : undefined}
              aria-label={p.replace('_', ' ')}
              onClick={() => onDotClick?.(p)}
            />
          </li>
        );
      })}
    </ol>
  );
}

