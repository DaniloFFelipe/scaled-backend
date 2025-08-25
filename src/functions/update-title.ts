import { eq } from 'drizzle-orm';
import { db } from '../database/client.ts';
import { titles } from '../database/schema.ts';

type UpdateTitleData = {
  title?: string;
  description?: string;
  category?: string[];
  posterUrl?: string;
  releaseDate?: string;
};

type UpdateTitleResult =
  | {
      success: true;
      titleId: string;
    }
  | {
      success: false;
      message: string;
    };

export async function updateTitle(
  id: string,
  data: UpdateTitleData
): Promise<UpdateTitleResult> {
  const { category, description, posterUrl, releaseDate, title } = data;

  const titleExists = await db
    .select()
    .from(titles)
    .where(eq(titles.id, id))
    .limit(1);

  if (titleExists.length === 0) {
    return {
      success: false,
      message: 'Título não encontrado.',
    };
  }

  const result = await db
    .update(titles)
    .set({
      title,
      description,
      category,
      posterUrl,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
    })
    .where(eq(titles.id, titleExists[0].id))
    .returning();

  return {
    success: true,
    titleId: result[0].id,
  };
}
