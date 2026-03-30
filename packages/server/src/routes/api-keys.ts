import { FastifyPluginAsync } from 'fastify';
import { apiKeyService } from '../services/api-key.service.js';
import type { ApiKeyCreateRequest } from '@podsync-ui/shared';
import { requireScope } from '../middleware/scope.guard.js';

export const apiKeyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api-keys', {
    schema: { tags: ['API Keys'], summary: 'List all API keys' },
    preHandler: requireScope('admin'),
  }, async () => {
    return apiKeyService.listKeys();
  });

  app.post<{ Body: ApiKeyCreateRequest }>('/api-keys', {
    schema: { tags: ['API Keys'], summary: 'Create a new API key' },
    preHandler: requireScope('admin'),
  }, async (request) => {
    const { name, scopes, expiresInDays } = request.body;
    return apiKeyService.createKey(name, scopes, expiresInDays);
  });

  app.post<{ Params: { id: string } }>('/api-keys/:id/revoke', {
    schema: { tags: ['API Keys'], summary: 'Revoke an API key' },
    preHandler: requireScope('admin'),
  }, async (request, reply) => {
    const result = await apiKeyService.revokeKey(request.params.id);
    if (!result) return reply.status(404).send({ message: 'API key not found' });
    return result;
  });

  app.delete<{ Params: { id: string } }>('/api-keys/:id', {
    schema: { tags: ['API Keys'], summary: 'Delete an API key' },
    preHandler: requireScope('admin'),
  }, async (request, reply) => {
    const deleted = await apiKeyService.deleteKey(request.params.id);
    if (!deleted) return reply.status(404).send({ message: 'API key not found' });
    return { success: true };
  });
};
