import fs from 'fs/promises';
import path from 'path';
import { Config } from '../core/config';
import { Logger } from '../core/logger';

export class StorageService {
  static async ensureDirs() {
    const dirs = [
      Config.OUTPUT_DIR,
      Config.REPORTS_DIR,
      Config.SCREENSHOTS_DIR,
      Config.VIDEOS_DIR,
      path.join(Config.BASE_DIR, 'tests')
    ];
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
    Logger.info('StorageService', 'Ensured all directories exist.');
  }

  static async saveJson(filename: string, data: any, dir: string = Config.OUTPUT_DIR) {
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    Logger.info('StorageService', `Saved ${filename} to ${dir}`);
  }

  static async loadJson(filename: string, dir: string = Config.OUTPUT_DIR): Promise<any> {
    const filePath = path.join(dir, filename);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  static async saveFile(filename: string, data: string, dir: string) {
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, data, 'utf-8');
    Logger.info('StorageService', `Saved ${filename} to ${dir}`);
  }
}
