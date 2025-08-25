import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

import { BrokerMessages } from '../../broker/message/index.ts';
import { db } from '../../database/client.ts';
import { contents, titles } from '../../database/schema.ts';
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
      const {
        category,
        description,
        posterUrl,
        releaseDate,
        title,
        locationUrl,
      } = request.body;

      const result = await db
        .insert(titles)
        .values({
          title,
          description,
          category,
          posterUrl,
          releaseDate: new Date(releaseDate),
        })
        .returning();

      const content = await db
        .insert(contents)
        .values({
          titleId: result[0].id,
          locationUrl,
          durationInSeconds: -1,
          sizeInBytes: -1,
        })
        .returning();

      BrokerMessages.dispatchContentCreated({
        content: content[0],
      });

      return reply.status(201).send({ titleId: result[0].id });
    }
  );
};
