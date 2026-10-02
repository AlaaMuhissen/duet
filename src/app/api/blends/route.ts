import { readHistoryBody } from "@/lib/api";
import { createBlend } from "@/lib/repo";
import { setMemberCookie } from "@/lib/session";

/** Create a blend with the creator as its first member. */
export async function POST(req: Request) {
  const data = await readHistoryBody(req);
  if (data instanceof Response) return data;

  const { blendId, memberId, token } = await createBlend(data);
  await setMemberCookie(blendId, memberId, token);
  return Response.json({ blendId });
}
