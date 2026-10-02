import type { Metadata } from "next";
import Link from "next/link";
import { HistoryFlow } from "@/components/HistoryFlow";
import { btn, Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Start a blend" };

export default function NewBlend() {
  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 pt-5 pb-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/" className={btn.icon} aria-label="Back">
          <Icon name="back" />
        </Link>
        <span className="text-sm text-muted">Step 1 of 2</span>
        <span className="size-11" />
      </div>
      <HistoryFlow endpoint="/api/blends" submitLabel="Create my blend link" />
    </main>
  );
}
