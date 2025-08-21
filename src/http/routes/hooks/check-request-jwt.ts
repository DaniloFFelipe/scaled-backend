import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../../../env.ts';

type JWTPayload = {
  sub: string;
  role: 'student' | 'manager';
};

export async function checkRequestJWT(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return reply.status(401).send();
  }

  const [type, token] = authorization.split(' ');
  if (!token || type !== 'Bearer') {
    return reply.status(401).send();
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    request.user = payload;
  } catch {
    return reply.status(401).send();
  }
}
