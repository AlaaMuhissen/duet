import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryFlow } from "@/components/HistoryFlow";
import { btn, Icon } from "@/components/ui";
import { currentMemberId } from "@/lib/session";
import { blendIdSchema } from "@/lib/validate";

export const metadata: Metadata = { title: "Update your history" };

export default async function UpdateHistory(props: PageProps<"/b/[id]/update">) {
  const { id } = await props.params;
  if (!blendIdSchema.safeParse(id).success) notFound();
  if (!(await currentMemberId(id))) redirect(`/b/${id}`);

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 pt-5 pb-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href={`/b/${id}`} className={btn.icon} aria-label="Back">
          <Icon name="back" />
        </Link>
        <span className="text-sm text-muted">Update your history</span>
        <span className="size-11" />
      </div>
      <HistoryFlow endpoint={`/api/blends/${id}/join`} submitLabel="Update my songs" askName={false} />
    </main>
  );
}
