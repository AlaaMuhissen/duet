import "server-only";

/**
 * Tiny database layer with two drivers:
 * - DATABASE_URL set: real Postgres (Neon, Supabase, Railway, local) via postgres.js
 * - not set: PGlite, an embedded Postgres stored in ./.data, so `npm run dev` works with zero setup
 *
 * Both run the same SQL, so switching is just setting DATABASE_URL.
 */

type Row = Record<string, unknown>;
interface Db {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

const SCHEMA = `
create table if not exists blends (
  id text primary key,
  created_at timestamptz not null default now()
);
create table if not exists members (
  id text primary key,
  blend_id text not null references blends(id) on delete cascade,
  token_hash text not null,
  name text not null,
  color text not null,
  songs jsonb not null,
  stats jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists members_blend_idx on members(blend_id, created_at);
`;

const globalForDb = globalThis as unknown as { __duetDb?: Promise<Db> };

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 5, prepare: false, idle_timeout: 20 });
    const db: Db = {
      async query<T extends Row>(text: string, params: unknown[] = []) {
        return (await sql.unsafe(text, params as never[])) as unknown as T[];
      },
    };
    await sql.unsafe(SCHEMA);
    return db;
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string in your Vercel project settings.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdir } = await import("node:fs/promises");
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  await mkdir(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(SCHEMA);
  return {
    async query<T extends Row>(text: string, params: unknown[] = []) {
      const res = await pg.query<T>(text, params);
      return res.rows;
    },
  };
}

export function getDb(): Promise<Db> {
  globalForDb.__duetDb ??= createDb().catch((e) => {
    globalForDb.__duetDb = undefined; // retry on the next request instead of caching the failure
    throw e;
  });
  return globalForDb.__duetDb;
}
