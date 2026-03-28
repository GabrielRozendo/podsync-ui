import { Client, SFTPWrapper } from 'ssh2';
import type { FileProvider, FileInfo } from './types.js';
import { env } from '../config/env.js';

export class SshFileProvider implements FileProvider {
  private getConnection(): Promise<{ client: Client; sftp: SFTPWrapper }> {
    return new Promise((resolve, reject) => {
      const client = new Client();

      const config: any = {
        host: env.sshHost,
        port: env.sshPort,
        username: env.sshUsername,
      };

      if (env.sshKeyPath) {
        // Read key synchronously for simplicity - it's only done on connection
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
            client.sftp((err, sftp) => {
              if (err) {
                client.end();
                reject(err);
              } else {
                resolve({ client, sftp });
              }
            });
          })
          .on('error', (err) => reject(err))
          .connect(config);
      }
    });
  }

  async readFile(remotePath: string): Promise<string> {
    const { client, sftp } = await this.getConnection();
    try {
      return await new Promise<string>((resolve, reject) => {
        let data = '';
        const stream = sftp.createReadStream(remotePath, { encoding: 'utf8' });
        stream.on('data', (chunk: string) => (data += chunk));
        stream.on('end', () => resolve(data));
        stream.on('error', reject);
      });
    } finally {
      client.end();
    }
  }

  async writeFile(remotePath: string, content: string): Promise<void> {
    const { client, sftp } = await this.getConnection();
    try {
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
    } finally {
      client.end();
    }
  }

  async stat(remotePath: string): Promise<{ size: number; mtime: Date } | null> {
    const { client, sftp } = await this.getConnection();
    try {
      return await new Promise((resolve) => {
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
    } finally {
      client.end();
    }
  }

  async readdir(remotePath: string): Promise<FileInfo[]> {
    const { client, sftp } = await this.getConnection();
    try {
      return await new Promise<FileInfo[]>((resolve) => {
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
    } finally {
      client.end();
    }
  }

  async exists(remotePath: string): Promise<boolean> {
    const s = await this.stat(remotePath);
    return s !== null;
  }

  async mkdir(remotePath: string): Promise<void> {
    const { client, sftp } = await this.getConnection();
    try {
      await new Promise<void>((resolve, reject) => {
        sftp.mkdir(remotePath, (err) => {
          if (err && (err as any).code !== 4) reject(err);
          else resolve();
        });
      });
    } finally {
      client.end();
    }
  }

  async deleteFile(remotePath: string): Promise<void> {
    const { client, sftp } = await this.getConnection();
    try {
      await new Promise<void>((resolve, reject) => {
        sftp.unlink(remotePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } finally {
      client.end();
    }
  }
}
