import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaseDots } from './PhaseDots';
import { type Phase, type Session, nextPhase, canTransition } from '../model/session';
import { getSessionStore, type SessionStore } from '../db/sessionDB';
import { NotesDrawer } from './NotesDrawer';
import { WritePoints } from './WritePoints';

type SessionShellProps = {
  userId: string;
  email?: string;
  onSignOut?: () => void;
  sessionId: string;
  onExit: () => void;
};

export function SessionShell({ userId, email, onSignOut, sessionId, onExit }: SessionShellProps) {
  const store = useMemo<SessionStore>(() => getSessionStore(userId), [userId]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Local editor text mirrors points (one per line) for legacy view (non-write phases)
  const [editorText, setEditorText] = useState('');
  // Write points local state (slots; may include empty strings)
  const [pointsDraft, setPointsDraft] = useState<string[]>([]);
  const [pointsError, setPointsError] = useState(false); // inline error when Advance pressed <3
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await store.get(sessionId);
      if (!cancelled) {
        let initial = s ?? null;
        // Coerce legacy later phases back to write_points (keep clamp from #7)
        if (initial && (initial.phase === 'elaborate' || initial.phase === 'gap_review' || initial.phase === 'spaced_return')) {
          initial = await save({ id: initial.id, phase: 'write_points' });
        } else {
          setSession(initial);
        }
        // default drawer open only in paste
        setDrawerOpen((initial?.phase ?? 'paste') === 'paste');
        setEditorText((initial?.points ?? []).join('\n'));
        const pts = initial?.points ?? [];
        if (initial?.phase === 'write_points' && pts.length === 0) {
          const withSlot = [''];
          setPointsDraft(withSlot);
          void save({ id: initial.id, points: withSlot });
        } else {
          setPointsDraft(pts);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, store]);

  // Autosave helpers
  const save = useCallback(
    async (partial: Partial<Omit<Session, 'id'>> & { id: string }) => {
      const updated = await store.upsert(partial);
      setSession(updated);
      return updated;
    },
    [store]
  );

  // Keyboard: Ctrl/Cmd+Enter advances; Esc closes drawer (when allowed)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void advance();
      }
      if (e.key === 'Escape') {
        if (session?.phase === 'paste' && drawerOpen) {
          setDrawerOpen(false);
          // Focus main editor
          setTimeout(() => editorRef.current?.focus(), 0);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [session?.phase, drawerOpen]);

  const setPhase = useCallback(
    async (to: Phase) => {
      const from = session?.phase ?? 'paste';
      // Allow a single backwards escape from hide_notes -> paste (cancel)
      const allowed = canTransition(from, to) || (from === 'hide_notes' && to === 'paste');
      if (!allowed) return;
      const updated = await save({ id: sessionId, phase: to });
      // Drawer visibility rules
      if (to === 'paste') setDrawerOpen(true);
      else setDrawerOpen(false);
      // Entering write_points: initialize points UI
      if (to === 'write_points') {
        const pts = updated.points ?? [];
        if (pts.length === 0) {
          const withSlot = [''];
          setPointsDraft(withSlot);
          void save({ id: sessionId, points: withSlot });
        } else {
          setPointsDraft(pts);
        }
        setPointsError(false);
        setJustSubmitted(false);
      }
    },
    [save, session?.phase, sessionId]
  );

  const trimmedCount = useMemo(
    () => pointsDraft.map((s) => s.trim()).filter((s) => s.length > 0).length,
    [pointsDraft]
  );
  const advance = useCallback(async () => {
    const cur = session?.phase ?? 'paste';
    if (cur === 'write_points') {
      if (trimmedCount < 3) {
        setPointsError(true);
        return;
      }
      // Soft-complete points: persist trimmed non-empty points and exit SessionShell.
      setPointsError(false);
      const finalized = pointsDraft.map((s) => s.trim()).filter((s) => s.length > 0);
      await save({ id: sessionId, points: finalized });
      onExit(); // keep phase as write_points; do not transition to elaborate
      return;
    }
    const next = nextPhase(cur);
    await setPhase(next);
  }, [session?.phase, trimmedCount, save, sessionId, pointsDraft, setPhase]);

  const onSourceNotesChange = useCallback(
    async (val: string) => {
      await save({ id: sessionId, sourceNotes: val });
    },
    [save, sessionId]
  );

  // Points mutations
  const onChangePoint = useCallback(
    async (index: number, value: string) => {
      setPointsError(false);
      setJustSubmitted(false);
      setPointsDraft((prev) => {
        const next = prev.slice();
        next[index] = value;
        void save({ id: sessionId, points: next });
        return next;
      });
    },
    [save, sessionId]
  );

  const onAddPoint = useCallback(() => {
    setPointsError(false);
    setJustSubmitted(false);
    setPointsDraft((prev) => {
      if (prev.length >= 5) return prev;
      const next = [...prev, ''];
      void save({ id: sessionId, points: next });
      return next;
    });
  }, [save, sessionId]);

  if (loading || !session) {
    return (
      <div className="full-bleed">
        <header className="shell-header">
          <div className="brand">Socrate</div>
          <PhaseDots current={'paste'} />
          <div className="account">{email ?? '—'}</div>
        </header>
        <main className="editor-area">
          <p className="muted">Loading session…</p>
        </main>
      </div>
    );
  }

  const phase = session.phase;
  const showDrawer = phase === 'paste' && drawerOpen;

  return (
    <div className="full-bleed">
      <header className="shell-header">
        <div className="brand">Socrate</div>
        <PhaseDots current={phase} />
        <div className="account">
          <span className="muted" style={{ fontSize: '0.9rem' }}>
            {email ?? ''}
          </span>
          {onSignOut ? (
            <button type="button" className="ghost" onClick={onSignOut} title="Sign out">
              Sign out
            </button>
          ) : null}
          <div className="spacer" />
          <button type="button" className="ghost" onClick={onExit}>
            Exit
          </button>
        </div>
      </header>

      <div className="shell-body">
        {/* Left-edge Notes tab appears only in paste phase when drawer is closed */}
        {phase === 'paste' && !showDrawer ? (
          <button
            type="button"
            className="notes-tab"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open notes drawer"
            title="Open notes"
          >
            Notes
          </button>
        ) : null}
        {/* Notes drawer mounts only in paste and when open */}
        {showDrawer ? (
          <NotesDrawer
            open={showDrawer}
            sourceNotes={session.sourceNotes}
            onChange={onSourceNotesChange}
            onClose={() => setDrawerOpen(false)}
          />
        ) : null}

        <main className={`editor-area ${showDrawer ? 'with-drawer' : ''}`}>
          {phase === 'hide_notes' ? (
            <HideConfirm onCancel={() => setPhase('paste')} onProceed={() => setPhase('write_points')} />
          ) : phase === 'write_points' ? (
            <WritePoints
              points={pointsDraft}
              onChangePoint={onChangePoint}
              onAddPoint={onAddPoint}
              showError={pointsError}
              onClearError={() => setPointsError(false)}
            />
          ) : (
            <textarea
              ref={editorRef}
              className="editor-textarea"
              placeholder="Editor — notes are visible only in Paste. Advance to hide notes."
              readOnly
              value={editorText}
              onChange={() => {}}
            />
          )}
        </main>
      </div>

      <footer className="shell-footer">
        <div className="row" style={{ gap: 8 }}>
          {justSubmitted ? <span className="muted">Points submitted ✓</span> : null}
          <button
            type="button"
            onClick={() => void advance()}
            disabled={phase === 'write_points' ? !(trimmedCount >= 3 && trimmedCount <= 5) : false}
          >
            {phase === 'write_points' ? 'Done (Ctrl/⌘+Enter)' : 'Advance (Ctrl/⌘+Enter)'}
          </button>
        </div>
      </footer>
    </div>
  );
}

function HideConfirm({ onCancel, onProceed }: { onCancel: () => void; onProceed: () => void }) {
  return (
    <div className="hide-confirm">
      <h2 style={{ marginTop: 0 }}>Hide notes and continue?</h2>
      <p className="muted">You will not be able to peek at your notes while writing points.</p>
      <div className="row">
        <button onClick={onProceed}>Hide notes and write points</button>
        <button className="ghost" onClick={onCancel}>
          Keep editing notes
        </button>
      </div>
    </div>
  );
}

