import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full bg-accent text-bg font-bold text-base hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:pointer-events-none transition",
  secondary:
    "inline-flex items-center justify-center gap-2 h-13 px-5 rounded-full border border-line text-ink font-medium text-[15px] hover:bg-surface transition disabled:opacity-50",
  icon: "inline-flex items-center justify-center size-11 shrink-0 rounded-full bg-surface hover:bg-surface-2 transition",
  iconOutline: "inline-flex items-center justify-center size-13 shrink-0 rounded-full border border-line hover:bg-surface transition",
};

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 min-h-11" aria-label="duet home">
      <span className="size-7 rounded-lg bg-accent grid place-items-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f0f13" strokeWidth="2.4" aria-hidden="true">
          <circle cx="8" cy="12" r="5" />
          <circle cx="16" cy="12" r="5" />
        </svg>
      </span>
      <span className="font-display text-xl">duet</span>
    </Link>
  );
}

export function Avatar({ name, color, size = 48, ring = "var(--color-bg)", className = "" }: { name: string; color: string; size?: number; ring?: string; className?: string }) {
  return (
    <span
      className={`grid place-items-center shrink-0 rounded-full font-bold text-bg ${className}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42, border: `${size > 30 ? 3 : 2}px solid ${ring}` }}
      title={name}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export function AvatarStack({ people, size = 48 }: { people: { name: string; color: string }[]; size?: number }) {
  const overlap = Math.round(size * 0.28);
  return (
    <span className="flex">
      {people.map((p, i) => (
        <span key={i} style={{ marginLeft: i ? -overlap : 0 }}>
          <Avatar name={p.name} color={p.color} size={size} />
        </span>
      ))}
    </span>
  );
}

export function UnknownAvatar({ size = 48 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center shrink-0 rounded-full bg-surface-2 text-muted font-bold border-[3px] border-dashed border-line"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      ?
    </span>
  );
}

/** Colored square with the song's first letter (we don't load YouTube thumbnails until play). */
export function SongTile({ title, size = 48, children }: { title: string; size?: number; children?: ReactNode }) {
  return (
    <span
      className="grid place-items-center shrink-0 rounded-[10px] text-bg font-display"
      style={{ width: size, height: size, background: tileColor(title), fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {children ?? firstChar(title)}
    </span>
  );
}

const TILE_COLORS = ["#FFB36B", "#FF8A7F", "#7FD1B9", "#C9A2FF", "#FFD36B", "#8EC5FF", "#FF9FC6", "#B8E07A"];
export function tileColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return TILE_COLORS[h % TILE_COLORS.length];
}
function firstChar(s: string) {
  return Array.from(s.trim())[0]?.toUpperCase() ?? "♪";
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-xs font-bold tracking-[0.08em] uppercase text-muted">{children}</div>;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`bg-surface rounded-[18px] p-4 ${className}`} {...props} />;
}

export function PrivacyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 text-[13px] text-muted text-center">
      <Icon name="lock" size={16} />
      {children}
    </p>
  );
}

const PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  down: <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  shuffle: <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: <path d="M5 12l5 5 9-10" />,
  alert: (
    <>
      <path d="M12 8v5M12 16.5v.5" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </>
  ),
  leave: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11" />,
} as const;

const FILLED = {
  play: <path d="M7 4.5v15l13-7.5z" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),
  prev: <path d="M18 5v14L8 12zM6 5h2v14H6z" />,
  next: <path d="M6 5v14l10-7zM16 5h2v14h-2z" />,
} as const;

export type IconName = keyof typeof PATHS | keyof typeof FILLED;

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  if (name in FILLED) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        {FILLED[name as keyof typeof FILLED]}
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name as keyof typeof PATHS]}
    </svg>
  );
}

export function Eq({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`eq flex items-end gap-[3px] h-4 ${paused ? "paused" : ""}`} aria-hidden="true">
      <span className="h-full" />
      <span className="h-full" />
      <span className="h-full" />
    </span>
  );
}
