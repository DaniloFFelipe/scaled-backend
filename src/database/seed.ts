import { hash } from 'argon2';
import { db } from './client.ts';
import { users } from './schema.ts';

async function seed() {
  const passwordHash = await hash('123456');

  await db
    .insert(users)
    .values([
      {
        name: 'Super Manager',
        email: 'super@manager.com',
        password: passwordHash,
        role: 'manager',
      },
    ])
    .returning();
}

seed();
