"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, btn, Card, Icon, UnknownAvatar } from "./ui";
import { LeaveButton } from "./LeaveButton";

export function InviteView({ blendId, url, me, songCount }: { blendId: string; url: string; me: { name: string; color: string }; songCount: number }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const shareText = `${me.name} wants to blend music with you. See which songs you both play:`;

  // Check every few seconds whether a friend joined
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 6000);
    return () => clearInterval(t);
  }, [router]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "duet", text: shareText, url });
        return;
      } catch {
        return; // user cancelled
      }
    }
    copy();
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 pt-5 pb-8 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href="/" className={btn.icon} aria-label="Home">
          <Icon name="back" />
        </Link>
        <span className="text-sm text-muted">Step 2 of 2</span>
        <span className="size-11" />
      </div>

      <Card className="flex items-center gap-3.5">
        <Avatar name={me.name} color={me.color} size={48} ring="transparent" />
        <div>
          <div className="font-bold">Your history is ready</div>
          <div className="text-sm text-muted">{songCount.toLocaleString()} songs</div>
        </div>
      </Card>

      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[30px] leading-tight">Send this link to a friend</h1>
        <p className="text-muted">When they add their history, your blend appears here. Send it to more people for a group blend.</p>
      </div>

      <div className="flex items-center gap-2 bg-surface border border-line rounded-2xl py-1.5 pr-1.5 pl-4">
        <span className="flex-1 min-w-0 truncate font-medium">{url.replace(/^https?:\/\//, "")}</span>
        <button onClick={copy} className="h-11 px-4 rounded-xl bg-ink text-bg font-bold text-sm inline-flex items-center gap-1.5">
          <Icon name={copied ? "check" : "copy"} size={16} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <a href={whatsapp} target="_blank" rel="noreferrer" className={btn.secondary}>
          WhatsApp
        </a>
        <button onClick={share} className={btn.secondary}>
          <Icon name="share" size={18} />
          More options
        </button>
      </div>

      <div className="flex-1" />

      <Card className="flex items-center gap-3" aria-live="polite">
        <UnknownAvatar size={40} />
        <div className="flex-1">
          <div className="font-bold">Waiting for your friend</div>
          <div className="text-[13px] text-muted">This page updates by itself when they join</div>
        </div>
        <span className="size-2.5 rounded-full bg-[#6EA8FF] animate-pulse" />
      </Card>
      <LeaveButton blendId={blendId} label="Delete this blend" />
    </main>
  );
}
