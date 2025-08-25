import { verify } from 'argon2';
import { sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

import { db } from '../database/client.ts';
import { users } from '../database/schema.ts';
import { env } from '../env.ts';

type LoginCredentials = {
  email: string;
  password: string;
};

type LoginResult =
  | {
      success: true;
      token: string;
    }
  | {
      success: false;
      message: string;
    };

export async function login(
  credentials: LoginCredentials
): Promise<LoginResult> {
  const { email, password } = credentials;

  const result = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.email}) = LOWER(${email})`)
    .limit(1);

  if (result.length === 0) {
    return {
      success: false,
      message: 'Credenciais inválidas.',
    };
  }

  const user = result[0];

  const doesPasswordsMatch = await verify(user.password, password);

  if (!doesPasswordsMatch) {
    return {
      success: false,
      message: 'Credenciais inválidas.',
    };
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET);

  return {
    success: true,
    token,
  };
}
