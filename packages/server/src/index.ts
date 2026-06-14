import { buildApp } from './app.js';
import { env } from './config/env.js';
import { metadataService } from './services/metadata.service.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    app.log.info(`Podsync UI server running on port ${env.port}`);
    app.log.info({
      mode: env.mode,
      configPath: env.podsyncConfigPath,
      dataDir: env.podsyncDataDir,
      containerName: env.podsyncContainerName,
      sidecarConfigDir: env.sidecarConfigDir,
      ...(env.mode === 'ssh' ? { sshHost: env.sshHost, sshPort: env.sshPort, sshUsername: env.sshUsername } : {}),
    }, 'Runtime configuration');

    // Start yt-dlp auto-update (every 24h)
    metadataService.startAutoUpdate();
    app.log.info('yt-dlp auto-update enabled');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
