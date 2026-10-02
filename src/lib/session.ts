import "server-only";
import { cookies } from "next/headers";
import { verifyMember } from "./repo";

/**
 * No accounts in v1. When you create or join a blend you get a secret token in an
 * httpOnly cookie for that blend. That cookie is your identity in that blend.
 * Cookie name: duet_<blendId>, value: <memberId>.<token>
 */
const PREFIX = "duet_";
const MAX_AGE = 60 * 60 * 24 * 365;

export async function setMemberCookie(blendId: string, memberId: string, token: string) {
  const jar = await cookies();
  jar.set(PREFIX + blendId, `${memberId}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearMemberCookie(blendId: string) {
  const jar = await cookies();
  jar.delete(PREFIX + blendId);
}

/** The current visitor's member id in this blend, or null. */
export async function currentMemberId(blendId: string): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(PREFIX + blendId)?.value;
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  const memberId = raw.slice(0, dot);
  const token = raw.slice(dot + 1);
  return (await verifyMember(blendId, memberId, token)) ? memberId : null;
}

/** Blend ids this browser belongs to (unverified, only used to list them). */
export async function myBlendIds(): Promise<string[]> {
  const jar = await cookies();
  return jar
    .getAll()
    .filter((c) => c.name.startsWith(PREFIX))
    .map((c) => c.name.slice(PREFIX.length))
    .filter((id) => /^[a-z0-9]{8}$/.test(id));
}
