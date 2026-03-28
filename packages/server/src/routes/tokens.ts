import { FastifyPluginAsync } from 'fastify';
import { tomlService } from '../services/toml.service.js';
import type { TokensConfig } from '@podsync-ui/shared';

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
  app.get('/tokens', async () => {
    const config = await tomlService.read();
    return maskTokens(config.tokens || {});
  });

  app.put<{ Body: TokensConfig }>('/tokens', async (request) => {
    await tomlService.updateSection('tokens', request.body);
    return maskTokens(request.body);
  });
};
