import { FastifyPluginAsync } from 'fastify';
import { tomlService } from '../services/toml.service.js';

export const feedRoutes: FastifyPluginAsync = async (app) => {
  // List all feeds
  app.get('/feeds', async () => {
    const config = await tomlService.read();
    const feeds = config.feeds || {};
    return Object.entries(feeds).map(([id, feed]) => ({
      id,
      ...feed,
    }));
  });

  // Get single feed
  app.get<{ Params: { id: string } }>('/feeds/:id', async (request, reply) => {
    const { id } = request.params;
    const feed = await tomlService.getFeed(id);
    if (!feed) {
      return reply.status(404).send({ message: `Feed '${id}' not found` });
    }
    return { id, ...(feed as Record<string, any>) };
  });

  // Create feed
  app.post<{ Body: { id: string; [key: string]: any } }>('/feeds', async (request, reply) => {
    const { id, ...feedData } = request.body;
    if (!id) {
      return reply.status(400).send({ message: 'Feed ID is required' });
    }

    const existing = await tomlService.getFeed(id);
    if (existing) {
      return reply.status(409).send({ message: `Feed '${id}' already exists` });
    }

    await tomlService.setFeed(id, feedData);
    return reply.status(201).send({ id, ...feedData });
  });

  // Update feed
  app.put<{ Params: { id: string }; Body: Record<string, any> }>('/feeds/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await tomlService.getFeed(id);
    if (!existing) {
      return reply.status(404).send({ message: `Feed '${id}' not found` });
    }

    await tomlService.setFeed(id, request.body);
    return { id, ...request.body };
  });

  // Delete feed
  app.delete<{ Params: { id: string } }>('/feeds/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await tomlService.getFeed(id);
    if (!existing) {
      return reply.status(404).send({ message: `Feed '${id}' not found` });
    }

    await tomlService.deleteFeed(id);
    return { message: `Feed '${id}' deleted` };
  });
};
