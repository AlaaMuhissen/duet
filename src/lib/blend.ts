import { normKey } from "./history/normalize";
import type { Library } from "./history/types";

/** The compact song list we store per member. The raw history never leaves the browser. */
export interface StoredSong {
  key: string; // normalized "artist|title"
  title: string;
  artist: string;
  plays: number;
  videoId: string; // the member's most played upload of this song
}

export const MAX_SONGS_STORED = 1500;

export function toStoredSongs(lib: Library): StoredSong[] {
  return lib.songs.slice(0, MAX_SONGS_STORED).map((s) => ({
    key: s.key,
    title: s.title,
    artist: s.artist,
    plays: s.plays,
    videoId: s.topVideoId,
  }));
}

export interface BlendSong {
  key: string;
  title: string;
  artist: string;
  videoId: string;
  plays: number[]; // per member, 0 = never played
}

export type BlendMode = "all" | "any2";

/**
 * Songs shared by the group.
 * "all": every member played it. "any2": at least 2 members played it.
 * Ranked by the second-highest play count, so a song only one person loves doesn't top the list.
 */
export function blendSongs(members: StoredSong[][], mode: BlendMode = "all"): BlendSong[] {
  const maps = members.map((songs) => new Map(songs.map((s) => [s.key, s])));
  const keys = new Set(members.flat().map((s) => s.key));
  const need = mode === "all" ? members.length : 2;

  const out: (BlendSong & { score: number })[] = [];
  for (const key of keys) {
    const found = maps.map((m) => m.get(key));
    const present = found.filter((s): s is StoredSong => !!s);
    if (present.length < need) continue;

    const plays = found.map((s) => s?.plays ?? 0);
    const sorted = [...plays].sort((a, b) => b - a);
    const best = present.reduce((a, b) => (b.plays > a.plays ? b : a));
    out.push({
      key,
      title: best.title,
      artist: best.artist,
      videoId: best.videoId,
      plays,
      score: sorted[need - 1] * 1000 + sorted.reduce((a, b) => a + b, 0),
    });
  }
  return out.sort((a, b) => b.score - a.score).map((s) => ({ key: s.key, title: s.title, artist: s.artist, videoId: s.videoId, plays: s.plays }));
}

/**
 * How similar two people's listening is, 0 to 100.
 * Weighted overlap of each person's "share of plays" per song, square-rooted so
 * normal people don't all land at 3%. Tune with real data.
 */
export function matchPercent(a: StoredSong[], b: StoredSong[]): number {
  const total = (xs: StoredSong[]) => xs.reduce((s, x) => s + x.plays, 0) || 1;
  const ta = total(a);
  const tb = total(b);
  const bm = new Map(b.map((s) => [s.key, s.plays]));
  let overlap = 0;
  for (const s of a) {
    const p = bm.get(s.key);
    if (p) overlap += Math.min(s.plays / ta, p / tb);
  }
  return Math.min(100, Math.round(Math.sqrt(overlap) * 100));
}

export interface SharedArtist {
  name: string;
  plays: number[]; // total plays per member
}

/** Artists every member plays, even if they play different songs. */
export function sharedArtists(members: StoredSong[][], limit = 12): SharedArtist[] {
  const perMember = members.map((songs) => {
    const m = new Map<string, { name: string; plays: number }>();
    for (const s of songs) {
      const k = normKey(s.artist);
      if (!k) continue;
      const cur = m.get(k) ?? { name: s.artist, plays: 0 };
      cur.plays += s.plays;
      m.set(k, cur);
    }
    return m;
  });
  const out: (SharedArtist & { min: number })[] = [];
  for (const [k, first] of perMember[0]) {
    const all = perMember.map((m) => m.get(k));
    if (all.some((x) => !x)) continue;
    const plays = all.map((x) => x!.plays);
    out.push({ name: first.name, plays, min: Math.min(...plays) });
  }
  return out
    .sort((a, b) => b.min - a.min)
    .slice(0, limit)
    .map((a) => ({ name: a.name, plays: a.plays }));
}

/** Songs `other` plays by artists both of you play, that `me` has never played. */
export function suggestionsFrom(me: StoredSong[], other: StoredSong[], artists: SharedArtist[], limit = 6): StoredSong[] {
  const mine = new Set(me.map((s) => s.key));
  const names = new Set(artists.map((a) => normKey(a.name)));
  return other.filter((s) => !mine.has(s.key) && names.has(normKey(s.artist))).slice(0, limit);
}
