import { Client, SFTPWrapper } from 'ssh2';
import type { FileProvider, FileInfo } from './types.js';
import { env } from '../config/env.js';

const IDLE_TIMEOUT_MS = 30_000;

export class SshFileProvider implements FileProvider {
  private client: Client | null = null;
  private sftp: SFTPWrapper | null = null;
  private connecting: Promise<SFTPWrapper> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.close(), IDLE_TIMEOUT_MS);
  }

  private close(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.client) {
      this.client.end();
      this.client = null;
      this.sftp = null;
    }
    this.connecting = null;
  }

  private ensureConnection(): Promise<SFTPWrapper> {
    // Return existing healthy connection
    if (this.sftp && this.client) {
      this.resetIdleTimer();
      return Promise.resolve(this.sftp);
    }

    // Deduplicate concurrent connection attempts
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<SFTPWrapper>((resolve, reject) => {
      const client = new Client();

      const config: any = {
        host: env.sshHost,
        port: env.sshPort,
        username: env.sshUsername,
      };

      const connect = () => {
        client
          .on('ready', () => {
            client.sftp((err, sftp) => {
              if (err) {
                client.end();
                this.connecting = null;
                reject(err);
              } else {
                this.client = client;
                this.sftp = sftp;
                this.connecting = null;
                this.resetIdleTimer();
                resolve(sftp);
              }
            });
          })
          .on('error', (err) => {
            this.close();
            reject(err);
          })
          .on('close', () => {
            this.client = null;
            this.sftp = null;
            this.connecting = null;
          })
          .connect(config);
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
      }
    });

    return this.connecting;
  }

  async readFile(remotePath: string): Promise<string> {
    const sftp = await this.ensureConnection();
    return new Promise<string>((resolve, reject) => {
      let data = '';
      const stream = sftp.createReadStream(remotePath, { encoding: 'utf8' });
      stream.on('data', (chunk: string) => (data += chunk));
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    });
  }

  async writeFile(remotePath: string, content: string): Promise<void> {
    const sftp = await this.ensureConnection();
    const tmpPath = remotePath + '.tmp';
    await new Promise<void>((resolve, reject) => {
      const stream = sftp.createWriteStream(tmpPath);
      stream.on('close', () => resolve());
      stream.on('error', reject);
      stream.end(content, 'utf8');
    });
    await new Promise<void>((resolve, reject) => {
      sftp.rename(tmpPath, remotePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async stat(remotePath: string): Promise<{ size: number; mtime: Date } | null> {
    const sftp = await this.ensureConnection();
    return new Promise((resolve) => {
      sftp.stat(remotePath, (err, stats) => {
        if (err) {
          resolve(null);
        } else {
          resolve({
            size: stats.size,
            mtime: new Date(stats.mtime * 1000),
          });
        }
      });
    });
  }

  async readdir(remotePath: string): Promise<FileInfo[]> {
    const sftp = await this.ensureConnection();
    return new Promise<FileInfo[]>((resolve) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) {
          resolve([]);
          return;
        }
        const results: FileInfo[] = list.map((item) => ({
          name: item.filename,
          isDirectory: item.attrs.isDirectory(),
          size: item.attrs.size,
          modifiedAt: new Date(item.attrs.mtime * 1000),
        }));
        resolve(results);
      });
    });
  }

  async exists(remotePath: string): Promise<boolean> {
    const s = await this.stat(remotePath);
    return s !== null;
  }

  async mkdir(remotePath: string): Promise<void> {
    const sftp = await this.ensureConnection();
    await new Promise<void>((resolve, reject) => {
      sftp.mkdir(remotePath, (err) => {
        if (err && (err as any).code !== 4) reject(err);
        else resolve();
      });
    });
  }

  async deleteFile(remotePath: string): Promise<void> {
    const sftp = await this.ensureConnection();
    await new Promise<void>((resolve, reject) => {
      sftp.unlink(remotePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
