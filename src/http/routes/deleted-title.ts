import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

import { BrokerMessages } from '../../broker/message/index.ts';
import { db } from '../../database/client.ts';
import { contents, titles } from '../../database/schema.ts';
import { checkRequestJWT } from './hooks/check-request-jwt.ts';
import { checkUserRole } from './hooks/check-user-role.ts';

export const deleteTitleRoute: FastifyPluginAsyncZod = async (server) => {
  server.delete(
    '/titles/:id',
    {
      preHandler: [checkRequestJWT, checkUserRole('manager')],
      schema: {
        tags: ['titles'],
        summary: 'Delete a title',
        operationId: 'deleteTitle',
        description: 'Delete a title by its ID',
        params: z.object({
          id: z.uuid('ID do título inválido'),
        }),
        response: {
          204: z.object({}).describe('Título deletado com sucesso!'),
          404: z
            .object({ message: z.string() })
            .describe('Título não encontrado.'),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const titleExists = await db
        .select()
        .from(titles)
        .where(eq(titles.id, id))
        .leftJoin(contents, eq(contents.titleId, titles.id))
        .limit(1);

      if (
        titleExists.length === 0 ||
        !titleExists[0].titles ||
        !titleExists[0].contents
      ) {
        return reply.status(404).send({ message: 'Título não encontrado.' });
      }

      await db
        .delete(contents)
        .where(eq(contents.titleId, titleExists[0].titles.id));
      await db.delete(titles).where(eq(titles.id, id));

      BrokerMessages.dispatchContentDeleted({
        content: titleExists[0].contents,
      });

      return reply.status(204).send();
    }
  );
};
