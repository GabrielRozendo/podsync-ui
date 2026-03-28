import { FastifyPluginAsync } from 'fastify';
import { dockerService } from '../services/docker.service.js';
import { tomlService } from '../services/toml.service.js';

export const dockerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/docker/status', async () => {
    const status = await dockerService.getStatus();

    // Determine if restart is needed by comparing config mtime to container start
    const configMtime = await tomlService.getConfigMtime();
    const containerStartedAt = await dockerService.getContainerStartedAt();

    if (configMtime && containerStartedAt) {
      status.restartNeeded = configMtime > containerStartedAt;
    }

    return status;
  });

  app.post('/docker/restart', async (request, reply) => {
    try {
      await dockerService.restart();
      return { success: true, message: 'Container restarted successfully' };
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Failed to restart container',
      });
    }
  });
};
