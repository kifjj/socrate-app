import React from 'react';

type Props = {
  onSignIn: () => void;
  isLoading?: boolean;
  error?: string;
};

export function SignedOut({ onSignIn, isLoading, error }: Props) {
  return (
    <div style={deskStyle}>
      <div style={panelStyle} role="dialog" aria-labelledby="socrate-title" aria-modal="true">
        <h1 id="socrate-title" style={{ marginTop: 0, marginBottom: 8, fontSize: '1.5rem' }}>
          Socrate
        </h1>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          Closed-book writing — sign in to continue
        </p>
        {error ? (
          <p role="alert" style={{ color: '#fca5a5', marginTop: 0 }}>
            {error}
          </p>
        ) : null}
        <div style={{ height: 8 }} />
        <button
          onClick={onSignIn}
          disabled={!!isLoading}
          autoFocus
          aria-busy={!!isLoading}
          style={{ width: '100%' }}
        >
          {isLoading ? 'Signing in…' : 'Continue with Google'}
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

