import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { jsonSafe } from "@/lib/json";

type ListRow = { id: bigint; text: string; author: string; categories: string[] };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const per = Math.min(100, Math.max(1, Number(searchParams.get("per") ?? 20)));
  const skip = (page - 1) * per;

  const author = searchParams.get("author") ?? undefined;
  const multi = searchParams.get("categories");
  const legacy = searchParams.get("category");
  const categories = multi
    ? multi.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : legacy
    ? [legacy.trim().toLowerCase()]
    : [];

  const maxLenParam = searchParams.get("maxLen");
  const maxLen = maxLenParam ? Math.max(1, Number(maxLenParam)) : undefined;

  const clauses: Prisma.Sql[] = [Prisma.sql`1=1`];
  if (author) clauses.push(Prisma.sql`author = ${author}`);
  if (categories.length === 1) {
    clauses.push(Prisma.sql`${categories[0]} = ANY(categories)`);
  } else if (categories.length > 1) {
    const arr = `ARRAY[${categories.map((c) => `'${c.replace(/'/g, "''")}'`).join(",")}]::text[]`;
    clauses.push(Prisma.sql`categories && ${Prisma.raw(arr)}`);
  }
  if (maxLen) clauses.push(Prisma.sql`char_length(text) <= ${maxLen}`);

  const WHERE = Prisma.join(clauses, " AND ");

  const rows = await prisma.$queryRaw<ListRow[]>(Prisma.sql`
    SELECT id, text, author, categories
    FROM "Quote"
    WHERE ${WHERE}
    ORDER BY RANDOM()
    OFFSET ${skip} LIMIT ${per};
  `);

  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Quote" WHERE ${WHERE};`
  );

  const data = rows.map((r: ListRow) => ({ ...r, id: r.id.toString() }));
  return jsonSafe({ data, page, per, total: Number(count) });
}
