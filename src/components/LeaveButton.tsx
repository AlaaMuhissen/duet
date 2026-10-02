"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";

export function LeaveButton({ blendId, label = "Leave this blend" }: { blendId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    if (!window.confirm("Leave this blend? Your songs will be removed from it.")) return;
    setBusy(true);
    const res = await fetch(`/api/blends/${blendId}/leave`, { method: "POST" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setBusy(false);
      window.alert("Couldn't leave. Try again.");
    }
  }

  return (
    <button onClick={leave} disabled={busy} className="inline-flex items-center justify-center gap-2 min-h-11 text-sm font-medium text-[#FFB3AC] disabled:opacity-50">
      <Icon name="leave" size={18} />
      {busy ? "Leaving…" : label}
    </button>
  );
}
