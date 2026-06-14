import { FastifyPluginAsync } from 'fastify';
import { dockerService } from '../services/docker.service.js';
import { tomlService } from '../services/toml.service.js';
import { requireScope } from '../middleware/scope.guard.js';

export const dockerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/docker/status', {
    schema: { tags: ['Docker'], summary: 'Get container status' },
    preHandler: requireScope('docker:read'),
  }, async (request, reply) => {
    try {
      const status = await dockerService.getStatus();

      // Determine if restart is needed by comparing config mtime to container start
      const configMtime = await tomlService.getConfigMtime();
      const containerStartedAt = await dockerService.getContainerStartedAt();

      if (configMtime && containerStartedAt) {
        status.restartNeeded = configMtime > containerStartedAt;
      }

      return status;
    } catch (err: any) {
      request.log.error({ err: err.message }, 'Failed to get Docker status');
      return reply.status(500).send({ message: 'Failed to get container status' });
    }
  });

  app.post('/docker/restart', {
    schema: { tags: ['Docker'], summary: 'Restart the Podsync container' },
    preHandler: requireScope('docker:write'),
  }, async (request, reply) => {
    try {
      await dockerService.restart();
      return { success: true, message: 'Container restarted successfully' };
    } catch (err: any) {
      request.log.error({ err: err.message }, 'Failed to restart container');
      return reply.status(500).send({
        success: false,
        message: err.message || 'Failed to restart container',
      });
    }
  });
};
