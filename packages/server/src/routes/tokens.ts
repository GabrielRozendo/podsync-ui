import { FastifyPluginAsync } from 'fastify';
import { tomlService } from '../services/toml.service.js';
import type { TokensConfig } from '@podsync-ui/shared';
import { requireScope } from '../middleware/scope.guard.js';

function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return token.slice(0, 4) + '****' + token.slice(-4);
}

function maskTokens(tokens: TokensConfig): TokensConfig {
  const masked: TokensConfig = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (Array.isArray(value)) {
      (masked as any)[key] = value.map(maskToken);
    } else if (typeof value === 'string') {
      (masked as any)[key] = maskToken(value);
    }
  }
  return masked;
}

export const tokenRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { unmask?: string } }>('/tokens', {
    schema: { tags: ['Tokens'], summary: 'Get API tokens (masked by default)' },
    preHandler: requireScope('tokens:read'),
  }, async (request) => {
    const config = await tomlService.read();
    const tokens = config.tokens || {};
    if (request.query.unmask === 'true') {
      return tokens;
    }
    return maskTokens(tokens);
  });

  app.put<{ Body: TokensConfig }>('/tokens', {
    schema: { tags: ['Tokens'], summary: 'Update API tokens' },
    preHandler: requireScope('tokens:write'),
  }, async (request) => {
    await tomlService.updateSection('tokens', request.body);
    return maskTokens(request.body);
  });
};
