import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { blendSongs, matchPercent, sharedArtists, suggestionsFrom } from "@/lib/blend";
import { blendExists, getMembers, MAX_MEMBERS } from "@/lib/repo";
import { currentMemberId } from "@/lib/session";
import { blendIdSchema } from "@/lib/validate";
import { JoinView } from "@/components/JoinView";
import { InviteView } from "@/components/InviteView";
import { BlendView, type BlendViewData } from "@/components/BlendView";

const MAX_LIST = 300;

export async function generateMetadata(props: PageProps<"/b/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  if (!blendIdSchema.safeParse(id).success) return {};
  const members = await getMembers(id);
  if (members.length === 0) return {};
  const names = members.map((m) => m.name);
  return {
    title: names.length === 1 ? `${names[0]} wants to blend with you` : names.join(" + "),
    description: "See which songs you both play on YouTube, then listen to them together.",
  };
}

export default async function BlendPage(props: PageProps<"/b/[id]">) {
  const { id } = await props.params;
  if (!blendIdSchema.safeParse(id).success || !(await blendExists(id))) notFound();

  const [members, meId] = await Promise.all([getMembers(id), currentMemberId(id)]);
  if (members.length === 0) notFound();

  const meIndex = members.findIndex((m) => m.id === meId);
  const people = members.map((m) => ({ name: m.name, color: m.color }));

  // Visitor isn't in this blend yet: the invite landing
  if (meIndex < 0) {
    return (
      <JoinView
        blendId={id}
        people={people}
        inviterSongs={members[0].stats.uniqueSongs}
        full={members.length >= MAX_MEMBERS}
      />
    );
  }

  // Only me so far: share the link and wait
  if (members.length === 1) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return <InviteView blendId={id} url={`${proto}://${host}/b/${id}`} me={people[0]} songCount={members[0].stats.uniqueSongs} />;
  }

  // The blend
  const lists = members.map((m) => m.songs);
  const pairs: BlendViewData["pairs"] = [];
  for (let a = 0; a < members.length; a++)
    for (let b = a + 1; b < members.length; b++) pairs.push({ a, b, percent: matchPercent(lists[a], lists[b]) });
  const avg = Math.round(pairs.reduce((s, p) => s + p.percent, 0) / pairs.length);

  const all = blendSongs(lists, "all");
  const any2 = members.length > 2 ? blendSongs(lists, "any2") : null;
  const artists = sharedArtists(lists);

  // For small blends, suggest songs from the others by artists you both play
  let suggestions: BlendViewData["suggestions"] = null;
  if (all.length < 8) {
    const others = members.filter((_, i) => i !== meIndex);
    const other = others[0];
    const songs = suggestionsFrom(lists[meIndex], other.songs, artists);
    if (songs.length) suggestions = { name: other.name, color: other.color, songs };
  }

  const data: BlendViewData = {
    blendId: id,
    me: meIndex,
    people,
    matchPercent: avg,
    pairs,
    songs: { all: all.slice(0, MAX_LIST), any2: any2?.slice(0, MAX_LIST) ?? null },
    totals: { all: all.length, any2: any2?.length ?? null },
    artists,
    suggestions,
  };
  return <BlendView data={data} />;
}
