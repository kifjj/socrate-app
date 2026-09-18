import { useEffect, useMemo, useRef } from 'react';

type WritePointsProps = {
  points: string[]; // raw slots, may include empty strings
  onChangePoint: (index: number, value: string) => void;
  onAddPoint: () => void;
  maxPoints?: number; // default 5
  showError: boolean;
  onClearError: () => void;
};

export function WritePoints({
  points,
  onChangePoint,
  onAddPoint,
  maxPoints = 5,
  showError,
  onClearError
}: WritePointsProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const trimmedCount = useMemo(
    () => points.map((p) => p.trim()).filter((p) => p.length > 0).length,
    [points]
  );
  const canAddMore = points.length < maxPoints;

  // Focus first empty row (or first row) when entering
  useEffect(() => {
    const firstEmptyIdx = points.findIndex((p) => p.trim().length === 0);
    const idxToFocus = firstEmptyIdx >= 0 ? firstEmptyIdx : 0;
    inputsRef.current[idxToFocus]?.focus();
    // Place caret at end for non-empty
    const el = inputsRef.current[idxToFocus];
    if (el) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, []); // on mount only

  return (
    <div className="points-surface" role="region" aria-label="Write points">
      <div className="points-header">
        <div className="points-count-badge" aria-live="polite">
          {trimmedCount === 0 ? 'need 3' : `${trimmedCount} / ${maxPoints}`}
        </div>
        <div className="points-hint">3–5 key points, your words.</div>
      </div>

      {showError ? (
        <div className="points-error" role="alert">
          Add at least 3 points
        </div>
      ) : null}

      <ol className="points-list">
        {points.map((point, idx) => (
          <li key={idx} className="points-item">
            <input
              ref={(el) => (inputsRef.current[idx] = el)}
              type="text"
              className="points-input"
              value={point}
              onChange={(e) => {
                if (showError) onClearError();
                onChangePoint(idx, e.target.value);
              }}
              placeholder={`Point ${idx + 1}`}
              inputMode="text"
              aria-label={`Point ${idx + 1}`}
            />
          </li>
        ))}
      </ol>

      <div className="points-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            if (showError) onClearError();
            onAddPoint();
          }}
          disabled={!canAddMore}
          aria-disabled={!canAddMore}
        >
          Add point
        </button>
      </div>
    </div>
  );
}

