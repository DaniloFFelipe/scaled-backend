import request from 'supertest';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { server } from '../../app.ts';
import { db } from '../../database/client.ts';
import { contents, titles } from '../../database/schema.ts';
import { makeContent } from '../../tests/factories/make-content.ts';
import { makeTitle } from '../../tests/factories/make-title.ts';
import { makeAuthenticatedUser } from '../../tests/factories/make-user.ts';

beforeEach(async () => {
  await server.ready();
});

afterEach(async () => {
  await db.delete(contents);
  await db.delete(titles);
});

test('should list titles with authentication as manager', async () => {
  const { token } = await makeAuthenticatedUser('manager');

  const title1 = await makeTitle({ title: 'First Title' });
  const title2 = await makeTitle({ title: 'Second Title' });
  await makeContent({ titleId: title1.id, durationInSeconds: 120 });

  const response = await request(server.server)
    .get('/titles')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(200);
  expect(response.body).toEqual({
    data: expect.arrayContaining([
      expect.objectContaining({
        id: title1.id,
        title: 'First Title',
        content: expect.objectContaining({
          durationInSeconds: 120,
          streamUrl: expect.any(String),
        }),
      }),
      expect.objectContaining({
        id: title2.id,
        title: 'Second Title',
        content: null,
      }),
    ]),
    total: 2,
  });
});

test('should return 401 without authentication', async () => {
  await makeTitle();

  const response = await request(server.server).get('/titles');

  expect(response.status).toEqual(401);
});

test('should return 403 for non-manager users', async () => {
  const { token } = await makeAuthenticatedUser('watcher');

  const response = await request(server.server)
    .get('/titles')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(403);
});

test('should support pagination', async () => {
  const { token } = await makeAuthenticatedUser('manager');

  await makeTitle({ title: 'Title 1' });
  await makeTitle({ title: 'Title 2' });
  await makeTitle({ title: 'Title 3' });

  const response = await request(server.server)
    .get('/titles?page=1&perPage=2')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(200);
  expect(response.body.data).toHaveLength(2);
  expect(response.body.total).toEqual(3);
});

test('should support search functionality', async () => {
  const { token } = await makeAuthenticatedUser('manager');

  await makeTitle({ title: 'Action Movie' });
  await makeTitle({ title: 'Comedy Show' });
  await makeTitle({ title: 'Action Hero' });

  const response = await request(server.server)
    .get('/titles?search=Action')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(200);
  expect(response.body.data).toHaveLength(2);
  expect(
    // biome-ignore lint/suspicious/noExplicitAny: needed
    response.body.data.every((title: any) => title.title.includes('Action'))
  ).toBe(true);
});

test('should support ordering by title', async () => {
  const { token } = await makeAuthenticatedUser('manager');

  await makeTitle({ title: 'Zebra' });
  await makeTitle({ title: 'Alpha' });
  await makeTitle({ title: 'Beta' });

  const response = await request(server.server)
    .get('/titles?orderBy=title')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(200);
  expect(response.body.data[0].title).toEqual('Zebra');
});

test('should handle empty results', async () => {
  const { token } = await makeAuthenticatedUser('manager');

  const response = await request(server.server)
    .get('/titles')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(200);
  expect(response.body).toEqual({
    data: [],
    total: 0,
  });
});

test('should validate query parameters', async () => {
  const { token } = await makeAuthenticatedUser('manager');

  const response = await request(server.server)
    .get('/titles?page=0&perPage=101&orderBy=invalid')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toEqual(400);
});
