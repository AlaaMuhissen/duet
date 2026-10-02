import Link from "next/link";
import { blendSummaries } from "@/lib/repo";
import { myBlendIds } from "@/lib/session";
import { AvatarStack, btn, Icon, Logo, PrivacyNote } from "@/components/ui";

export default async function Home() {
  const blends = await blendSummaries(await myBlendIds());

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 pt-7 pb-8 flex flex-col gap-8">
      <Logo />

      {blends.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-[34px] leading-tight">Your blends</h1>
          <div className="flex flex-col gap-2.5">
            {blends.map((b) => (
              <Link key={b.id} href={`/b/${b.id}`} className="flex items-center gap-3.5 bg-surface hover:bg-surface-2 rounded-[18px] p-3.5 transition">
                <AvatarStack people={b.members} size={44} />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold truncate">{b.members.map((m) => m.name).join(" + ")}</span>
                  <span className="block text-[13px] text-muted">
                    {b.members.length === 1 ? "Waiting for friends to join" : `${b.members.length} people`}
                  </span>
                </span>
                <Icon name="back" className="rotate-180 text-muted" />
              </Link>
            ))}
          </div>
          <Link href="/new" className={btn.primary}>
            <Icon name="plus" />
            New blend
          </Link>
        </section>
      ) : (
        <>
          <div className="flex-1 flex flex-col justify-center gap-8">
            <Venn />
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-[40px] leading-[1.02]">The songs you both actually play.</h1>
              <p className="text-muted text-base leading-relaxed">
                Add your YouTube watch history, send one link, and listen to every song you and your friends have in common.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link href="/new" className={btn.primary}>
              <Icon name="upload" />
              Start a blend
            </Link>
            <PrivacyNote>Your history is read on your device. It never gets uploaded.</PrivacyNote>
          </div>
        </>
      )}
    </main>
  );
}

function Venn() {
  return (
    <div className="relative mx-auto h-[150px] w-[243px]" aria-hidden="true">
      <div className="absolute left-0 top-0 size-[150px] rounded-full bg-[#FF8A5B] opacity-90" />
      <div className="absolute left-[93px] top-0 size-[150px] rounded-full bg-[#6EA8FF] opacity-90 mix-blend-screen" />
      <div className="absolute inset-x-0 top-[60px] text-center font-display text-[22px] text-bg">♪ ♪ ♪</div>
    </div>
  );
}
