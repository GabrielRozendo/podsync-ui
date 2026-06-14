import 'dotenv/config';

export const env = {
  // Mode: 'local' (bind mounts + Docker socket) or 'ssh' (SSH to remote host)
  mode: (process.env.PODSYNC_MODE || 'local') as 'local' | 'ssh',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Podsync paths (local paths for 'local' mode, remote paths for 'ssh' mode)
  podsyncConfigPath: process.env.PODSYNC_CONFIG_PATH || './config.toml',
  podsyncDataDir: process.env.PODSYNC_DATA_DIR || './data',
  podsyncContainerName: process.env.PODSYNC_CONTAINER_NAME || 'podsync',

  // Sidecar's own config (always local)
  sidecarConfigDir: process.env.SIDECAR_CONFIG_DIR || './sidecar-config',

  // SSH settings (only used when mode = 'ssh')
  sshHost: process.env.SSH_HOST || '',
  sshPort: parseInt(process.env.SSH_PORT || '22', 10),
  sshUsername: process.env.SSH_USERNAME || '',
  sshPassword: process.env.SSH_PASSWORD || undefined,
  sshKeyPath: process.env.SSH_KEY_PATH || undefined,
  sshKeyPassphrase: process.env.SSH_KEY_PASSPHRASE || undefined,
  // Build info
  gitCommit: process.env.GIT_COMMIT || 'dev',
  buildTime: process.env.BUILD_TIME || '',

  // TOML backup: create a timestamped backup in sidecarConfigDir/backups/ before any write
  tomlBackupEnabled: process.env.TOML_BACKUP_ENABLED === 'true',
} as const;
