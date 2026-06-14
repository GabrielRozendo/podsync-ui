import { FastifyRequest, FastifyReply } from 'fastify';
import type { ApiKeyScope } from '@podsync-ui/shared';

/**
 * Returns a preHandler hook that checks if the request has the required scope.
 * Session-authenticated users (via UI) get all permissions.
 * API key users must have the specific scope or 'admin'.
 */
export function requireScope(scope: ApiKeyScope) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Auth disabled globally — all requests are implicitly authorized
    if ((request as any).authBypassed) return;

    // Session users have full access
    if (request.session?.authenticated) return;

    // API key users must have the required scope
    const scopes = (request as any).apiKeyScopes as ApiKeyScope[] | undefined;
    if (!scopes) {
      request.log.warn({ url: request.url, scope }, 'Scope check failed: no session or API key');
      return reply.status(403).send({ message: 'Insufficient permissions' });
    }

    if (scopes.includes('admin') || scopes.includes(scope)) return;

    // Check for wildcard — if they have write, they also have read for the same resource
    const [resource, action] = scope.split(':');
    if (action === 'read' && scopes.includes(`${resource}:write` as ApiKeyScope)) return;

    return reply.status(403).send({ message: `Missing required scope: ${scope}` });
  };
}
