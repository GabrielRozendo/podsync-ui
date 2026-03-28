import { FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service.js';

export const authMiddleware: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url;
    if (path === '/api/auth/login' || path === '/api/health') {
      return;
    }

    const enabled = await authService.isEnabled();
    if (!enabled) return;

    if (!request.session.authenticated) {
      return reply.status(401).send({ message: 'Authentication required' });
    }
  });
};
