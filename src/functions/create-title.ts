import { BrokerMessages } from '../broker/message/index.ts';
import { db } from '../database/client.ts';
import { contents, titles } from '../database/schema.ts';

type Input = {
  title: string;
  description: string;
  category: string[];
  posterUrl: string;
  releaseDate: string;
  locationUrl: string;
};

export async function createTitle(input: Input) {
  const { title, description, category, posterUrl, releaseDate, locationUrl } =
    input;

  const result = await db
    .insert(titles)
    .values({
      title,
      description,
      category,
      posterUrl,
      releaseDate: new Date(releaseDate),
    })
    .returning();

  const content = await db
    .insert(contents)
    .values({
      titleId: result[0].id,
      locationUrl,
      durationInSeconds: -1,
      sizeInBytes: -1,
    })
    .returning();

  BrokerMessages.dispatchContentCreated({
    content: content[0],
  });

  return { titleId: result[0].id };
}
