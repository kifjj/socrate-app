import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaseDots } from './PhaseDots';
import { type Phase, type Session, nextPhase, canTransition } from '../model/session';
import { getSessionStore, type SessionStore } from '../db/sessionDB';
import { NotesDrawer } from './NotesDrawer';

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

  // Local editor text mirrors points (one per line)
  const [editorText, setEditorText] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await store.get(sessionId);
      if (!cancelled) {
        setSession(s ?? null);
        // default drawer open only in paste
        setDrawerOpen((s?.phase ?? 'paste') === 'paste');
        setEditorText((s?.points ?? []).join('\n'));
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
      // Update editorText when entering write_points to reflect current points
      if (to === 'write_points') {
        setEditorText((updated.points ?? []).join('\n'));
        setTimeout(() => editorRef.current?.focus(), 0);
      }
    },
    [save, session?.phase, sessionId]
  );

  const advance = useCallback(async () => {
    const cur = session?.phase ?? 'paste';
    const next = nextPhase(cur);
    await setPhase(next);
  }, [session?.phase, setPhase]);

  const onSourceNotesChange = useCallback(
    async (val: string) => {
      await save({ id: sessionId, sourceNotes: val });
    },
    [save, sessionId]
  );

  const onPointsChange = useCallback(
    async (val: string) => {
      setEditorText(val);
      if ((session?.phase ?? 'paste') !== 'write_points') return;
      const lines = val.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      await save({ id: sessionId, points: lines });
    },
    [save, session?.phase, sessionId]
  );

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
          ) : (
            <textarea
              ref={editorRef}
              className="editor-textarea"
              placeholder={
                phase === 'write_points'
                  ? 'Write your points — one per line…'
                  : 'Editor — notes are visible only in Paste. Advance to hide notes.'
              }
              readOnly={phase !== 'write_points'}
              value={editorText}
              onChange={(e) => onPointsChange(e.target.value)}
            />
          )}
        </main>
      </div>

      <footer className="shell-footer">
        <button
          type="button"
          onClick={() => void advance()}
          disabled={phase === 'write_points'}
        >
          Advance (Ctrl/⌘+Enter)
        </button>
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

