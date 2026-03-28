export interface FileInfo {
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: Date;
}

export interface FileProvider {
  readFile(remotePath: string): Promise<string>;
  writeFile(remotePath: string, content: string): Promise<void>;
  stat(remotePath: string): Promise<{ size: number; mtime: Date } | null>;
  readdir(remotePath: string): Promise<FileInfo[]>;
  exists(remotePath: string): Promise<boolean>;
  mkdir(remotePath: string): Promise<void>;
  deleteFile(remotePath: string): Promise<void>;
}

export interface ContainerManager {
  getStatus(): Promise<{
    state: 'running' | 'stopped' | 'restarting' | 'paused' | 'dead' | 'unknown';
    startedAt?: string;
    uptime?: number;
    health?: string;
  }>;
  restart(): Promise<void>;
}
