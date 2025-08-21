import { faker } from '@faker-js/faker';
import request from 'supertest';
import { expect, test, vi } from 'vitest';

import { server } from '../../app.ts';
import { BrokerMessages } from '../../broker/message/index.ts';
import { makeAuthenticatedUser } from '../../tests/factories/make-user.ts';
import { categories } from '../../utils/categories.ts';

test('create a title', async () => {
  await server.ready();
  const dispatchContentCreatedFn = vi.fn();
  vi.spyOn(BrokerMessages, 'dispatchContentCreated').mockImplementation(
    dispatchContentCreatedFn
  );

  const { token } = await makeAuthenticatedUser('manager');

  const response = await request(server.server)
    .post('/titles')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: faker.lorem.words(3),
      description: faker.lorem.words(10),
      category: faker.helpers.arrayElements(categories, 2),
      posterUrl: faker.image.url(),
      releaseDate: faker.date.past().toISOString(),
      locationUrl: faker.image.url(),
    });

  expect(dispatchContentCreatedFn).toBeCalled();
  expect(response.status).toEqual(201);
  expect(response.body).toEqual({
    titleId: expect.any(String),
  });
});
