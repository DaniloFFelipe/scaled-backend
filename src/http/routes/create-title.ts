import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import z from 'zod';

import { createTitle } from '../../functions/create-title.ts';
import { categories } from '../../utils/categories.ts';
import { checkRequestJWT } from './hooks/check-request-jwt.ts';
import { checkUserRole } from './hooks/check-user-role.ts';

export const createTitleRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/titles',
    {
      preHandler: [checkRequestJWT, checkUserRole('manager')],
      schema: {
        tags: ['titles'],
        summary: 'Create a title',
        operationId: 'createTitle',
        body: z.object({
          title: z.string().min(5, 'Título precisa ter 5 caracteres'),
          description: z
            .string()
            .min(10, 'Descrição precisa ter 10 caracteres'),
          category: z.array(z.enum(categories)),
          posterUrl: z.url('URL do poster inválida'),
          releaseDate: z.iso.datetime({ offset: true }),
          locationUrl: z.url('URL do conteúdo inválida'),
        }),
        response: {
          201: z
            .object({ titleId: z.uuid() })
            .describe('Título criado com sucesso!'),
        },
      },
    },
    async (request, reply) => {
      const { titleId } = await createTitle(request.body);
      return reply.status(201).send({ titleId });
    }
  );
};
