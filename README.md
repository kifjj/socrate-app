## Socrate (KAN-13) — MVP scaffold

Locked stack:

- Vite + React + TypeScript
- Dexie (IndexedDB) for local-first drafts (partitioned by `userId`, default `anonymous`)
- `vite-plugin-pwa` for installable PWA
- Small typed enum + transitions for session phases (not XState)
- Deploy: Vercel (Git integration; deploy-on-merge to `main`)
- Auth: Supabase Auth (Google allowlist, KAN-12)

### Session model (architect lock)

```ts
type Phase =
  | 'paste'
  | 'hide_notes'
  | 'write_points'
  | 'elaborate'
  | 'gap_review'
  | 'spaced_return';

type Session = {
  id: string;
  phase: Phase;
  sourceNotes: string;
  points: string[];
  elaborations: Record<string, string>;
  gaps: string[];
  updatedAt: number;
};
```

The model lives in `src/model/session.ts`. A tiny transition helper is provided (`nextPhase`, `canTransition`).

Draft autosave belongs in Dexie and survives refresh; restoring a draft keeps the same `id` + `phase`.

### Local development

```bash
npm install
npm run dev

# typecheck + build
npm run typecheck
npm run build

# preview the production build
npm run preview
```

### Dexie store (local-first)

- Module: `src/db/sessionDB.ts`
- Table: `sessions` with a compound primary key `[userId+id]`
- API: `getSessionStore(userId = 'anonymous')` exposes `get/put/upsert/remove/list/clearAll`
- The exported `Session` type is the architect-locked model above. Internal persistence adds `userId` only for partitioning and does not change the public `Session` shape.

### PWA

- Configured via `vite-plugin-pwa` in `vite.config.ts`
- `registerType: 'autoUpdate'` is used; a basic Workbox setup is included
- Icons are intentionally omitted for now; add real brand assets later

### Deploy: Vercel (deploy-on-merge to `main`)

Prefer Vercel’s Git integration over custom GitHub Actions.

1. Create/select a Vercel team or personal account.
2. “Add New Project” → “Import Git Repository” and select this repo.
3. Framework preset: “Other” (static build). Build command `npm run build`, output dir `dist`. This repo already includes `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

4. Connect to the `main` branch. Vercel will auto-deploy on every merge to `main`.
5. Open a PR to test preview deployments; Vercel will post preview URLs automatically.

### Environment variables (Auth later — KAN-12)

Supabase Auth (Google) is wired in KAN-12. Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Allowlist is currently hardcoded to `aldojj@gmail.com` in `src/auth/AuthProvider.tsx`

Do not commit real secrets. Use Vercel Project → Settings → Environment Variables for production/staging, and a local `.env` (ignored) for development.

An `.env.example` is provided; copy to `.env` locally and fill in placeholders:

```bash
cp .env.example .env
```

#### Google OAuth redirect

- In Supabase Auth → Providers → Google, set the redirect URL to your deployed domain (production) and Vercel preview domains as needed. During local dev, use your origin (e.g. `http://localhost:5173`).
- This app uses `signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin }})`. Ensure that origin is allowed in Supabase.

#### Gate behavior (KAN-12)

- Flow: SignedOut → Google OAuth → AllowlistCheck → InApp | Denied
- Denied users never see session/write UI. "Sign out" returns to SignedOut.
- Dexie and session routes are initialized only after allowlist passes.
- Soft re-gate on next load only: mid-session token blips do not clear drafts.

### Notes

- App name: “Socrate” (`socrate-app`)
- Minimal placeholder UI only (the full paste→write loop is KAN-4+)
- No mobile-native work in scope
