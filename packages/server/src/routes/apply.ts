import { FastifyPluginAsync } from 'fastify';
import { dockerService } from '../services/docker.service.js';

export const applyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/apply', async (request, reply) => {
    try {
      await dockerService.restart();
      return { success: true, message: 'Configuration applied and container restarted' };
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Failed to apply changes',
      });
    }
  });
};
