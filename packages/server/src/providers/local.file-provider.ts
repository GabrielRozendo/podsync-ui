import fs from 'fs/promises';
import path from 'path';
import type { FileProvider, FileInfo } from './types.js';

export class LocalFileProvider implements FileProvider {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, content, 'utf-8');
    try {
      await fs.rename(tmpPath, filePath);
    } catch (err: any) {
      if (err.code === 'EBUSY' || err.code === 'EXDEV') {
        // EBUSY: file locked by another process (e.g. Podsync reading it)
        // EXDEV: cross-device rename (different mount points)
        // Fall back to non-atomic overwrite
        await fs.copyFile(tmpPath, filePath);
        await fs.unlink(tmpPath).catch(() => {});
      } else {
        await fs.unlink(tmpPath).catch(() => {});
        throw err;
      }
    }
  }

  async stat(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const s = await fs.stat(filePath);
      return { size: s.size, mtime: s.mtime };
    } catch {
      return null;
    }
  }

  async readdir(dirPath: string): Promise<FileInfo[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const results: FileInfo[] = [];
      for (const entry of entries) {
        try {
          const fullPath = path.join(dirPath, entry.name);
          const s = await fs.stat(fullPath);
          results.push({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size: s.size,
            modifiedAt: s.mtime,
          });
        } catch {
          // skip files we can't stat
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }
}
