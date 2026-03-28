import { env } from '../config/env.js';
import type { FileProvider, ContainerManager } from './types.js';
import { LocalFileProvider } from './local.file-provider.js';
import { SshFileProvider } from './ssh.file-provider.js';
import { LocalContainerManager } from './local.container-manager.js';
import { SshContainerManager } from './ssh.container-manager.js';

let _fileProvider: FileProvider | null = null;
let _containerManager: ContainerManager | null = null;

export function getFileProvider(): FileProvider {
  if (!_fileProvider) {
    _fileProvider = env.mode === 'ssh' ? new SshFileProvider() : new LocalFileProvider();
  }
  return _fileProvider;
}

export function getContainerManager(): ContainerManager {
  if (!_containerManager) {
    _containerManager = env.mode === 'ssh' ? new SshContainerManager() : new LocalContainerManager();
  }
  return _containerManager;
}

export type { FileProvider, ContainerManager } from './types.js';
