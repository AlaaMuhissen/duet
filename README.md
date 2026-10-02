# duet

Compare YouTube watch history with friends and play every song you have in common.

1. Upload your Google Takeout watch history. It's read **in the browser**; only song names and play counts are saved.
2. Get a link and send it to friends.
3. They open it, add their history, and everyone gets the blend: the shared songs, ranked by how much you all play them, playable right on the page with the YouTube player.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and Postgres.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup needed: without `DATABASE_URL`, the app uses PGlite (Postgres running inside Node) and stores data in `./.data`.

To test with two people on one computer, use a normal window and a private window.

## Deploy (Vercel + Neon, both free tiers)

1. Create a Postgres database on [Neon](https://neon.tech) (or Supabase) and copy the connection string.
2. Push this project to GitHub and import it in [Vercel](https://vercel.com).
3. In Vercel → Settings → Environment Variables, add `DATABASE_URL` = your connection string.
4. Deploy. Tables are created automatically on the first request.

## How it works

```
Browser                                    Server (Next.js)                 Postgres
───────                                    ────────────────                 ────────
Takeout .zip
  └─ readTakeoutFile()   unzip, find history by content
  └─ parseHistory()      keep music, merge uploads, count plays
  └─ toStoredSongs()     top 1500 songs: key, title, artist, plays, videoId
        │ POST /api/blends  or  /api/blends/:id/join
        └────────────────────────────────▶ validate (zod) ─────────────▶ members.songs (jsonb)
                                           set httpOnly cookie
GET /b/:id ◀────────────────────────────── blendSongs(), matchPercent(),
                                           sharedArtists() computed per request
YouTube IFrame player plays videoId
```

**No accounts.** Creating or joining a blend sets an httpOnly cookie (`duet_<blendId>`) holding a random token. Only its SHA-256 hash is stored. That cookie is your identity in that blend: it lets you update your history or leave. Clearing cookies means losing access to your blends (fine for v1, see ideas below).

### Code map

| Path | What it does |
| --- | --- |
| `src/lib/history/` | Takeout reader and parser (runs in the browser) |
| `src/lib/blend.ts` | Matching: shared songs, match %, shared artists, suggestions |
| `src/lib/db.ts` | Postgres via `postgres.js`, or PGlite locally. Creates tables. |
| `src/lib/repo.ts` | All SQL: create/join/leave blends |
| `src/lib/session.ts` | Member cookie |
| `src/app/api/blends/**` | Create, join (or update history), leave |
| `src/app/b/[id]/page.tsx` | Decides what to show: join page, invite/waiting, or the blend |
| `src/components/HistoryFlow.tsx` | Takeout guide → reading → errors → summary → submit |
| `src/components/BlendView.tsx` | Blend page, group modes, match reveal, player UI |
| `src/components/useYouTubePlayer.ts` | YouTube IFrame Player API wrapper |

## Tests

End-to-end test with three fake people (creates a blend, joins, plays, group mode, leave, 404):

```bash
npm run build && npm start        # in one terminal
npm run e2e:data && npm run e2e   # in another
```

Screenshots go to `e2e/shots/`.

## Known limits

- **Music detection is rule-based** (YouTube Music plays, "- Topic" channels, VEVO, title patterns, "Artist - Song" on the artist's own channel). Songs on random channels with plain titles are missed.
- **Arabic vs Latin titles don't match yet**: "بحبك وبغار" and "Bhebbak W Bghar" count as different songs. Matching through YouTube's own track data (or a transliteration step) would fix it.
- **Match % is a first guess**: a square-root curve over shared play share. Tune it with real histories.
- **Playback**: some videos can't be embedded (the owner disabled it). The player skips them and says so. On iPhone, the first song may need a tap on the video to start.
- **"Open in YouTube"** uses `youtube.com/watch_videos?video_ids=…`, which is undocumented and could stop working.
- No rate limiting yet. Add it (e.g. Upstash) before sharing widely.

## Ideas for next versions

- Sign in with Google so blends follow you across devices
- Notify the creator when a friend joins (email or web push)
- Save the blend as a real YouTube playlist (YouTube Data API, needs OAuth + quota)
- Share card image for Instagram stories (`next/og`)
- Shared artists' top songs as a discovery section
