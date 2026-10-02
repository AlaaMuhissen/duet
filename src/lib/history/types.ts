/** One raw entry from Google Takeout watch-history.json */
export interface TakeoutEntry {
  header?: string; // "YouTube" or "YouTube Music"
  title?: string; // "Watched <video title>" (prefix is localized)
  titleUrl?: string; // https://www.youtube.com/watch?v=... or https://music.youtube.com/watch?v=...
  subtitles?: { name?: string; url?: string }[]; // channel, e.g. "Amr Diab - Topic"
  time?: string; // ISO timestamp
  products?: string[];
  details?: { name?: string }[]; // [{ name: "From Google Ads" }] for ads
}

/** One song in a person's library, after merging every upload of it */
export interface Song {
  key: string; // normalized "artist|title", used for matching
  title: string; // display title (cleaned)
  artist: string; // display artist ("" if unknown)
  plays: number;
  lastPlayed: string; // ISO timestamp
  videoIds: string[]; // every video that counted as this song
  topVideoId: string; // most played upload, used for playback
  source: "music" | "topic" | "pattern" | "category"; // why we think it's music
}

export interface Library {
  songs: Song[]; // sorted by plays, most first
  stats: {
    totalEntries: number;
    musicPlays: number;
    skippedNonMusic: number;
    skippedAds: number;
    skippedRemoved: number;
    skippedRepeats: number;
    uniqueSongs: number;
    from: string | null;
    to: string | null;
  };
}

export interface BlendSong {
  key: string;
  title: string;
  artist: string;
  videoId: string; // what to play
  plays: number[]; // plays per person, same order as the input libraries
  score: number; // ranking score
}

export interface Blend {
  songs: BlendSong[]; // songs everyone has, best first
  matchPercent: number; // 0 to 100
  pairs: { a: number; b: number; matchPercent: number; shared: number }[];
}

export interface ParseOptions {
  /** Ignore a replay of the same video within this many seconds (default 30) */
  repeatWindowSec?: number;
  /** Only count plays after this date (ISO), e.g. last 2 years */
  since?: string;
  /**
   * Video IDs known to be in YouTube's Music category (categoryId 10).
   * Fill it with fetchMusicCategoryIds() for videos the rules can't classify.
   */
  musicCategoryIds?: Set<string>;
}
