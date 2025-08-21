import { fastifySwagger } from '@fastify/swagger';
import scalarAPIReference from '@scalar/fastify-api-reference';
import fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './env.ts';
import { createTitleRoute } from './http/routes/create-title.ts';
import { deleteTitleRoute } from './http/routes/deleted-title.ts';
import { loginRoute } from './http/routes/login.ts';
import { updateTitleRoute } from './http/routes/update-title.ts';

const server = fastify({
  logger: env.NODE_ENV !== 'test' && {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

if (env.NODE_ENV === 'development') {
  server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Desafio Node.js',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });

  server.register(scalarAPIReference, {
    routePrefix: '/docs',
  });
}

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(loginRoute);
server.register(createTitleRoute);
server.register(updateTitleRoute);
server.register(deleteTitleRoute);

export { server };
