import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getB2Bucket, getB2Client, publicUrlForKey } from '../config/b2.js'

export type UploadMeta = {
  key: string
  contentType: string
  body: PutObjectCommandInput['Body']
}

export async function uploadObject({ key, contentType, body }: UploadMeta) {
  const client = getB2Client()
  const bucket = getB2Bucket()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )

  return {
    key,
    url: publicUrlForKey(key),
  }
}

export async function createPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const client = getB2Client()
  const bucket = getB2Bucket()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(['content-type']),
  })

  return {
    key,
    uploadUrl,
    publicUrl: publicUrlForKey(key),
    expiresIn,
  }
}

export async function createPresignedDownloadUrl(key: string, expiresIn = 3600) {
  const client = getB2Client()
  const bucket = getB2Bucket()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function getObjectStream(key: string, range?: string) {
  const client = getB2Client()
  const bucket = getB2Bucket()

  return client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range,
    }),
  )
}

export async function deleteObject(key: string) {
  const client = getB2Client()
  const bucket = getB2Bucket()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  )
}

export async function configureBucketCors(origins: string[]) {
  const client = getB2Client()
  const bucket = getB2Bucket()

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
            AllowedHeaders: ['*'],
            ExposeHeaders: [
              'ETag',
              'x-amz-request-id',
              'x-amz-version-id',
              'Content-Range',
              'Accept-Ranges',
              'Content-Length',
            ],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  )
}
