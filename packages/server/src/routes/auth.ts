import { FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service.js';
import type { AuthUpdateRequest, LoginRequest } from '@podsync-ui/shared';
import { requireScope } from '../middleware/scope.guard.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth', {
    schema: { tags: ['Auth'], summary: 'Get auth configuration' },
    preHandler: requireScope('auth:read'),
  }, async () => {
    return authService.getConfig();
  });

  app.put<{ Body: AuthUpdateRequest }>('/auth', {
    schema: { tags: ['Auth'], summary: 'Update auth configuration' },
    preHandler: requireScope('auth:write'),
  }, async (request) => {
    const { enabled, username, password } = request.body;
    return authService.updateConfig(enabled, username, password);
  });

  app.post<{ Body: LoginRequest }>('/auth/login', {
    schema: { tags: ['Auth'], summary: 'Login with username and password' },
  }, async (request, reply) => {
    const { username, password } = request.body;
    const valid = await authService.validateCredentials(username, password);

    if (!valid) {
      return reply.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    request.session.authenticated = true;
    request.session.username = username;

    return { success: true, message: 'Login successful' };
  });

  app.post('/auth/logout', {
    schema: { tags: ['Auth'], summary: 'Logout and destroy session' },
  }, async (request) => {
    request.session.destroy();
    return { success: true, message: 'Logged out' };
  });
};
