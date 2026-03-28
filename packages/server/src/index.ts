import { buildApp } from './app.js';
import { env } from './config/env.js';
import { metadataService } from './services/metadata.service.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    app.log.info(`Podsync UI server running on port ${env.port}`);

    // Start yt-dlp auto-update (every 24h)
    metadataService.startAutoUpdate();
    app.log.info('yt-dlp auto-update enabled');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
