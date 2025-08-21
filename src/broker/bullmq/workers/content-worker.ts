import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

import { db } from '../../../database/client.ts';
import { contents } from '../../../database/schema.ts';
import { env } from '../../../env.ts';
import { convertVideoToHLS } from '../../../lib/hls.ts';
import { minio } from '../../../lib/minio/client.ts';
import { uploadTmpFolder } from '../../../lib/minio/upload-tmp-folder.ts';
import { redis } from '../../../lib/redis.ts';
import type { ContentCreated } from '../../contracts/content-created.ts';

async function processVideo(data: ContentCreated) {
  await db
    .update(contents)
    .set({ status: 'processing' })
    .where(eq(contents.id, data.content.id));

  const convertResult = await convertVideoToHLS(data.content.locationUrl);

  if (!convertResult.success) {
    await db
      .update(contents)
      .set({ status: 'failed' })
      .where(eq(contents.id, data.content.id));
    return;
  }

  await uploadTmpFolder(minio, convertResult.outputDir, {
    bucketName: env.STORAGE_BUCKET,
    folderPrefix: data.content.titleId,
    preserveStructure: true,
  });

  await db
    .update(contents)
    .set({ status: 'ready', streamUrl: convertResult.masterPlaylist })
    .where(eq(contents.id, data.content.id));
}

new Worker<ContentCreated>(
  'content',
  async (job) => {
    if (job.name !== 'created') {
      await processVideo(job.data);
    }
  },
  {
    connection: redis,
  }
);
