import { verify } from 'argon2';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import jwt from 'jsonwebtoken';
import z from 'zod';

import { db } from '../../database/client.ts';
import { users } from '../../database/schema.ts';
import { env } from '../../env.ts';

export const loginRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/sessions',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login',
        body: z.object({
          email: z.email(),
          password: z.string(),
        }),
        response: {
          200: z.object({ token: z.string() }),
          400: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (result.length === 0) {
        return reply.status(400).send({ message: 'Credenciais inválidas.' });
      }

      const user = result[0];

      const doesPasswordsMatch = await verify(user.password, password);

      if (!doesPasswordsMatch) {
        return reply.status(400).send({ message: 'Credenciais inválidas.' });
      }

      const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET);

      return reply.status(200).send({ token });
    }
  );
};
