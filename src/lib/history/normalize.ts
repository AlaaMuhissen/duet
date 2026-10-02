/**
 * Text cleanup so different uploads of the same song get the same key.
 * "Amr Diab - Tamally Maak (Official Music Video) [HD]" on channel "AmrDiabVEVO"
 * and "Tamally Maak" on channel "Amr Diab - Topic" both become "amr diab|tamally maak".
 */

// "Watched " prefix in common Takeout languages. Add more as needed.
const WATCHED_PREFIXES = [
  /^watched\s+/i,
  /^צפית ב[-\s]?/, // Hebrew
  /^צפית\s+ב/,
  /^شاهدت\s+/, // Arabic
  /^تمت مشاهدة\s+/,
  /^a regardé\s+/i, // French
  /^has visto\s+/i, // Spanish
  /^angesehen:\s*/i, // German
  /^hai guardato\s+/i, // Italian
  /^смотрели\s+/i, // Russian
];

export function stripWatchedPrefix(title: string): string {
  for (const re of WATCHED_PREFIXES) {
    if (re.test(title)) return title.replace(re, "").trim();
  }
  return title.trim();
}

// Words inside () or [] that mean "this is just a version label, not part of the name"
const NOISE_WORDS =
  /(official|video|audio|lyric|lyrics|visualizer|visualiser|hd|hq|4k|remaster|remastered|clip|music|mv|m\/v|live|version|explicit|clean|full|كليب|فيديو|حصري|اوديو|أوديو|كلمات|بالكلمات|קליפ|רשמי|מילים)/i;

// Trailing junk after a separator: "Song | Official Video", "Song // 2023"
const TRAILING_SEPARATORS = /\s+[|/／｜]{1,2}\s+.*$/;

// Featured artists: "ft. X", "feat. X", "featuring X", "x X" is too risky to strip
const FEAT = /\s*[([]?\s*(ft\.?|feat\.?|featuring|مع)\s+[^)\]]*[)\]]?/gi;

export function cleanTitle(raw: string): string {
  let t = raw;
  // remove bracketed parts that are version labels
  t = t.replace(/[([{【「]([^)\]}】」]*)[)\]}】」]/g, (m, inner: string) =>
    NOISE_WORDS.test(inner) ? " " : m,
  );
  t = t.replace(TRAILING_SEPARATORS, "");
  t = t.replace(FEAT, " ");
  // unbracketed trailing labels: "Song Official Video", "أغنية - فيديو كليب"
  t = t.replace(/\s*[-–—]?\s*(official\s+(music\s+)?(video|audio|lyric video)|lyric video|lyrics|فيديو كليب|كليب|حصريا|קליפ רשמי)\s*$/i, "");
  return t.replace(/\s+/g, " ").trim();
}

/** Channel name to artist: "Amr Diab - Topic" -> "Amr Diab", "AmrDiabVEVO" -> "AmrDiab" */
export function channelToArtist(channel: string): { artist: string; isTopic: boolean; isVevo: boolean } {
  const c = channel.trim();
  const topic = c.match(/^(.*?)\s*-\s*Topic$/i);
  if (topic) return { artist: topic[1].trim(), isTopic: true, isVevo: false };
  const vevo = c.match(/^(.*?)\s*VEVO$/i);
  if (vevo) return { artist: splitCamel(vevo[1].trim()), isTopic: false, isVevo: true };
  const official = c.replace(/\s*(official|music|records|tv|channel|القناة الرسمية|الرسمية|رسמי)\s*$/i, "").trim();
  return { artist: official, isTopic: false, isVevo: false };
}

function splitCamel(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Lowercase, drop accents, normalize Arabic and Hebrew letter variants, keep letters and digits only */
export function normKey(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Latin accents
    .replace(/[ً-ٰٟـ]/g, "") // Arabic harakat + tatweel
    .replace(/[֑-ׇ]/g, "") // Hebrew niqqud
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Turn a video title + channel into { artist, title }.
 * Handles "Artist - Song" titles and Topic/VEVO channels.
 */
export function splitArtistTitle(videoTitle: string, channel: string): { artist: string; title: string } {
  const ch = channelToArtist(channel);
  const cleaned = cleanTitle(videoTitle);

  // Topic channels: title is the clean song name, channel is the artist
  if (ch.isTopic) return { artist: ch.artist, title: cleaned };

  // "Artist - Song" (also en dash, em dash, Arabic/Hebrew titles use the same)
  const dash = cleaned.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) {
    const left = dash[1].trim();
    const right = dash[2].trim();
    // If the channel name matches the right side, the order is "Song - Artist"
    if (ch.artist && normKey(right).includes(normKey(ch.artist)) && !normKey(left).includes(normKey(ch.artist))) {
      return { artist: right, title: left };
    }
    return { artist: left, title: right };
  }

  return { artist: ch.artist, title: cleaned };
}

export function songKey(artist: string, title: string): string {
  const a = normKey(artist).split(" ").filter(Boolean);
  // Drop artist words that leaked into the title ("Amr Diab Tamally Maak")
  const t = normKey(title)
    .split(" ")
    .filter((w) => !a.includes(w) || a.length === 0)
    .join(" ");
  return `${a.join(" ")}|${t || normKey(title)}`;
}
