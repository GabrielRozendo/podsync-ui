import Docker from 'dockerode';
import type { ContainerManager } from './types.js';
import { env } from '../config/env.js';

export class LocalContainerManager implements ContainerManager {
  private docker: Docker;
  private containerName: string;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.containerName = env.podsyncContainerName;
  }

  async getStatus() {
    try {
      const container = this.docker.getContainer(this.containerName);
      const info = await container.inspect();
      const state = info.State;

      let status: 'running' | 'stopped' | 'restarting' | 'paused' | 'dead' | 'unknown' = 'unknown';
      if (state.Running) status = 'running';
      else if (state.Restarting) status = 'restarting';
      else if (state.Paused) status = 'paused';
      else if (state.Dead) status = 'dead';
      else status = 'stopped';

      const startedAt = state.StartedAt;
      const uptime = startedAt
        ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
        : undefined;

      return {
        state: status,
        startedAt,
        uptime,
        health: state.Health?.Status,
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        return { state: 'stopped' as const };
      }
      throw err;
    }
  }

  async restart(): Promise<void> {
    const container = this.docker.getContainer(this.containerName);
    await container.restart({ t: 10 });

    for (let i = 0; i < 30; i++) {
      const info = await container.inspect();
      if (info.State.Running) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Container did not start within 30 seconds');
  }
}
