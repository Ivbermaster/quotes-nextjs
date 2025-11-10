import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/json";

type ListRow = { id: bigint; text: string; author: string; categories: string[] };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const per  = Math.min(100, Math.max(1, Number(searchParams.get("per") ?? 20)));
  const skip = (page - 1) * per;

  const author = searchParams.get("author") ?? undefined;
  const multi  = searchParams.get("categories");
  const legacy = searchParams.get("category");
  const categories = multi
    ? multi.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    : legacy ? [legacy.trim().toLowerCase()] : [];

  const maxLenParam = searchParams.get("maxLen");
  const maxLen = maxLenParam ? Math.max(1, Number(maxLenParam)) : undefined;

  // ВЕТКА 1: без maxLen — чистый Prisma where
  if (!maxLen) {
    const where: any = {};
    if (author) where.author = author;
    if (categories.length === 1) where.categories = { has: categories[0] };
    if (categories.length > 1)  where.categories = { hasSome: categories };

    const [rows, total] = await Promise.all([
      prisma.quote.findMany({
        where, skip, take: per,
        orderBy: { id: "desc" },
        select: { id: true, text: true, author: true, categories: true },
      }),
      prisma.quote.count({ where }),
    ]);

    const data = rows.map(r => ({ ...r, id: r.id.toString() }));
    return jsonSafe({ data, page, per, total });
  }

  // ВЕТКА 2: есть maxLen — используем $queryRaw без Prisma.sql, но с параметрами
  const hasAuthor = !!author;
  const catsLen = categories.length;

  let rows: ListRow[] = [];
  let countRows: { count: bigint }[] = [];

  if (!hasAuthor && catsLen === 0) {
    rows = await prisma.$queryRaw<ListRow[]>`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
      ORDER BY id DESC
      OFFSET ${skip} LIMIT ${per};
    `;
    countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen};
    `;
  } else if (hasAuthor && catsLen === 0) {
    rows = await prisma.$queryRaw<ListRow[]>`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND author = ${author}
      ORDER BY id DESC
      OFFSET ${skip} LIMIT ${per};
    `;
    countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND author = ${author};
    `;
  } else if (!hasAuthor && catsLen === 1) {
    rows = await prisma.$queryRaw<ListRow[]>`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND ${categories[0]} = ANY(categories)
      ORDER BY id DESC
      OFFSET ${skip} LIMIT ${per};
    `;
    countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND ${categories[0]} = ANY(categories);
    `;
  } else if (hasAuthor && catsLen === 1) {
    rows = await prisma.$queryRaw<ListRow[]>`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND author = ${author}
        AND ${categories[0]} = ANY(categories)
      ORDER BY id DESC
      OFFSET ${skip} LIMIT ${per};
    `;
    countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND author = ${author}
        AND ${categories[0]} = ANY(categories);
    `;
  } else if (!hasAuthor && catsLen > 1) {
    // В PG можно передать JS-массив и привести к text[]
    rows = await prisma.$queryRaw<ListRow[]>`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND categories && ${categories as any}::text[]
      ORDER BY id DESC
      OFFSET ${skip} LIMIT ${per};
    `;
    countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND categories && ${categories as any}::text[];
    `;
  } else {
    // hasAuthor && catsLen > 1
    rows = await prisma.$queryRaw<ListRow[]>`
      SELECT id, text, author, categories
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND author = ${author}
        AND categories && ${categories as any}::text[]
      ORDER BY id DESC
      OFFSET ${skip} LIMIT ${per};
    `;
    countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Quote"
      WHERE char_length(text) <= ${maxLen}
        AND author = ${author}
        AND categories && ${categories as any}::text[];
    `;
  }

  const total = Number(countRows[0]?.count ?? BigInt(0));
  const data = rows.map(r => ({ ...r, id: r.id.toString() }));
  return jsonSafe({ data, page, per, total });
}
