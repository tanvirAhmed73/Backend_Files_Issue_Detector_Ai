// disk type
export type DiskType = 'local' | 's3';

// Disk option
export type DiskOption = {
  /**
   * Set disk driver
   */
  driver?: DiskType;
  /**
   * Disk connection config
   */
  connection: {
    /**
     * set root url for local storage
     * @example public/upload
     */
    rootUrl?: string;
    /**
     * set public url for local storage
     * @example public/upload
     */
    publicUrl?: string;
    /**
     * For aws S3
     */
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsDefaultRegion?: string;
    awsBucket?: string;
    awsEndpoint?: string;

    /**
     * using minio
     */
    minio?: boolean;
  };
};
