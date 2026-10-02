import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";
import type { StoredSong } from "./blend";

export const MAX_MEMBERS = 8;
export const MEMBER_COLORS = ["#FF8A5B", "#6EA8FF", "#C9A2FF", "#7FD1B9", "#FFD36B", "#FF9FC6", "#B8E07A", "#8EC5FF"];

export interface HistoryStats {
  musicPlays: number;
  uniqueSongs: number;
  from: string | null;
  to: string | null;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  songs: StoredSong[];
  stats: HistoryStats;
  createdAt: string;
}

// Readable, hard to guess: no 0/O/1/l/I
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function randomId(len: number) {
  const bytes = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type MemberRow = {
  id: string;
  name: string;
  color: string;
  songs: StoredSong[] | string;
  stats: HistoryStats | string;
  created_at: string | Date;
  token_hash?: string;
};

function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    songs: typeof r.songs === "string" ? JSON.parse(r.songs) : r.songs,
    stats: typeof r.stats === "string" ? JSON.parse(r.stats) : r.stats,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function createBlend(input: { name: string; songs: StoredSong[]; stats: HistoryStats }) {
  const db = await getDb();
  const blendId = randomId(8);
  await db.query("insert into blends (id) values ($1)", [blendId]);
  const member = await insertMember(blendId, input, 0);
  return { blendId, ...member };
}

export async function joinBlend(blendId: string, input: { name: string; songs: StoredSong[]; stats: HistoryStats }) {
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from members where blend_id = $1", [blendId]);
  if (n >= MAX_MEMBERS) throw new Error("This blend is full.");
  return insertMember(blendId, input, n);
}

async function insertMember(blendId: string, input: { name: string; songs: StoredSong[]; stats: HistoryStats }, index: number) {
  const db = await getDb();
  const memberId = randomId(10);
  const token = randomBytes(24).toString("base64url");
  await db.query(
    "insert into members (id, blend_id, token_hash, name, color, songs, stats) values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)",
    [memberId, blendId, hash(token), input.name, MEMBER_COLORS[index % MEMBER_COLORS.length], JSON.stringify(input.songs), JSON.stringify(input.stats)],
  );
  return { memberId, token };
}

export async function blendExists(blendId: string) {
  const db = await getDb();
  const rows = await db.query("select 1 from blends where id = $1", [blendId]);
  return rows.length > 0;
}

export async function getMembers(blendId: string): Promise<Member[]> {
  const db = await getDb();
  const rows = await db.query<MemberRow>(
    "select id, name, color, songs, stats, created_at from members where blend_id = $1 order by created_at asc",
    [blendId],
  );
  return rows.map(toMember);
}

/** Returns the member id if the cookie token belongs to a member of this blend. */
export async function verifyMember(blendId: string, memberId: string, token: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query<{ token_hash: string }>("select token_hash from members where id = $1 and blend_id = $2", [memberId, blendId]);
  return rows.length > 0 && safeEqual(rows[0].token_hash, hash(token));
}

export async function updateMemberHistory(memberId: string, songs: StoredSong[], stats: HistoryStats) {
  const db = await getDb();
  await db.query("update members set songs = $2::jsonb, stats = $3::jsonb where id = $1", [memberId, JSON.stringify(songs), JSON.stringify(stats)]);
}

/** Leave a blend. The blend is deleted when its last member leaves. */
export async function leaveBlend(blendId: string, memberId: string) {
  const db = await getDb();
  await db.query("delete from members where id = $1 and blend_id = $2", [memberId, blendId]);
  const left = await db.query("select 1 from members where blend_id = $1 limit 1", [blendId]);
  if (left.length === 0) await db.query("delete from blends where id = $1", [blendId]);
}

export async function blendSummaries(blendIds: string[]) {
  if (blendIds.length === 0) return [];
  const db = await getDb();
  const rows = await db.query<{ blend_id: string; name: string; color: string; created_at: string }>(
    "select blend_id, name, color, created_at from members where blend_id = any($1::text[]) order by created_at asc",
    [blendIds],
  );
  const map = new Map<string, { name: string; color: string }[]>();
  for (const r of rows) map.set(r.blend_id, [...(map.get(r.blend_id) ?? []), { name: r.name, color: r.color }]);
  return blendIds.filter((id) => map.has(id)).map((id) => ({ id, members: map.get(id)! }));
}
