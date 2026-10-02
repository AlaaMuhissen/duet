"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { readTakeoutFile, TakeoutError } from "@/lib/history/readTakeout";
import { parseHistory } from "@/lib/history/parseHistory";
import { toStoredSongs, type StoredSong } from "@/lib/blend";
import { btn, Card, Icon, Label, PrivacyNote, SongTile } from "./ui";

type Parsed = {
  songs: StoredSong[];
  stats: { musicPlays: number; uniqueSongs: number; from: string | null; to: string | null };
  skipped: number;
  total: number;
};

type Step =
  | { kind: "guide" }
  | { kind: "reading"; phase: string }
  | { kind: "error"; title: string; message: string; showReasons: boolean }
  | { kind: "summary"; data: Parsed };

const NAME_KEY = "duet_name";

export function HistoryFlow({
  endpoint,
  submitLabel,
  askName = true,
  header,
}: {
  endpoint: string;
  submitLabel: string;
  askName?: boolean;
  header?: ReactNode;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: "guide" });
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState(() => {
    try {
      return typeof window === "undefined" ? "" : (localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      return "";
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStep({ kind: "reading", phase: "Opening your file" });
    // let the screen paint before heavy work
    await new Promise((r) => setTimeout(r, 30));
    try {
      const entries = await readTakeoutFile(file);
      setStep({ kind: "reading", phase: `Found ${entries.length.toLocaleString()} watched videos. Picking out the music` });
      await new Promise((r) => setTimeout(r, 30));
      const lib = parseHistory(entries);
      if (lib.songs.length === 0) {
        setStep({
          kind: "error",
          title: "We found your history, but no music in it",
          message:
            entries.length === 0
              ? "The history file is empty. YouTube history may have been turned off."
              : `We checked ${entries.length.toLocaleString()} videos and none looked like songs. Music you play in YouTube Music or on artist channels is easiest for us to find.`,
          showReasons: false,
        });
        return;
      }
      setStep({
        kind: "summary",
        data: {
          songs: toStoredSongs(lib),
          stats: { musicPlays: lib.stats.musicPlays, uniqueSongs: lib.stats.uniqueSongs, from: lib.stats.from, to: lib.stats.to },
          skipped: lib.stats.skippedNonMusic,
          total: lib.stats.totalEntries,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong reading this file.";
      setStep({
        kind: "error",
        title: e instanceof TakeoutError && e.code === "too-big" ? "This file is too big" : "We couldn't find your watch history in this file",
        message: msg,
        showReasons: !(e instanceof TakeoutError && e.code === "too-big"),
      });
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function submit(data: Parsed) {
    if (askName && !name.trim()) {
      setSubmitError("Add your name so your friends know it's you.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: askName ? name.trim() : "me", songs: data.songs, stats: data.stats }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't save. Try again.");
      router.push(`/b/${json.blendId}`);
      router.refresh();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      setSubmitting(false);
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".zip,.json,application/zip,application/json"
      className="sr-only"
      id="takeout-file"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
        e.target.value = "";
      }}
    />
  );

  if (step.kind === "reading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center py-16" role="status" aria-live="polite">
        <div className="size-24 rounded-full border-4 border-surface-2 border-t-accent animate-spin" aria-hidden="true" />
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[26px]">Reading your history</h2>
          <p className="text-muted">{step.phase}…</p>
        </div>
        <PrivacyNote>This happens on your device. Nothing is uploaded.</PrivacyNote>
      </div>
    );
  }

  if (step.kind === "error") {
    return (
      <div className="flex-1 flex flex-col gap-6">
        <div className="size-16 rounded-[20px] bg-[#3a2a1a] grid place-items-center text-warn">
          <Icon name="alert" size={32} />
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="font-display text-[28px] leading-tight">{step.title}</h2>
          <p className="text-muted">{step.message}</p>
        </div>
        {step.showReasons && (
          <Card className="flex flex-col gap-3.5">
            <Reason title="History was exported as HTML" body="In Takeout, open “Multiple formats” and set history to JSON." />
            <hr className="border-line" />
            <Reason title="“history” wasn't selected" body="Only playlists or subscriptions were included in the export." />
            <hr className="border-line" />
            <Reason title="YouTube history is turned off" body="If history was paused, there's nothing to export for that time." />
          </Card>
        )}
        <div className="mt-auto flex flex-col gap-2.5">
          {fileInput}
          <label htmlFor="takeout-file" className={`${btn.primary} cursor-pointer`}>
            <Icon name="upload" />
            Choose another file
          </label>
          <button className={btn.secondary} onClick={() => setStep({ kind: "guide" })}>
            Show me the steps again
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "summary") {
    const d = step.data;
    const since = d.stats.from ? new Date(d.stats.from).getFullYear() : null;
    return (
      <div className="flex-1 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>{since ? `Your music since ${since}` : "Your music"}</Label>
          <h2 className="font-display text-[28px] leading-tight">Here&apos;s what you listen to</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat n={d.stats.musicPlays.toLocaleString()} label="music plays" />
          <Stat n={d.stats.uniqueSongs.toLocaleString()} label="different songs" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="font-bold">Your most played</div>
          {d.songs.slice(0, 5).map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-4 text-sm font-bold text-muted">{i + 1}</span>
              <SongTile title={s.title} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate" dir="auto">{s.title}</div>
                <div className="text-[13px] text-muted truncate" dir="auto">{s.artist || "Unknown artist"}</div>
              </div>
              <span className="text-[13px] font-bold text-[#FF8A5B]">{s.plays} plays</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-muted">
          We checked {d.total.toLocaleString()} videos, skipped {d.skipped.toLocaleString()} that weren&apos;t music, and merged repeat uploads of the same song.
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          {askName && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                placeholder="What should friends see?"
                className="h-13 rounded-2xl bg-surface border border-line px-4 text-base outline-none focus:border-accent-ink"
                autoComplete="given-name"
              />
            </label>
          )}
          {submitError && (
            <p className="text-sm text-[#FFB3AC]" role="alert">
              {submitError}
            </p>
          )}
          <button className={btn.primary} disabled={submitting} onClick={() => submit(d)}>
            {submitting ? "Saving…" : submitLabel}
          </button>
          <PrivacyNote>We save song names and play counts only.</PrivacyNote>
        </div>
      </div>
    );
  }

  // guide
  return (
    <div className="flex-1 flex flex-col gap-5">
      {header}
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[30px] leading-tight">Get your watch history</h2>
        <p className="text-muted">A one-time download from Google. Takes about 2 minutes.</p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {GUIDE.map(([title, body], i) => (
          <li key={i} className="flex gap-3.5 items-start bg-surface rounded-2xl p-3.5">
            <span className="size-7 shrink-0 rounded-full bg-surface-2 text-accent-ink font-bold text-sm grid place-items-center">{i + 1}</span>
            <span className="flex flex-col gap-0.5">
              <span className="font-bold">{title}</span>
              <span className="text-[13px] text-muted leading-relaxed">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      <a
        href="https://takeout.google.com/settings/takeout/custom/youtube"
        target="_blank"
        rel="noreferrer"
        className="h-12 shrink-0 border border-line rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-surface"
      >
        Open Google Takeout <Icon name="external" size={16} />
      </a>
      {fileInput}
      <label
        htmlFor="takeout-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-[18px] border-2 border-dashed p-5 flex flex-col items-center gap-1.5 text-center transition ${
          dragging ? "border-accent-ink bg-[#2a1416]" : "border-accent bg-[#1a1015] hover:bg-[#22131a]"
        }`}
      >
        <span className="text-accent-ink">
          <Icon name="upload" size={26} />
        </span>
        <span className="font-bold">Choose your Takeout .zip</span>
        <span className="text-[13px] text-muted">or drop it here. The watch-history.json inside works too.</span>
      </label>
      <PrivacyNote>Your file is read on your device. It never gets uploaded.</PrivacyNote>
    </div>
  );
}

const GUIDE: [string, string][] = [
  ["Open Google Takeout", "Sign in with the Google account you use on YouTube."],
  ["Select only YouTube", "Tap “Deselect all”, then tick “YouTube and YouTube Music”."],
  ["Keep only history, as JSON", "In “All YouTube data included”, leave only “history”. In “Multiple formats”, set history to JSON."],
  ["Export and download", "Google emails you a link, usually within minutes. Download the .zip and choose it below."],
];

function Reason({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-bold">{title}</div>
      <div className="text-[13px] text-muted leading-relaxed">{body}</div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-surface rounded-2xl p-4 flex flex-col gap-1">
      <div className="font-display text-[28px]">{n}</div>
      <div className="text-[13px] text-muted">{label}</div>
    </div>
  );
}
