import { faker } from '@faker-js/faker';
import { db } from '../../database/client.ts';
import { titles } from '../../database/schema.ts';
import { categories } from '../../utils/categories.ts';

type TitleOverrides = {
  title?: string;
  description?: string;
  category?: string[];
  posterUrl?: string;
  releaseDate?: Date;
};

export async function makeTitle(overrides: TitleOverrides = {}) {
  const result = await db
    .insert(titles)
    .values({
      title: overrides.title ?? faker.lorem.words(3),
      description: overrides.description ?? faker.lorem.words(10),
      category:
        overrides.category ?? faker.helpers.arrayElements(categories, 2),
      posterUrl: overrides.posterUrl ?? faker.image.url(),
      releaseDate: overrides.releaseDate ?? faker.date.past(),
    })
    .returning();

  return result[0];
}
