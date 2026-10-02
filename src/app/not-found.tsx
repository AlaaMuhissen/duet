import Link from "next/link";
import { btn, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex-1 w-full max-w-md mx-auto px-6 py-8 flex flex-col gap-8">
      <Logo />
      <div className="flex-1 flex flex-col justify-center gap-3">
        <h1 className="font-display text-[34px] leading-tight">This blend doesn&apos;t exist</h1>
        <p className="text-muted">The link may be wrong, or everyone left the blend.</p>
      </div>
      <Link href="/new" className={btn.primary}>
        Start a new blend
      </Link>
    </main>
  );
}
