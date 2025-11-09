import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/json";

type Row = { category: string };

export async function GET() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT DISTINCT unnest(categories) AS category FROM "Quote" ORDER BY 1;
  `;
  return jsonSafe(rows.map((r: Row) => r.category));
}
