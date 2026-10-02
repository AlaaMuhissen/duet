import { error, readHistoryBody } from "@/lib/api";
import { blendExists, joinBlend, updateMemberHistory } from "@/lib/repo";
import { currentMemberId, setMemberCookie } from "@/lib/session";
import { blendIdSchema } from "@/lib/validate";

/** Join a blend, or update your history if you're already in it. */
export async function POST(req: Request, ctx: RouteContext<"/api/blends/[id]/join">) {
  const { id } = await ctx.params;
  if (!blendIdSchema.safeParse(id).success || !(await blendExists(id))) return error(404, "This blend doesn't exist anymore.");

  const data = await readHistoryBody(req);
  if (data instanceof Response) return data;

  const existing = await currentMemberId(id);
  if (existing) {
    await updateMemberHistory(existing, data.songs, data.stats);
    return Response.json({ blendId: id, updated: true });
  }

  try {
    const { memberId, token } = await joinBlend(id, data);
    await setMemberCookie(id, memberId, token);
    return Response.json({ blendId: id });
  } catch (e) {
    return error(409, e instanceof Error ? e.message : "Couldn't join this blend.");
  }
}
