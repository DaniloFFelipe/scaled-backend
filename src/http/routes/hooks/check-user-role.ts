import type { FastifyReply, FastifyRequest } from 'fastify';

import { getAuthenticatedUserFromRequest } from '../../../utils/get-authenticated-user-from-request.ts';

export function checkUserRole(role: 'watcher' | 'manager') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getAuthenticatedUserFromRequest(request);

    if (user.role !== role) {
      return reply.status(403).send();
    }
  };
}
