import { faker } from '@faker-js/faker';
import { db } from '../../database/client.ts';
import { contents } from '../../database/schema.ts';

type ContentOverrides = {
  titleId?: string;
  locationUrl?: string;
  streamUrl?: string;
  status?: 'ready' | 'failed' | 'processing' | 'pending';
  sizeInBytes?: number;
  durationInSeconds?: number;
};

export async function makeContent(overrides: ContentOverrides = {}) {
  if (!overrides.titleId) {
    throw new Error('titleId is required for makeContent');
  }

  const result = await db
    .insert(contents)
    .values({
      titleId: overrides.titleId,
      locationUrl: overrides.locationUrl ?? faker.internet.url(),
      streamUrl: overrides.streamUrl ?? faker.internet.url(),
      status: overrides.status ?? 'ready',
      sizeInBytes: overrides.sizeInBytes ?? faker.number.int({ min: 1000000, max: 1000000000 }),
      durationInSeconds: overrides.durationInSeconds ?? faker.number.int({ min: 60, max: 7200 }),
    })
    .returning();

  return result[0];
}