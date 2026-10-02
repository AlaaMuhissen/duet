import "server-only";
import { historySchema, type HistoryPayload } from "./validate";

const MAX_BODY = 2 * 1024 * 1024;

export function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** Read and validate a history payload. Returns the data or an error Response. */
export async function readHistoryBody(req: Request): Promise<HistoryPayload | Response> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return error(413, "Your song list is too large.");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "Invalid request.");
  }
  const parsed = historySchema.safeParse(body);
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}
