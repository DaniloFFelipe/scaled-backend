import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

import { listTitles } from '../../functions/list-titles.ts';
import { checkRequestJWT } from './hooks/check-request-jwt.ts';
import { checkUserRole } from './hooks/check-user-role.ts';

export const listTitlesRoute: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/titles',
    {
      preHandler: [checkRequestJWT, checkUserRole('manager')],
      schema: {
        tags: ['titles'],
        summary: 'List titles',
        operationId: 'listTitles',
        description:
          'Get a paginated list of titles with optional search and ordering',
        querystring: z.object({
          page: z.coerce.number().min(1).default(1),
          perPage: z.coerce.number().min(1).max(100).default(20),
          search: z.string().optional(),
          orderBy: z.enum(['id', 'title']).default('id'),
        }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                category: z.array(z.string()),
                posterUrl: z.string(),
                releaseDate: z.coerce.string(),
                content: z
                  .object({
                    durationInSeconds: z.number(),
                    streamUrl: z.string(),
                  })
                  .nullable(),
              })
            ),
            total: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { page, perPage, search, orderBy } = request.query;

      try {
        const result = await listTitles({
          page,
          perPage,
          search,
          orderBy,
        });

        return reply.status(200).send(result);
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
  );
};
