import { fakerPT_BR as faker } from '@faker-js/faker';
import { hash } from 'argon2';
import { db } from './client.ts';
import { users } from './schema.ts';

async function seed() {
  const passwordHash = await hash('123456');

  await db
    .insert(users)
    .values([
      {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: passwordHash,
        role: 'manager',
      },
    ])
    .returning();
}

seed();
