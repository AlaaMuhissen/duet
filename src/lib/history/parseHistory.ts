import type { Library, ParseOptions, Song, TakeoutEntry } from "./types";
import { channelToArtist, cleanTitle, normKey, songKey, splitArtistTitle, stripWatchedPrefix } from "./normalize";

// Title patterns that strongly suggest a music video on regular YouTube
const MUSIC_TITLE =
  /(official\s+(music\s+)?video|official\s+audio|lyric\s+video|\blyrics?\b|visuali[sz]er|music video|\bm\/?v\b|فيديو كليب|كليب|اغنية|أغنية|קליפ|שיר)/i;

export function videoIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1) || null;
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

type MusicSource = Song["source"] | null;

function isArtistChannelTitle(title: string, artist: string): boolean {
  const m = cleanTitle(title).match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m) return false;
  const a = normKey(artist);
  if (a.length < 2) return false;
  return normKey(m[1]) === a || normKey(m[2]) === a;
}

function classify(e: TakeoutEntry, videoId: string, title: string, channel: string, opts: ParseOptions): MusicSource {
  if (e.header === "YouTube Music" || (e.titleUrl ?? "").includes("music.youtube.com")) return "music";
  const ch = channelToArtist(channel);
  if (ch.isTopic) return "topic";
  if (ch.isVevo || MUSIC_TITLE.test(title)) return "pattern";
  // Artist's own channel posting "Artist - Song": channel name matches one side of the dash
  if (ch.artist && isArtistChannelTitle(title, ch.artist)) return "pattern";
  if (opts.musicCategoryIds?.has(videoId)) return "category";
  return null;
}

/** Video IDs the rules couldn't classify. Send these to fetchMusicCategoryIds() if you want more coverage. */
export function unclassifiedVideoIds(entries: TakeoutEntry[]): string[] {
  const ids = new Set<string>();
  for (const e of entries) {
    const id = videoIdFromUrl(e.titleUrl);
    if (!id || !e.subtitles?.length || e.details?.some((d) => /ads/i.test(d.name ?? ""))) continue;
    const title = stripWatchedPrefix(e.title ?? "");
    if (classify(e, id, title, e.subtitles[0].name ?? "", {}) === null) ids.add(id);
  }
  return [...ids];
}

export function parseHistory(entries: TakeoutEntry[], opts: ParseOptions = {}): Library {
  const repeatWindow = (opts.repeatWindowSec ?? 30) * 1000;
  const since = opts.since ? Date.parse(opts.since) : -Infinity;

  const stats: Library["stats"] = {
    totalEntries: entries.length,
    musicPlays: 0,
    skippedNonMusic: 0,
    skippedAds: 0,
    skippedRemoved: 0,
    skippedRepeats: 0,
    uniqueSongs: 0,
    from: null,
    to: null,
  };

  // Takeout is newest first. Process oldest first so the repeat check is simple.
  const sorted = [...entries].sort((a, b) => Date.parse(a.time ?? "") - Date.parse(b.time ?? ""));

  const byKey = new Map<string, Song & { perVideo: Map<string, number> }>();
  const lastSeen = new Map<string, number>(); // videoId -> timestamp

  for (const e of sorted) {
    const t = Date.parse(e.time ?? "");
    if (Number.isNaN(t) || t < since) continue;

    if (e.details?.some((d) => /ads/i.test(d.name ?? ""))) {
      stats.skippedAds++;
      continue;
    }

    const videoId = videoIdFromUrl(e.titleUrl);
    const rawTitle = stripWatchedPrefix(e.title ?? "");
    const channel = e.subtitles?.[0]?.name ?? "";

    // Deleted/private videos: no channel, title is just the URL
    if (!videoId || !channel || /^https?:\/\//.test(rawTitle)) {
      stats.skippedRemoved++;
      continue;
    }

    const source = classify(e, videoId, rawTitle, channel, opts);
    if (!source) {
      stats.skippedNonMusic++;
      continue;
    }

    const prev = lastSeen.get(videoId);
    lastSeen.set(videoId, t);
    if (prev !== undefined && t - prev < repeatWindow) {
      stats.skippedRepeats++;
      continue;
    }

    const { artist, title } = splitArtistTitle(rawTitle, channel);
    const key = songKey(artist, title);

    let song = byKey.get(key);
    if (!song) {
      song = { key, title, artist, plays: 0, lastPlayed: e.time!, videoIds: [], topVideoId: videoId, source, perVideo: new Map() };
      byKey.set(key, song);
    }
    song.plays++;
    song.lastPlayed = e.time!;
    song.perVideo.set(videoId, (song.perVideo.get(videoId) ?? 0) + 1);
    // Prefer the cleanest display name: Topic / YouTube Music entries win
    if ((source === "topic" || source === "music") && song.source !== "topic" && song.source !== "music") {
      song.title = title;
      song.artist = artist;
      song.source = source;
    }

    stats.musicPlays++;
    stats.from ??= e.time!;
    stats.to = e.time!;
  }

  mergeUnknownArtists(byKey);

  const songs: Song[] = [...byKey.values()]
    .map(({ perVideo, ...s }) => {
      const ranked = [...perVideo.entries()].sort((a, b) => b[1] - a[1]);
      return { ...s, videoIds: ranked.map(([id]) => id), topVideoId: ranked[0][0] };
    })
    .sort((a, b) => b.plays - a.plays);

  stats.uniqueSongs = songs.length;
  return { songs, stats };
}

/**
 * A song with no artist ("|tamally maak") is merged into a song with the same title
 * and a known artist ("amr diab|tamally maak"), if there's exactly one such song.
 */
function mergeUnknownArtists(byKey: Map<string, Song & { perVideo: Map<string, number> }>) {
  const byTitle = new Map<string, string[]>();
  for (const k of byKey.keys()) {
    const [a, t] = k.split("|");
    if (!a) continue;
    byTitle.set(t, [...(byTitle.get(t) ?? []), k]);
  }
  for (const [k, song] of byKey) {
    const [a, t] = k.split("|");
    if (a) continue;
    const targets = byTitle.get(t);
    if (targets?.length !== 1) continue;
    const target = byKey.get(targets[0])!;
    target.plays += song.plays;
    for (const [id, n] of song.perVideo) target.perVideo.set(id, (target.perVideo.get(id) ?? 0) + n);
    if (song.lastPlayed > target.lastPlayed) target.lastPlayed = song.lastPlayed;
    byKey.delete(k);
  }
}
