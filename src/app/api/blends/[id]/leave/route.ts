import { error } from "@/lib/api";
import { leaveBlend } from "@/lib/repo";
import { clearMemberCookie, currentMemberId } from "@/lib/session";
import { blendIdSchema } from "@/lib/validate";

/** Leave a blend and delete your song list from it. */
export async function POST(_req: Request, ctx: RouteContext<"/api/blends/[id]/leave">) {
  const { id } = await ctx.params;
  if (!blendIdSchema.safeParse(id).success) return error(404, "Not found.");

  const memberId = await currentMemberId(id);
  if (!memberId) return error(403, "You're not in this blend.");

  await leaveBlend(id, memberId);
  await clearMemberCookie(id);
  return Response.json({ ok: true });
}
