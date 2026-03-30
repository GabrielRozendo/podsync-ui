import { FastifyPluginAsync } from 'fastify';
import { tomlService } from '../services/toml.service.js';
import type { PodsyncConfig } from '@podsync-ui/shared';
import { requireScope } from '../middleware/scope.guard.js';

const VALID_SECTIONS = ['server', 'storage', 'cleanup', 'downloader', 'log', 'database'] as const;
type SettingsSection = (typeof VALID_SECTIONS)[number];

function isValidSection(s: string): s is SettingsSection {
  return (VALID_SECTIONS as readonly string[]).includes(s);
}

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { section: string } }>('/settings/:section', {
    schema: { tags: ['Settings'], summary: 'Get a settings section' },
    preHandler: requireScope('settings:read'),
  }, async (request, reply) => {
    const { section } = request.params;
    if (!isValidSection(section)) {
      return reply.status(400).send({ message: `Invalid section: ${section}. Valid: ${VALID_SECTIONS.join(', ')}` });
    }
    const config = await tomlService.read();
    return config[section] || {};
  });

  app.put<{ Params: { section: string }; Body: Record<string, any> }>('/settings/:section', {
    schema: { tags: ['Settings'], summary: 'Update a settings section' },
    preHandler: requireScope('settings:write'),
  }, async (request, reply) => {
    const { section } = request.params;
    if (!isValidSection(section)) {
      return reply.status(400).send({ message: `Invalid section: ${section}. Valid: ${VALID_SECTIONS.join(', ')}` });
    }
    await tomlService.updateSection(section as keyof PodsyncConfig, request.body as any);
    return request.body;
  });
};
