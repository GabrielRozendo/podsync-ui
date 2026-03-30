import { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    schema: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Returns server health status and version info.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            version: {
              type: 'object',
              properties: {
                commit: { type: 'string' },
                buildTime: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: {
        commit: env.gitCommit,
        buildTime: env.buildTime,
      },
    };
  });
};
