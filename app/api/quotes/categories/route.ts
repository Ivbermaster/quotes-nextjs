import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/json";

export async function GET() {
  const rows = await prisma.$queryRaw<{ category: string }[]>`
    SELECT DISTINCT unnest(categories) AS category FROM "Quote" ORDER BY 1;
  `;
  return jsonSafe(rows.map(r => r.category));
}
