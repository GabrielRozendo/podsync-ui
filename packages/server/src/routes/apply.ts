import { FastifyPluginAsync } from 'fastify';
import { dockerService } from '../services/docker.service.js';
import { requireScope } from '../middleware/scope.guard.js';

export const applyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/apply', {
    schema: { tags: ['Docker'], summary: 'Apply config changes and restart container' },
    preHandler: requireScope('docker:write'),
  }, async (request, reply) => {
    try {
      await dockerService.restart();
      return { success: true, message: 'Configuration applied and container restarted' };
    } catch (err: any) {
      request.log.error({ err: err.message }, 'Failed to apply config and restart container');
      return reply.status(500).send({
        success: false,
        message: err.message || 'Failed to apply changes',
      });
    }
  });
};
