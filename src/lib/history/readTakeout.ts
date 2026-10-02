import { unzip, strFromU8, type Unzipped } from "fflate";
import type { TakeoutEntry } from "./types";

export class TakeoutError extends Error {
  constructor(
    public code: "too-big" | "not-history" | "no-history-in-zip" | "unreadable",
    message: string,
  ) {
    super(message);
  }
}

// A Takeout with only history is a few MB. Bigger usually means videos were included.
const MAX_BYTES = 800 * 1024 * 1024;

/**
 * Read a Takeout .zip or a watch-history.json and return the raw entries.
 * Runs in the browser, so the file never leaves the user's device.
 *
 * Folder and file names in Takeout are translated to the account language
 * (Hebrew, Arabic, ...), so we find the history file by its content, not its name.
 */
export async function readTakeoutFile(file: File | Blob, fileName = (file as File).name ?? ""): Promise<TakeoutEntry[]> {
  if (file.size > MAX_BYTES) {
    throw new TakeoutError("too-big", "This file is very large. In Takeout, export only YouTube “history”, not your videos.");
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new TakeoutError("unreadable", "We couldn't open this file.");
  }

  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  if (!isZip) {
    if (!fileName.toLowerCase().endsWith(".json") && bytes[0] !== 0x5b /* [ */) {
      if (fileName.toLowerCase().endsWith(".html")) throw new TakeoutError("not-history", "This is the HTML version of your history. Export it as JSON.");
      throw new TakeoutError("not-history", "Choose the Takeout .zip or the watch-history.json file.");
    }
    const entries = parseJson(strFromU8(bytes));
    if (!entries) throw new TakeoutError("not-history", "This JSON file isn't a YouTube watch history.");
    return entries;
  }

  const files = await new Promise<Unzipped>((resolve, reject) =>
    unzip(bytes, { filter: (f) => /\.(json|html)$/i.test(f.name) && /youtube/i.test(f.name) }, (err, data) => (err ? reject(err) : resolve(data))),
  ).catch(() => {
    throw new TakeoutError("unreadable", "We couldn't unzip this file. Try downloading it from Takeout again.");
  });

  // Prefer the file literally named watch-history.json, then any JSON that looks like history
  const names = Object.keys(files)
    .filter((n) => n.toLowerCase().endsWith(".json"))
    .sort((a, b) => Number(/watch-history\.json$/i.test(b)) - Number(/watch-history\.json$/i.test(a)));
  for (const name of names) {
    const entries = parseJson(strFromU8(files[name]));
    if (entries) return entries;
  }

  const hasHtml = Object.keys(files).some((n) => /history/i.test(n) && n.toLowerCase().endsWith(".html"));
  throw new TakeoutError(
    "no-history-in-zip",
    hasHtml ? "Your history was exported as HTML. Export it again with the history format set to JSON." : "No watch history found in this file.",
  );
}

function parseJson(text: string): TakeoutEntry[] | null {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return null;
    if (data.length === 0) return [];
    const looksLikeHistory = data.slice(0, 50).some((e) => typeof e?.titleUrl === "string" && /youtube\.com\/watch|youtu\.be\//.test(e.titleUrl));
    return looksLikeHistory ? (data as TakeoutEntry[]) : null;
  } catch {
    return null;
  }
}
