"use client";

import { useState } from "react";
import Link from "next/link";
import { HistoryFlow } from "./HistoryFlow";
import { Avatar, AvatarStack, btn, Card, Icon, Logo, PrivacyNote, UnknownAvatar } from "./ui";

export function JoinView({
  blendId,
  people,
  inviterSongs,
  full,
}: {
  blendId: string;
  people: { name: string; color: string }[];
  inviterSongs: number;
  full: boolean;
}) {
  const [started, setStarted] = useState(false);
  const inviter = people[0];
  const names = people.length === 1 ? inviter.name : `${people.slice(0, -1).map((p) => p.name).join(", ")} and ${people.at(-1)!.name}`;

  if (started) {
    return (
      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-5 pb-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button className={btn.icon} aria-label="Back" onClick={() => setStarted(false)}>
            <Icon name="back" />
          </button>
          <span className="text-sm text-muted">Joining {inviter.name}&apos;s blend</span>
          <span className="size-11" />
        </div>
        <HistoryFlow endpoint={`/api/blends/${blendId}/join`} submitLabel="Join the blend" />
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 pt-7 pb-6 flex flex-col gap-7">
      <Logo />
      <div className="flex-1 flex flex-col justify-center items-center gap-7 text-center">
        <div className="flex items-center">
          {people.length === 1 ? <Avatar name={inviter.name} color={inviter.color} size={88} /> : <AvatarStack people={people} size={72} />}
          <span className="-ml-6">
            <UnknownAvatar size={people.length === 1 ? 88 : 72} />
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[34px] leading-tight" dir="auto">
            {names} {people.length === 1 ? "wants" : "want"} to blend with you
          </h1>
          <p className="text-muted text-base leading-relaxed">
            Find out which songs you play in common on YouTube, then listen to them together as one playlist.
          </p>
        </div>
        <Card className="w-full flex justify-around text-center">
          <div>
            <div className="font-display text-2xl">{inviterSongs.toLocaleString()}</div>
            <div className="text-[13px] text-muted">songs from {inviter.name}</div>
          </div>
          <div className="w-px bg-line" />
          <div>
            <div className="font-display text-2xl">?</div>
            <div className="text-[13px] text-muted">songs in common</div>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-2.5">
        {full ? (
          <>
            <p className="text-center text-muted">This blend is full. Start your own instead.</p>
            <Link href="/new" className={btn.primary}>
              Start a blend
            </Link>
          </>
        ) : (
          <button className={btn.primary} onClick={() => setStarted(true)}>
            <Icon name="upload" />
            Add my history
          </button>
        )}
        <PrivacyNote>Friends only see songs you share, never your full history.</PrivacyNote>
      </div>
    </main>
  );
}
