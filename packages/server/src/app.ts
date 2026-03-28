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
      secure: env.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 86400 * 7 * 1000, // 7 days in ms
    },
  });

  // Auth middleware
  await app.register(authMiddleware);

  // API Routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(configRoutes, { prefix: '/api' });
  await app.register(feedRoutes, { prefix: '/api' });
  await app.register(episodeRoutes, { prefix: '/api' });
  await app.register(tokenRoutes, { prefix: '/api' });
  await app.register(settingsRoutes, { prefix: '/api' });
  await app.register(dockerRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(applyRoutes, { prefix: '/api' });

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
