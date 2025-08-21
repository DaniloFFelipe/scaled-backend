import { Queue } from 'bullmq';

import { redis } from '../../../lib/redis.ts';
import type { ContentCreated } from '../../contracts/content-created.ts';

export const ContentCreatedQueue = new Queue<ContentCreated>('content', {
  connection: redis,
});
