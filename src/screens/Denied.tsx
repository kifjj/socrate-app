import React from 'react';

type Props = {
  email?: string;
  onSignOut: () => void;
};

export function Denied({ email, onSignOut }: Props) {
  return (
    <div style={deskStyle}>
      <div style={panelStyle} role="dialog" aria-labelledby="denied-title" aria-modal="true">
        <h1 id="denied-title" style={{ marginTop: 0, marginBottom: 8, fontSize: '1.25rem' }}>
          Access restricted
        </h1>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          This app is private. Your Google account isn’t on the allowlist.
        </p>
        {email ? (
          <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
            Signed in as <strong>{email}</strong>
          </p>
        ) : null}
        <div style={{ height: 8 }} />
        <button onClick={onSignOut} autoFocus style={{ width: '100%' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

const deskStyle: React.CSSProperties = {
  minHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  background: 'var(--bg)'
};

const panelStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '1.25rem'
};

