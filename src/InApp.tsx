import { useEffect, useMemo, useRef, useState } from 'react';
import { type Session } from './model/session';
import { getSessionStore } from './db/sessionDB';
import { SessionShell } from './components/SessionShell';

type Props = {
  userId: string;
  email: string;
  onSignOut: () => void;
};

export default function InApp({ userId, email, onSignOut }: Props) {
  const store = useMemo(() => getSessionStore(userId), [userId]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const pasteStartRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // On identity change, immediately clear and refresh from this user's partition.
    setSessions([]);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function refresh() {
    const rows = await store.list();
    setSessions(rows);
  }

  async function startNewSession(initialNotes?: string) {
    const id = crypto.randomUUID();
    const session: Session = {
      id,
      phase: 'paste',
      sourceNotes: initialNotes ?? '',
      points: [],
      elaborations: {},
      gaps: [],
      updatedAt: Date.now()
    };
    await store.put(session);
    await refresh();
    setActiveSessionId(id);
  }

  async function remove(id: string) {
    await store.remove(id);
    await refresh();
  }

  if (activeSessionId) {
    return (
      <SessionShell
        userId={userId}
        email={email}
        sessionId={activeSessionId}
        onExit={() => setActiveSessionId(null)}
        onSignOut={onSignOut}
      />
    );
  }

  const last = sessions[0];

  return (
    <div className="container">
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Socrate</h1>
        <div className="row" aria-label="Account menu" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: '0.9rem' }}>
            {email}
          </span>
          <button className="ghost" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <div style={{ height: 16 }} />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Start a session</h2>
        <p className="muted">Paste notes or upload a plain-text file to begin.</p>
        <div className="row">
          <button onClick={() => void startNewSession()}>Start a session</button>
          {last ? (
            <button className="ghost" onClick={() => setActiveSessionId(last.id)}>
              Resume last session ({last.phase})
            </button>
          ) : null}
        </div>
        <div style={{ height: 12 }} />
        <textarea
          ref={pasteStartRef}
          className="start-textarea"
          placeholder="Paste notes here to create a session…"
          rows={6}
          onChange={(e) => {
            const val = e.target.value;
            if (val && val.trim().length > 0) {
              // Create once and then clear this surface
              void startNewSession(val);
            }
          }}
        />
        <div style={{ height: 12 }} />
        <label className="file-upload">
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const text = String(reader.result ?? '');
                void startNewSession(text);
              };
              reader.readAsText(file);
              // reset input value to allow re-uploading same file later
              e.currentTarget.value = '';
            }}
          />
          Upload .txt
        </label>
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
                  <button onClick={() => setActiveSessionId(s.id)}>Open</button>
                  <button className="ghost" onClick={() => remove(s.id)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

