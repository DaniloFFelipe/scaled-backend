import { faker } from '@faker-js/faker';
import request from 'supertest';
import { expect, test } from 'vitest';

import { server } from '../../app.ts';
import { makeTitle } from '../../tests/factories/make-title.ts';
import { makeAuthenticatedUser } from '../../tests/factories/make-user.ts';
import { categories } from '../../utils/categories.ts';

test('update a title', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const createdTitle = await makeTitle();

  const updatedData = {
    title: faker.lorem.words(4),
    description: faker.lorem.words(15),
    category: faker.helpers.arrayElements(categories, 3),
    posterUrl: faker.image.url(),
    releaseDate: faker.date.future().toISOString(),
  };

  const response = await request(server.server)
    .patch(`/titles/${createdTitle.id}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send(updatedData);

  expect(response.status).toEqual(200);
  expect(response.body).toEqual({
    titleId: createdTitle.id,
  });
});

test('update a title with partial data', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const createdTitle = await makeTitle();

  const partialUpdate = {
    title: faker.lorem.words(4),
    description: faker.lorem.words(15),
  };

  const response = await request(server.server)
    .patch(`/titles/${createdTitle.id}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send(partialUpdate);

  expect(response.status).toEqual(200);
  expect(response.body).toEqual({
    titleId: createdTitle.id,
  });
});

test('should return 404 when title does not exist', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const nonExistentId = faker.string.uuid();

  const response = await request(server.server)
    .patch(`/titles/${nonExistentId}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: faker.lorem.words(3),
    });

  expect(response.status).toEqual(404);
  expect(response.body).toEqual({
    message: 'Título não encontrado.',
  });
});

test('should return 400 for invalid title ID', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const response = await request(server.server)
    .patch('/titles/invalid-id')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: faker.lorem.words(3),
    });

  expect(response.status).toEqual(400);
});

test('should return 400 for invalid data', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('manager');

  const createdTitle = await makeTitle();

  const response = await request(server.server)
    .patch(`/titles/${createdTitle.id}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'abc', // too short
      posterUrl: 'invalid-url',
    });

  expect(response.status).toEqual(400);
});

test('should return 401 when not authenticated', async () => {
  await server.ready();

  const response = await request(server.server)
    .patch(`/titles/${faker.string.uuid()}`)
    .set('Content-Type', 'application/json')
    .send({
      title: faker.lorem.words(3),
    });

  expect(response.status).toEqual(401);
});

test('should return 403 when user is not manager', async () => {
  await server.ready();

  const { token } = await makeAuthenticatedUser('watcher');

  const response = await request(server.server)
    .patch(`/titles/${faker.string.uuid()}`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: faker.lorem.words(3),
    });

  expect(response.status).toEqual(403);
});
