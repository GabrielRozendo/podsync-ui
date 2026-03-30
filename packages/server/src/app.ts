import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import { env } from './config/env.js';
import { authService } from './services/auth.service.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { healthRoutes } from './routes/health.js';
import { configRoutes } from './routes/config.js';
import { feedRoutes } from './routes/feeds.js';
import { episodeRoutes } from './routes/episodes.js';
import { tokenRoutes } from './routes/tokens.js';
import { settingsRoutes } from './routes/settings.js';
import { dockerRoutes } from './routes/docker.js';
import { authRoutes } from './routes/auth.js';
import { applyRoutes } from './routes/apply.js';

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

  // API Routes (grouped so auth hook applies to all)
  await app.register(async (api) => {
    // Auth hook added directly on this scope (not as a plugin) so it
    // applies to all routes registered in child plugins below.
    api.addHook('onRequest', async (request, reply) => {
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

    await api.register(healthRoutes);
    await api.register(configRoutes);
    await api.register(feedRoutes);
    await api.register(episodeRoutes);
    await api.register(tokenRoutes);
    await api.register(settingsRoutes);
    await api.register(dockerRoutes);
    await api.register(authRoutes);
    await api.register(applyRoutes);
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
