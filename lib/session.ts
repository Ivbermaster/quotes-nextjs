// lib/session.ts
import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE_NAME = "uid";

export async function getUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const uid = crypto.randomUUID();
  // Set-Cookie вернётся автоматически из route handler'а
  jar.set({
    name: COOKIE_NAME,
    value: uid,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 год
  });
  return uid;
}
