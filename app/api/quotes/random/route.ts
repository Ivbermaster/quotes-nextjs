import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/json";

async function pickRandom() {
  const [{ min, max }] = await prisma.$queryRaw<{min: bigint, max: bigint}[]>`
    SELECT MIN(id)::bigint AS min, MAX(id)::bigint AS max FROM "Quote"
  `;
  const minN = Number(min ?? BigInt(1));
  const maxN = Number(max ?? BigInt(0));
  if (!(maxN >= minN)) return null;

  for (let i = 0; i < 5; i++) {
    const rnd = Math.floor(Math.random() * (maxN - minN + 1)) + minN;
    const q = await prisma.quote.findFirst({
      where: { id: { gte: BigInt(rnd) } },
      select: { id: true, text: true, author: true, categories: true }
    });
    if (q) return { ...q, id: q.id.toString() };
  }
  const first = await prisma.quote.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, text: true, author: true, categories: true }
  });
  return first ? { ...first, id: first.id.toString() } : null;
}

export async function GET() {
  const q = await pickRandom();
  return jsonSafe(q);
}
