import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorage } from './iStorage';
import { DiskOption } from '../Option';

/**
 * S3Adapter for s3 bucket storage
 */
export class S3Adapter implements IStorage {
  private _config: DiskOption;
  private s3Client: S3Client;
  private bucket: string;

  constructor(config: DiskOption) {
    this._config = config;
    this.s3Client = new S3Client({ region: this._config.connection.awsDefaultRegion });
    this.bucket = this._config.connection.awsBucket;
  }

  /**
   * returns object url
   *
   * https://[bucketname].s3.[region].amazonaws.com/[object]
   * and for minio
   * http://[endpoint]/[bucketname]/[object]
   * @param key
   * @returns
   */

  url(key: string): string {
    if (this._config.connection.minio) {
      return `${this._config.connection.awsEndpoint}/${this._config.connection.awsBucket}/${key}`;
    }
    return `${this._config.connection.awsBucket}.s3.${this._config.connection.awsDefaultRegion}.amazonaws.com/${key}`;
  }

  /**
   * check if file exists
   * @param key
   * @returns
   */
  async isExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as S3ServiceException).name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * get data
   * @param key
   */
  async get(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const data = await this.s3Client.send(command);
      return data.Body;
    } catch (error) {
      throw new Error(`Failed to get object ${key}: ${error}`);
    }
  }

  /**
   * put data
   * @param key
   * @param value
   */
  async put(
    key: string,
    value: Buffer | Uint8Array | string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: value,
      });
      await this.s3Client.send(command);
    } catch (error) {
      throw error;
    }
  }

  /**
   * delete data
   * @param key
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      if ((error as S3ServiceException).name === 'NotFound') {
        return;
      }
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
