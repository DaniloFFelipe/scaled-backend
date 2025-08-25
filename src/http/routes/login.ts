import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

import { login } from '../../functions/login.ts';

export const loginRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/sessions',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login',
        operationId: 'login',
        description: 'Authenticate a user and return a JWT token',
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

      const result = await login({ email, password });

      if (!result.success) {
        return reply.status(400).send({ message: result.message });
      }

      return reply.status(200).send({ token: result.token });
    }
  );
};
