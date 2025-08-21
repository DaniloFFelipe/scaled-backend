import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { db } from '../../database/client.ts';
import { titles } from '../../database/schema.ts';
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
      const { category, description, posterUrl, releaseDate, title } =
        request.body;

      const titleExists = await db
        .select()
        .from(titles)
        .where(eq(titles.id, id))
        .limit(1);

      if (titleExists.length === 0) {
        return reply.status(404).send({ message: 'Título não encontrado.' });
      }

      const result = await db
        .update(titles)
        .set({
          title,
          description,
          category,
          posterUrl,
          releaseDate: releaseDate ? new Date(releaseDate) : undefined,
        })
        .where(eq(titles.id, titleExists[0].id))
        .returning();

      return reply.status(200).send({ titleId: result[0].id });
    }
  );
};
