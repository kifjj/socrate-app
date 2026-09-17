import { useEffect, useMemo, useState } from 'react';
import { PHASE_ORDER, type Phase, type Session, nextPhase } from './model/session';
import { getSessionStore } from './db/sessionDB';

const DEFAULT_USER = 'anonymous';

export default function App() {
  const store = useMemo(() => getSessionStore(DEFAULT_USER), []);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    const rows = await store.list();
    setSessions(rows);
  }

  async function createDemoSession() {
    setCreating(true);
    try {
      const id = crypto.randomUUID();
      const session: Session = {
        id,
        phase: 'paste',
        sourceNotes: 'Paste your notes here…',
        points: [],
        elaborations: {},
        gaps: [],
        updatedAt: Date.now()
      };
      await store.put(session);
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function advance(id: string) {
    const existing = await store.get(id);
    if (!existing) return;
    const next = nextPhase(existing.phase as Phase);
    await store.upsert({ id, phase: next });
    await refresh();
  }

  async function remove(id: string) {
    await store.remove(id);
    await refresh();
  }

  return (
    <div className="container">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Socrate</h1>
        <a className="muted" href="https://vitejs.dev" target="_blank" rel="noreferrer">
          Vite + React + TS
        </a>
      </header>

      <div style={{ height: 16 }} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Welcome</h2>
        <p className="muted">
          This is a minimal scaffold for KAN-13: PWA + Dexie with session drafts. Auth and the full
          paste→write loop land in later tickets.
        </p>
        <div className="row">
          <button onClick={createDemoSession} disabled={creating}>
            {creating ? 'Creating…' : 'Create demo session'}
          </button>
        </div>
      </div>

      <div style={{ height: 24 }} />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Sessions (local)</h3>
        {sessions.length === 0 ? (
          <p className="muted">No sessions yet.</p>
        ) : (
          <ul>
            {sessions.map((s) => (
              <li key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  <strong>{s.id.slice(0, 8)}</strong> — phase {s.phase}
                </span>
                <span className="row">
                  <button onClick={() => advance(s.id)} disabled={s.phase === PHASE_ORDER.at(-1)}>
                    Advance
                  </button>
                  <button onClick={() => remove(s.id)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ height: 24 }} />

      <footer className="muted">
        Phases: {PHASE_ORDER.join(' → ')}. Drafts persist locally via IndexedDB (Dexie).
      </footer>
    </div>
  );
}
