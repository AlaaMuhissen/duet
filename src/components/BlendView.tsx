"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { BlendSong, SharedArtist, StoredSong } from "@/lib/blend";
import { AvatarStack, btn, Card, Eq, Icon, Label, SongTile } from "./ui";
import { useYouTubePlayer } from "./useYouTubePlayer";
import { LeaveButton } from "./LeaveButton";

type Person = { name: string; color: string };

export interface BlendViewData {
  blendId: string;
  me: number;
  people: Person[];
  matchPercent: number;
  pairs: { a: number; b: number; percent: number }[];
  songs: { all: BlendSong[]; any2: BlendSong[] | null };
  totals: { all: number; any2: number | null };
  artists: SharedArtist[];
  suggestions: { name: string; color: string; songs: StoredSong[] } | null;
}

type Track = { key: string; title: string; artist: string; videoId: string };

export function BlendView({ data }: { data: BlendViewData }) {
  const { people, blendId } = data;
  const group = people.length > 2;
  const [mode, setMode] = useState<"all" | "any2">("all");
  const songs = (mode === "any2" && data.songs.any2) || data.songs.all;
  const total = (mode === "any2" && data.totals.any2) || data.totals.all;

  const [shuffleSeed, setShuffleSeed] = useState<number | null>(null);
  const order = useMemo(() => (shuffleSeed === null ? songs.map((_, i) => i) : shuffled(songs.length, shuffleSeed)), [songs, shuffleSeed]);

  const [current, setCurrent] = useState<Track | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const errors = useRef(0);

  const indexOfCurrent = current ? songs.findIndex((s) => s.key === current.key) : -1;

  function step(dir: 1 | -1) {
    if (songs.length === 0) return;
    const pos = order.indexOf(indexOfCurrent);
    const nextPos = pos < 0 ? 0 : (pos + dir + order.length) % order.length;
    startTrack(songs[order[nextPos]]);
  }

  const { containerRef, playing, progress, load, play, pause, failed } = useYouTubePlayer({
    onEnded: () => {
      errors.current = 0;
      step(1);
    },
    onError: () => {
      errors.current++;
      if (errors.current >= 5) {
        setNotice("Several videos couldn't play here. Try “Open in YouTube”.");
        return;
      }
      setNotice("That video can't play outside YouTube. Skipped it.");
      step(1);
    },
  });

  function startTrack(t: Track) {
    // a new object every time, so tapping the same song again restarts it
    setCurrent({ key: t.key, title: t.title, artist: t.artist, videoId: t.videoId });
  }

  // Load after the player area is on screen (YouTube needs a visible element)
  useEffect(() => {
    if (current) load(current.videoId);
  }, [current, load]);

  function playAll() {
    if (current && playing) return pause();
    if (current) return play();
    if (songs.length) startTrack(songs[order[0]]);
  }

  function toggleShuffle() {
    setShuffleSeed((s) => (s === null ? Math.floor(Math.random() * 1e9) : null));
  }

  const queueIds = useMemo(() => {
    const start = Math.max(0, order.indexOf(indexOfCurrent));
    return [...order.slice(start), ...order.slice(0, start)].slice(0, 50).map((i) => songs[i].videoId);
  }, [order, indexOfCurrent, songs]);
  const youtubeQueueUrl = `https://www.youtube.com/watch_videos?video_ids=${queueIds.join(",")}`;

  const title = people.map((p) => p.name).join(" + ");
  const both = group ? (mode === "all" ? `all ${people.length}` : "at least 2 of you") : "both";

  // First visit: show the match reveal once per blend size
  const revealKey = `duet_seen_${blendId}_${people.length}`;
  const seen = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(revealKey) === "1";
      } catch {
        return true;
      }
    },
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const showReveal = !seen && !dismissed;
  function closeReveal(play: boolean) {
    try {
      localStorage.setItem(revealKey, "1");
    } catch {}
    setDismissed(true);
    if (play) playAll();
  }

  const playerVisible = current !== null;
  const progressPct = progress.duration ? (progress.current / progress.duration) * 100 : 0;

  return (
    <>
      <main
        className={`w-full max-w-6xl mx-auto px-5 lg:px-10 pt-5 ${playerVisible ? "pb-28 lg:pb-10" : "pb-10"} grid gap-x-12 gap-y-5
        [grid-template-areas:'top'_'head'_'player'_'list'] lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:[grid-template-areas:'top_top'_'player_head'_'player_list']`}
      >
        {/* top bar */}
        <div className="[grid-area:top] flex items-center justify-between">
          <Link href="/" className={btn.icon} aria-label="All blends">
            <Icon name="back" />
          </Link>
          <InviteMore blendId={blendId} />
        </div>

        {/* header */}
        <section className="[grid-area:head] flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <AvatarStack people={people} size={52} />
            <div className="min-w-0">
              <h1 className="font-display text-2xl lg:text-4xl leading-tight truncate" dir="auto">
                {title}
              </h1>
              <p className="text-sm text-muted">
                {total} {total === 1 ? "song" : "songs"} {both} play · {data.matchPercent}% match
              </p>
            </div>
          </div>

          {group && (
            <div className="flex flex-col gap-2">
              <Label>Who matches who</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.pairs.map((p) => (
                  <span key={`${p.a}-${p.b}`} className="flex items-center gap-2 bg-surface rounded-2xl py-1.5 pl-1.5 pr-3 shrink-0">
                    <AvatarStack people={[people[p.a], people[p.b]]} size={26} />
                    <span className="text-sm font-bold">{p.percent}%</span>
                  </span>
                ))}
              </div>
              <div className="flex gap-2" role="radiogroup" aria-label="Which songs to include">
                <Seg active={mode === "all"} onClick={() => setMode("all")}>
                  All {people.length}
                </Seg>
                <Seg active={mode === "any2"} onClick={() => setMode("any2")}>
                  Any 2 of {people.length}
                </Seg>
              </div>
            </div>
          )}

          <div className="flex gap-2.5 items-center">
            <button className={`${btn.primary} flex-1 h-13`} onClick={playAll} disabled={songs.length === 0}>
              <Icon name={current && playing ? "pause" : "play"} size={18} />
              {current ? (playing ? "Pause" : "Resume") : shuffleSeed !== null ? "Shuffle play" : "Play blend"}
            </button>
            <button
              className={`${btn.iconOutline} ${shuffleSeed !== null ? "bg-accent border-accent text-bg hover:bg-accent" : ""}`}
              aria-label="Shuffle"
              aria-pressed={shuffleSeed !== null}
              onClick={toggleShuffle}
            >
              <Icon name="shuffle" />
            </button>
            <a className={btn.iconOutline} href={youtubeQueueUrl} target="_blank" rel="noreferrer" aria-label="Open this blend in YouTube" title="Open in YouTube">
              <Icon name="external" />
            </a>
            <MoreMenu blendId={blendId} />
          </div>
          {failed && (
            <p className="text-sm text-warn" role="status">
              The YouTube player couldn&apos;t load. Check your connection or ad blocker, or use “Open in YouTube”.
            </p>
          )}
          {notice && (
            <p className="text-sm text-warn" role="status">
              {notice}
            </p>
          )}
        </section>

        {/* player */}
        <aside className={`[grid-area:player] lg:sticky lg:top-6 self-start flex flex-col gap-4 ${playerVisible ? "" : "hidden lg:flex"}`}>
          <div className="relative w-full aspect-video rounded-[18px] overflow-hidden bg-black">
            <div ref={containerRef} className="absolute inset-0" />
            {!playerVisible && (
              <div className="absolute inset-0 grid place-items-center text-soft text-sm text-center px-6 bg-surface">
                Press Play to start your blend
              </div>
            )}
          </div>
          {current && (
            <>
              <div className="flex flex-col gap-1">
                <div className="font-display text-2xl leading-tight" dir="auto">
                  {current.title}
                </div>
                <div className="text-muted" dir="auto">
                  {current.artist}
                </div>
                <PlaysLine song={songs.find((s) => s.key === current.key)} people={people} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-1 rounded bg-[#33333d]">
                  <div className="h-1 rounded bg-accent" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{fmt(progress.current)}</span>
                  <span>{fmt(progress.duration)}</span>
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center gap-4">
                <button className="size-13 grid place-items-center" aria-label="Previous" onClick={() => step(-1)}>
                  <Icon name="prev" size={26} />
                </button>
                <button className="size-17 rounded-full bg-accent text-bg grid place-items-center" aria-label={playing ? "Pause" : "Play"} onClick={playAll}>
                  <Icon name={playing ? "pause" : "play"} size={28} />
                </button>
                <button className="size-13 grid place-items-center" aria-label="Next" onClick={() => step(1)}>
                  <Icon name="next" size={26} />
                </button>
              </div>
            </>
          )}
        </aside>

        {/* list */}
        <section className="[grid-area:list] flex flex-col gap-6 min-w-0">
          {songs.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-baseline px-2 pb-1">
                <Label>Songs you {both} play</Label>
                <span className="text-[13px] text-muted">{shuffleSeed !== null ? "Shuffled" : "Most played first"}</span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {order.map((i) => {
                  const s = songs[i];
                  const isCurrent = current?.key === s.key;
                  return (
                    <li key={s.key}>
                      <button
                        onClick={() => startTrack(s)}
                        className={`w-full flex items-center gap-3 p-2 min-h-16 rounded-[14px] text-left transition ${isCurrent ? "bg-[#1f1f27]" : "hover:bg-surface"}`}
                        aria-current={isCurrent ? "true" : undefined}
                      >
                        <SongTile title={s.title}>{isCurrent ? <Eq paused={!playing} /> : undefined}</SongTile>
                        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className={`font-bold truncate ${isCurrent ? "text-accent-ink" : ""}`} dir="auto">
                            {s.title}
                          </span>
                          <span className="text-[13px] text-muted truncate" dir="auto">
                            {s.artist || "Unknown artist"}
                          </span>
                        </span>
                        <Counts plays={s.plays} people={people} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {total > songs.length && <p className="text-[13px] text-muted px-2 pt-2">Showing the top {songs.length} of {total} songs.</p>}
            </div>
          ) : (
            <Card className="flex flex-col gap-2">
              <div className="font-bold text-lg">No songs in common yet</div>
              <p className="text-sm text-muted">
                {data.artists.length ? "But you play some of the same artists. Start there:" : "Your histories don't overlap yet. Send each other a few favorites!"}
              </p>
            </Card>
          )}

          {songs.length < 8 && data.artists.length > 0 && (
            <div className="flex flex-col gap-2.5 px-2">
              <Label>Artists you {group ? "all" : "both"} play</Label>
              <div className="flex flex-wrap gap-2">
                {data.artists.map((a) => (
                  <span key={a.name} className="flex items-center gap-2 bg-surface rounded-full py-1.5 pl-1.5 pr-3.5">
                    <SongTile title={a.name} size={32} />
                    <span className="text-sm font-medium" dir="auto">
                      {a.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.suggestions && (
            <div className="flex flex-col gap-1">
              <div className="px-2 pb-1 flex flex-col gap-0.5">
                <Label>{data.suggestions.name}&apos;s favorites from those artists</Label>
                <span className="text-[13px] text-muted">Not in your history yet</span>
              </div>
              {data.suggestions.songs.map((s) => (
                <button key={s.key} onClick={() => startTrack(s)} className="w-full flex items-center gap-3 p-2 min-h-16 rounded-[14px] text-left hover:bg-surface">
                  <SongTile title={s.title}>{current?.key === s.key ? <Eq paused={!playing} /> : undefined}</SongTile>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold truncate" dir="auto">
                      {s.title}
                    </span>
                    <span className="block text-[13px] text-muted truncate" dir="auto">
                      {s.artist}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-soft">
                    <span className="size-2 rounded-full" style={{ background: data.suggestions!.color }} />
                    {s.plays} plays
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* mobile mini player */}
      {current && (
        <div className="lg:hidden fixed left-2.5 right-2.5 bottom-3 z-20 bg-surface-2 rounded-[18px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-1.5 p-2">
            <button
              className="flex-1 min-w-0 flex items-center gap-2.5 text-left min-h-11"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Show player"
            >
              <SongTile title={current.title} size={44} />
              <span className="min-w-0">
                <span className="block text-sm font-bold truncate" dir="auto">
                  {current.title}
                </span>
                <span className="block text-xs text-muted truncate" dir="auto">
                  {current.artist}
                </span>
              </span>
            </button>
            <button className="size-11 grid place-items-center" aria-label="Previous" onClick={() => step(-1)}>
              <Icon name="prev" />
            </button>
            <button className="size-11 rounded-full bg-ink text-bg grid place-items-center" aria-label={playing ? "Pause" : "Play"} onClick={playAll}>
              <Icon name={playing ? "pause" : "play"} size={18} />
            </button>
            <button className="size-11 grid place-items-center" aria-label="Next" onClick={() => step(1)}>
              <Icon name="next" />
            </button>
          </div>
          <div className="h-[3px] bg-[#33333d]">
            <div className="h-[3px] bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {showReveal && <Reveal data={data} onClose={closeReveal} />}
    </>
  );
}

function Reveal({ data, onClose }: { data: BlendViewData; onClose: (play: boolean) => void }) {
  const top = data.songs.all[0];
  return (
    <div className="fixed inset-0 z-30 bg-bg/95 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Your match">
      <div className="min-h-full w-full max-w-md mx-auto px-6 py-6 flex flex-col gap-7">
        <div className="flex justify-end">
          <button className={btn.icon} aria-label="Close" onClick={() => onClose(false)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-7 text-center">
          <AvatarStack people={data.people} size={56} />
          <div className="flex flex-col items-center gap-1">
            <div className="font-display text-[112px] leading-[0.95] text-accent tracking-tighter">{data.matchPercent}%</div>
            <div className="text-lg font-bold">music match</div>
          </div>
          <p className="text-muted text-base">
            You share {data.totals.all} {data.totals.all === 1 ? "song" : "songs"}
            {data.artists.length ? ` and ${data.artists.length}${data.artists.length >= 12 ? "+" : ""} artists` : ""}.
          </p>
          {top && (
            <Card className="w-full flex flex-col gap-3 text-left">
              <Label>The song that connects you</Label>
              <div className="flex items-center gap-3.5">
                <SongTile title={top.title} size={56} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[17px] truncate" dir="auto">
                    {top.title}
                  </div>
                  <div className="text-sm text-muted truncate" dir="auto">
                    {top.artist}
                  </div>
                </div>
                <Counts plays={top.plays} people={data.people} />
              </div>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {data.totals.all > 0 && (
            <button className={btn.primary} onClick={() => onClose(true)}>
              <Icon name="play" size={18} />
              Play our blend
            </button>
          )}
          <button className={btn.secondary} onClick={() => onClose(false)}>
            {data.totals.all > 0 ? `See all ${data.totals.all} songs` : "See what we have in common"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Counts({ plays, people }: { plays: number[]; people: Person[] }) {
  const compact = people.length > 3;
  return (
    <span className={`shrink-0 ${compact ? "grid grid-cols-2 gap-x-2.5 gap-y-0.5" : "flex flex-col gap-0.5 items-end"}`}>
      {plays.map((n, i) =>
        n > 0 || !compact ? (
          <span key={i} className="flex items-center gap-1.5 text-xs font-bold text-soft" title={`${people[i].name}: ${n} plays`}>
            <span className="size-[7px] rounded-full" style={{ background: people[i].color }} />
            {compact ? n : `${n} ${n === 1 ? "play" : "plays"}`}
          </span>
        ) : null,
      )}
    </span>
  );
}

function PlaysLine({ song, people }: { song?: BlendSong; people: Person[] }) {
  if (!song) return null;
  const parts = song.plays.map((n, i) => (n ? `${people[i].name} ${n}` : null)).filter(Boolean);
  return <div className="text-[13px] text-soft mt-1">Plays: {parts.join(" · ")}</div>;
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`h-10 px-4 rounded-full text-sm ${active ? "bg-ink text-bg font-bold" : "border border-line font-medium"}`}
    >
      {children}
    </button>
  );
}

function InviteMore({ blendId }: { blendId: string }) {
  const [copied, setCopied] = useState(false);
  async function invite() {
    const url = `${window.location.origin}/b/${blendId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "duet", text: "Join our music blend:", url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }
  return (
    <button onClick={invite} className="h-11 px-4 rounded-full border border-line text-sm font-medium inline-flex items-center gap-1.5 hover:bg-surface">
      <Icon name={copied ? "check" : "plus"} size={16} />
      {copied ? "Link copied" : "Add friend"}
    </button>
  );
}

function MoreMenu({ blendId }: { blendId: string }) {
  return (
    <details className="relative">
      <summary className={`${btn.iconOutline} list-none cursor-pointer [&::-webkit-details-marker]:hidden`} aria-label="More options">
        <Icon name="more" />
      </summary>
      <div className="absolute right-0 top-15 z-10 w-64 bg-surface-2 border border-line rounded-2xl p-2 flex flex-col shadow-xl">
        <Link href={`/b/${blendId}/update`} className="flex items-center gap-3 min-h-11 px-3 rounded-xl hover:bg-surface text-sm font-medium">
          <Icon name="refresh" size={18} />
          Update my history
        </Link>
        <div className="px-1">
          <LeaveButton blendId={blendId} />
        </div>
      </div>
    </details>
  );
}

function shuffled(n: number, seed: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmt(sec: number) {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
