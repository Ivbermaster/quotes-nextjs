export const runtime = "nodejs";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { jsonSafe } from "@/lib/json";

type QRow = { id: bigint; text: string; author: string; categories: string[] };

function hashToIndex(key: string, mod: number) {
  const h = crypto.createHash("sha256").update(key).digest();
  const n = h.readUIntBE(0, 6);
  return n % mod;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user = url.searchParams.get("user") || "global";
    const date = new Date().toISOString().slice(0, 10);

    const maxLenParam = url.searchParams.get("maxLen");
    const maxLenNum = maxLenParam ? Number(maxLenParam) : undefined;
    const maxLen =
      maxLenNum && Number.isFinite(maxLenNum) ? Math.max(1, Math.floor(maxLenNum)) : undefined;

    // COUNT
    let total = 0;
    if (maxLen) {
      const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "Quote" WHERE char_length(text) <= ${maxLen};
      `;
      total = Number(count ?? BigInt(0));
    } else {
      const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "Quote";
      `;
      total = Number(count ?? BigInt(0));
    }
    if (total === 0) return jsonSafe(null);

    const idx = hashToIndex(`${user}:${date}`, total);

    // SELECT с OFFSET
    let rows: QRow[];
    if (maxLen) {
      rows = await prisma.$queryRaw<QRow[]>`
        SELECT id, text, author, categories
        FROM "Quote"
        WHERE char_length(text) <= ${maxLen}
        ORDER BY id ASC
        LIMIT 1 OFFSET ${idx};
      `;
    } else {
      rows = await prisma.$queryRaw<QRow[]>`
        SELECT id, text, author, categories
        FROM "Quote"
        ORDER BY id ASC
        LIMIT 1 OFFSET ${idx};
      `;
    }

    const q = rows[0] ? { ...rows[0], id: rows[0].id.toString() } : null;
    return jsonSafe(q);
  } catch (e: any) {
    return jsonSafe({ error: "of-the-day failed", message: String(e?.message || e) }, { status: 500 });
  }
}
