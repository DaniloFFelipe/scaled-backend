import { and, desc, eq, ilike, type SQL } from 'drizzle-orm';
import { db } from '../database/client.ts';
import { contents, titles } from '../database/schema.ts';
import { env } from '../env.ts';

type Input = {
  page?: number;
  perPage?: number;
  search?: string;
  orderBy?: 'id' | 'title';
};

export async function listTitles({
  orderBy = 'id',
  page = 1,
  perPage = 20,
  search,
}: Input) {
  const conditions: SQL[] = [];

  if (search) {
    conditions.push(ilike(titles.title, `%${search}%`));
  }

  const [result, total] = await Promise.all([
    db
      .select()
      .from(titles)
      .leftJoin(contents, eq(contents.titleId, titles.id))
      .orderBy(desc(titles[orderBy]))
      .offset((page - 1) * perPage)
      .limit(perPage)
      .where(and(...conditions))
      .groupBy(titles.id, contents.id),
    db.$count(titles, and(...conditions)),
  ]);

  return {
    data: result.map((t) => ({
      ...t.titles,
      content: t.contents
        ? {
            durationInSeconds: t.contents.durationInSeconds,
            streamUrl: `${env.CDN_URL}/${t.contents?.streamUrl}`,
          }
        : null,
    })),
    total,
  };
}
