// Node runtime, без кэша
export const runtime = "nodejs";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { jsonSafe } from "@/lib/json";

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
    const maxLen = maxLenNum && Number.isFinite(maxLenNum) ? Math.max(1, Math.floor(maxLenNum)) : undefined;

    const clauses: Prisma.Sql[] = [Prisma.sql`1=1`];
    if (maxLen) clauses.push(Prisma.sql`char_length(text) <= ${maxLen}`);
    const WHERE = Prisma.join(clauses, ' AND ');

    // count
    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Quote" WHERE ${WHERE};`
    );
    const total = Number(count ?? BigInt(0));
    if (total === 0) return jsonSafe(null);

    // stable index
    const idx = hashToIndex(`${user}:${date}`, total);

    // pick one
    const rows = await prisma.$queryRaw<
      { id: bigint; text: string; author: string; categories: string[] }[]
    >(Prisma.sql`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE ${WHERE}
      ORDER BY id ASC
      LIMIT 1 OFFSET ${idx};
    `);

    const q = rows[0] ? { ...rows[0], id: rows[0].id.toString() } : null;
    return jsonSafe(q);
  } catch (e: any) {
    // Вернём понятную ошибку и статус 500
    return jsonSafe({ error: "of-the-day failed", message: String(e?.message || e) }, { status: 500 });
  }
}
