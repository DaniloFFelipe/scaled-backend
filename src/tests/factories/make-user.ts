import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { hash } from 'argon2';
import jwt from 'jsonwebtoken';
import { db } from '../../database/client.ts';
import { users } from '../../database/schema.ts';

export async function makeUser(role?: 'manager' | 'watcher') {
  const passwordBeforeHash = randomUUID();

  const result = await db
    .insert(users)
    .values({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: await hash(passwordBeforeHash),
      role,
    })
    .returning();

  return {
    user: result[0],
    passwordBeforeHash,
  };
}

export async function makeAuthenticatedUser(role: 'manager' | 'watcher') {
  const { user } = await makeUser(role);

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required.');
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET
  );

  return { user, token };
}
