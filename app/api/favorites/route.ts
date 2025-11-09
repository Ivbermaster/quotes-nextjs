import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/json";
import { getUserId } from "@/lib/session";

type FavoriteIdRow = { quoteId: bigint };
type QuoteRow = { id: bigint; text: string; author: string; categories: string[] };

export async function GET() {
  const userId = await getUserId();

  const favs: FavoriteIdRow[] = await prisma.favorite.findMany({
    where: { userId },
    select: { quoteId: true },
  });

  const ids = favs.map((r) => r.quoteId);
  if (ids.length === 0) return jsonSafe([]);

  const rows: QuoteRow[] = await prisma.quote.findMany({
    where: { id: { in: ids } },
    select: { id: true, text: true, author: true, categories: true },
  });

  const quotes = rows.map((r) => ({ ...r, id: r.id.toString() }));
  return jsonSafe(quotes);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const { quoteId } = await req.json();
  await prisma.favorite.upsert({
    where: { userId_quoteId: { userId, quoteId: BigInt(quoteId) } },
    create: { userId, quoteId: BigInt(quoteId) },
    update: {},
  });
  return jsonSafe({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  const { quoteId } = await req.json();
  await prisma.favorite.delete({
    where: { userId_quoteId: { userId, quoteId: BigInt(quoteId) } },
  });
  return jsonSafe({ ok: true });
}
