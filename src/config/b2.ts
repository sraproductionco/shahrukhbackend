import { S3Client } from '@aws-sdk/client-s3'
import { env, hasB2Config } from './env.js'

let s3: S3Client | null = null

/** Backblaze B2 via S3-compatible API */
export function getB2Client(): S3Client {
  if (!hasB2Config()) {
    throw new Error(
      'Backblaze B2 is not configured. Set B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, and B2_ENDPOINT in .env',
    )
  }

  if (!s3) {
    s3 = new S3Client({
      endpoint: env.b2.endpoint,
      region: env.b2.region,
      credentials: {
        accessKeyId: env.b2.keyId,
        secretAccessKey: env.b2.applicationKey,
      },
      forcePathStyle: true,
    })
  }

  return s3
}

export function getB2Bucket(): string {
  if (!env.b2.bucketName) {
    throw new Error('B2_BUCKET_NAME is not set')
  }
  return env.b2.bucketName
}

export function publicUrlForKey(key: string): string {
  const base = env.b2.publicUrl.replace(/\/$/, '')
  return `${base}/${key}`
}
