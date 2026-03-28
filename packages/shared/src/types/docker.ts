export interface ContainerStatus {
  name: string;
  state: 'running' | 'stopped' | 'restarting' | 'paused' | 'dead' | 'unknown';
  startedAt?: string;
  uptime?: number;
  health?: string;
  restartNeeded: boolean;
}

export interface RestartResponse {
  success: boolean;
  message: string;
}
