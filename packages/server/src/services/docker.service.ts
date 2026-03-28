import { env } from '../config/env.js';
import { getContainerManager } from '../providers/index.js';
import type { ContainerStatus } from '@podsync-ui/shared';

class DockerService {
  async getStatus(): Promise<ContainerStatus> {
    const manager = getContainerManager();
    const status = await manager.getStatus();

    return {
      name: env.podsyncContainerName,
      state: status.state,
      startedAt: status.startedAt,
      uptime: status.uptime,
      health: status.health,
      restartNeeded: false, // Caller sets this
    };
  }

  async restart(): Promise<void> {
    const manager = getContainerManager();
    await manager.restart();
  }

  async getContainerStartedAt(): Promise<Date | null> {
    try {
      const manager = getContainerManager();
      const status = await manager.getStatus();
      return status.startedAt ? new Date(status.startedAt) : null;
    } catch {
      return null;
    }
  }
}

export const dockerService = new DockerService();
