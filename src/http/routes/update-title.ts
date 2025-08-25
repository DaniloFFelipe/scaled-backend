import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

import { updateTitle } from '../../functions/update-title.ts';
import { categories } from '../../utils/categories.ts';
import { checkRequestJWT } from './hooks/check-request-jwt.ts';
import { checkUserRole } from './hooks/check-user-role.ts';

export const updateTitleRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch(
    '/titles/:id',
    {
      preHandler: [checkRequestJWT, checkUserRole('manager')],
      schema: {
        tags: ['titles'],
        summary: 'Update a title',
        operationId: 'updateTitle',
        params: z.object({
          id: z.uuid('ID do título inválido'),
        }),
        body: z
          .object({
            title: z.string().min(5, 'Título precisa ter 5 caracteres'),
            description: z
              .string()
              .min(10, 'Descrição precisa ter 10 caracteres'),
            category: z.array(z.enum(categories)),
            posterUrl: z.url('URL do poster inválida'),
            releaseDate: z.iso.datetime({ offset: true }),
          })
          .partial(),
        response: {
          200: z
            .object({ titleId: z.uuid() })
            .describe('Título atualizado com sucesso!'),
          404: z
            .object({ message: z.string() })
            .describe('Título não encontrado.'),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await updateTitle(id, request.body);

      if (!result.success) {
        return reply.status(404).send({ message: result.message });
      }

      return reply.status(200).send({ titleId: result.titleId });
    }
  );
};
