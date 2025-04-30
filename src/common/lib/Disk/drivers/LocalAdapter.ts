import { IStorage } from './iStorage';
import fs from 'fs/promises';
import fsSync from 'fs';
import { DiskOption } from '../Option';

/**
 * LocalAdapter for local file storage
 */
export class LocalAdapter implements IStorage {
  private _config: DiskOption;

  constructor(config: DiskOption) {
    this._config = config;
  }

  /**
   * returns file url
   * @param key
   * @returns
   */
  url(key: string): string {
    return `${process.env.APP_URL}${this._config.connection.publicUrl}${key}`;
  }

  /**
   * check if file exists
   * @param key
   * @returns
   */
  async isExists(key: string): Promise<boolean> {
    try {
      if (fsSync.existsSync(`${this._config.connection.rootUrl}/${key}`)) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * get data
   * @param key
   */
  async get(key: string) {
    try {
      const data = await fs.readFile(
        `${this._config.connection.rootUrl}/${key}`,
        {
          encoding: 'utf8',
        },
      );
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * put data
   * @param key
   * @param value
   */
  async put(key: string, value: any) {
    try {
      await fs.writeFile(`${this._config.connection.rootUrl}/${key}`, value);
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * delete data
   * @param key
   */
  async delete(key: string) {
    await fs.unlink(`${this._config.connection.rootUrl}/${key}`);
  }
}
