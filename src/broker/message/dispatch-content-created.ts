import { ContentCreatedQueue } from '../bullmq/queues/content-queue.ts';
import type { ContentCreated } from '../contracts/content-created.ts';

export async function dispatchContentCreated(data: ContentCreated) {
  await ContentCreatedQueue.add('created', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}
