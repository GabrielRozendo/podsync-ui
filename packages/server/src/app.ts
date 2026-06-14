import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { authService } from './services/auth.service.js';
import { apiKeyService } from './services/api-key.service.js';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { feedRoutes } from './routes/feeds.js';
import { episodeRoutes } from './routes/episodes.js';
import { tokenRoutes } from './routes/tokens.js';
import { settingsRoutes } from './routes/settings.js';
import { dockerRoutes } from './routes/docker.js';
import { authRoutes } from './routes/auth.js';
import { applyRoutes } from './routes/apply.js';
import { apiKeyRoutes } from './routes/api-keys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === 'development' ? 'debug' : 'info',
    },
  });

  // CORS for development
  await app.register(cors, {
    origin: env.nodeEnv === 'development' ? true : false,
    credentials: true,
  });

  // Session management
  const sessionSecret = await authService.getSessionSecret();
  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: sessionSecret.padEnd(32, '0').slice(0, 32),
    cookieName: 'podsync-ui-session',
    cookie: {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 86400 * 7 * 1000, // 7 days in ms
    },
  });

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Podsync UI API',
        description: 'Management API for Podsync — manage feeds, episodes, tokens, settings, and container lifecycle.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'podsync-ui-session',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'API Key (psk_...)',
          },
        },
      },
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // API Routes (grouped so auth hook applies to all)
  await app.register(async (api) => {
    // Auth + API key hook
    api.addHook('onRequest', async (request, reply) => {
      const url = request.url.split('?')[0];

      // Always allow these through
      if (url === '/api/auth/login' || url === '/api/health' || url.startsWith('/api/docs')) {
        return;
      }

      // Check API key first (works regardless of auth enabled/disabled)
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const result = await apiKeyService.validateKey(token);
        if (result.valid) {
          (request as any).apiKeyScopes = result.scopes;
          return;
        }
        return reply.status(401).send({ message: 'Invalid API key' });
      }

      // Session auth only enforced when auth is enabled
      const enabled = await authService.isEnabled();
      if (!enabled) {
        (request as any).authBypassed = true;
        return;
      }

      if (!request.session.authenticated) {
        return reply.status(401).send({ message: 'Authentication required' });
      }
    });

    await api.register(healthRoutes);
    await api.register(configRoutes);
    await api.register(feedRoutes);
    await api.register(episodeRoutes);
    await api.register(tokenRoutes);
    await api.register(settingsRoutes);
    await api.register(dockerRoutes);
    await api.register(authRoutes);
    await api.register(applyRoutes);
    await api.register(apiKeyRoutes);
  }, { prefix: '/api' });

  // Serve static files in production
  if (env.nodeEnv === 'production') {
    const publicDir = path.join(__dirname, '..', 'public');
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ message: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
