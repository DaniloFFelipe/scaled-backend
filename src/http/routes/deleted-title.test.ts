import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { expect, test, vi } from 'vitest';

import { server } from '../../app.ts';
import { BrokerMessages } from '../../broker/message/index.ts';
import { db } from '../../database/client.ts';
import { contents, titles } from '../../database/schema.ts';
import { makeContent } from '../../tests/factories/make-content.ts';
import { makeTitle } from '../../tests/factories/make-title.ts';
import { makeAuthenticatedUser } from '../../tests/factories/make-user.ts';

test('delete a title with content', async () => {
  await server.ready();

  const dispatchContentDeletedFn = vi.fn();
  vi.spyOn(BrokerMessages, 'dispatchContentDeleted').mockImplementation(
    dispatchContentDeletedFn
  );

  const { token } = await makeAuthenticatedUser('manager');

  const createdTitle = await makeTitle();
  const createdContent = await makeContent({ titleId: createdTitle.id });

  const response = await request(server.server)
    .delete(`/titles/${createdTitle.id}`)
    .set('Authorization', `Bearer ${token}`);

  expect(dispatchContentDeletedFn).toHaveBeenCalledWith({
    content: expect.objectContaining({
      id: createdContent.id,
      titleId: createdTitle.id,
    }),
  });
  expect(response.status).toEqual(204);
  expect(response.body).toEqual({});

  const titleAfterDelete = await db
    .select()
    .from(titles)
    .where(eq(titles.id, createdTitle.id));

  expect(titleAfterDelete).toHaveLength(0);

  const contentAfterDelete = await db
    .select()
    .from(contents)
    .where(eq(contents.titleId, createdTitle.id));

  expect(contentAfterDelete).toHaveLength(0);
});

test('should return 404 when title does not exist', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const nonExistentId = faker.string.uuid();

  const response = await request(server.server)
    .delete(`/titles/${nonExistentId}`)
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(404);
  expect(response.body).toEqual({
    message: 'Título não encontrado.',
  });
});

test('should return 400 for invalid title ID', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const response = await request(server.server)
    .delete('/titles/invalid-id')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(400);
});

test('should return 401 when not authenticated', async () => {
  await server.ready();

  const response = await request(server.server).delete(
    `/titles/${faker.string.uuid()}`
  );

  expect(response.status).toEqual(401);
});

test('should return 403 when user is not manager', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('watcher');

  const response = await request(server.server)
    .delete(`/titles/${faker.string.uuid()}`)
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(403);
});
