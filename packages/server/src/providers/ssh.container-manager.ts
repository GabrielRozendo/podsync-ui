import { Client } from 'ssh2';
import type { ContainerManager } from './types.js';
import { env } from '../config/env.js';

export class SshContainerManager implements ContainerManager {
  private exec(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = new Client();

      const config: any = {
        host: env.sshHost,
        port: env.sshPort,
        username: env.sshUsername,
      };

      if (env.sshKeyPath) {
        import('fs').then((fs) => {
          config.privateKey = fs.readFileSync(env.sshKeyPath!);
          if (env.sshKeyPassphrase) {
            config.passphrase = env.sshKeyPassphrase;
          }
          connect();
        });
      } else if (env.sshPassword) {
        config.password = env.sshPassword;
        connect();
      } else {
        reject(new Error('SSH: no password or key configured'));
        return;
      }

      function connect() {
        client
          .on('ready', () => {
            client.exec(command, (err, stream) => {
              if (err) {
                client.end();
                reject(err);
                return;
              }
              let stdout = '';
              let stderr = '';
              stream
                .on('close', (code: number) => {
                  client.end();
                  if (code !== 0) {
                    reject(new Error(`Command failed (exit ${code}): ${stderr.trim()}`));
                  } else {
                    resolve(stdout.trim());
                  }
                })
                .on('data', (data: Buffer) => (stdout += data.toString()))
                .stderr.on('data', (data: Buffer) => (stderr += data.toString()));
            });
          })
          .on('error', (err) => reject(err))
          .connect(config);
      }
    });
  }

  async getStatus() {
    const containerName = env.podsyncContainerName;
    try {
      const json = await this.exec(
        `docker inspect --format '{"state":"{{.State.Status}}","startedAt":"{{.State.StartedAt}}","health":"{{if .State.Health}}{{.State.Health.Status}}{{end}}"}' ${containerName}`,
      );
      const info = JSON.parse(json);

      const state = info.state as 'running' | 'stopped' | 'restarting' | 'paused' | 'dead';
      const startedAt = info.startedAt;
      const uptime = startedAt
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
        : undefined;

      return {
        state,
        startedAt,
        uptime,
        health: info.health || undefined,
      };
    } catch {
      return { state: 'unknown' as const };
    }
  }

  async restart(): Promise<void> {
    const containerName = env.podsyncContainerName;
    await this.exec(`docker restart ${containerName}`);

    // Wait for it to come back up
    for (let i = 0; i < 30; i++) {
      try {
        const status = await this.getStatus();
        if (status.state === 'running') return;
      } catch {
        // keep waiting
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Container did not start within 30 seconds');
  }
}
