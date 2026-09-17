import Dexie, { Table } from 'dexie';
import type { Session, Phase } from '../model/session';

// Internal record extends the architect-locked Session with userId for partitioning
type SessionRecord = Session & { userId: string };

class SocrateDB extends Dexie {
  sessions!: Table<SessionRecord, [string, string]>; // primary key: [userId, id]

  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      // Compound primary key on [userId+id]; index on userId and updatedAt
      sessions: '&[userId+id], userId, updatedAt'
    });
  }
}

/**
 * Maintain a single open Dexie instance per active Supabase user id.
 * We deliberately separate DB names by user to hard-partition data:
 *   - socrate_${userId}
 * On identity change, we tear down the old instance and open the new one.
 * We do NOT open any DB eagerly at module load.
 */
let activeDb: SocrateDB | null = null;
let activeUserId: string | null = null;

function ensureDbForUser(userId: string): SocrateDB {
  if (!userId) {
    throw new Error('ensureDbForUser requires a non-empty userId');
  }
  if (activeDb && activeUserId === userId) {
    return activeDb;
  }
  // Close previous DB (if any) before switching identities
  if (activeDb) {
    try {
      activeDb.close();
      // eslint-disable-next-line no-empty
    } catch {}
  }
  const dbName = `socrate_${userId}`;
  activeDb = new SocrateDB(dbName);
  activeUserId = userId;
  return activeDb;
}

export type SessionStore = {
  get(id: string): Promise<Session | undefined>;
  put(session: Session): Promise<void>;
  upsert(partial: Partial<Omit<Session, 'id'>> & { id: string }): Promise<Session>;
  remove(id: string): Promise<void>;
  list(): Promise<Session[]>;
  clearAll(): Promise<void>;
};

/**
 * Returns CRUD helpers scoped to a specific userId. Default is 'anonymous'
 * (KAN-11 will key by Supabase user.id; do not change Session shape here).
 */
export function getSessionStore(userId: string = 'anonymous'): SessionStore {
  const db = ensureDbForUser(userId);
  return {
    async get(id: string) {
      const rec = await db.sessions.get([userId, id]);
      return rec && stripUserId(rec);
    },
    async put(session: Session) {
      const now = Date.now();
      await db.sessions.put(withUserId({ ...session, updatedAt: now }, userId));
    },
    async upsert(partial) {
      const existing = await db.sessions.get([userId, partial.id]);
      const merged: Session = {
        id: partial.id,
        phase: (partial.phase ?? existing?.phase ?? 'paste') as Phase,
        sourceNotes: partial.sourceNotes ?? existing?.sourceNotes ?? '',
        points: partial.points ?? existing?.points ?? [],
        elaborations: partial.elaborations ?? existing?.elaborations ?? {},
        gaps: partial.gaps ?? existing?.gaps ?? [],
        updatedAt: Date.now()
      };
      await db.sessions.put(withUserId(merged, userId));
      return merged;
    },
    async remove(id: string) {
      await db.sessions.delete([userId, id]);
    },
    async list() {
      const rows = await db.sessions
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('updatedAt');
      return rows.map(stripUserId);
    },
    async clearAll() {
      await db.sessions.where('userId').equals(userId).delete();
    }
  };
}

function withUserId(session: Session, userId: string): SessionRecord {
  return { ...session, userId };
}

function stripUserId(rec: SessionRecord): Session {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _userId, ...session } = rec;
  return session;
}
