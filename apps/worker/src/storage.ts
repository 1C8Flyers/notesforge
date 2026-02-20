import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

function getRequiredS3Config() {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("Missing S3 worker configuration. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
  }

  return {
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  };
}

export async function createPresignedAudioDownloadUrl(audioObjectKey: string) {
  const s3 = getRequiredS3Config();

  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey
    }
  });

  const command = new GetObjectCommand({
    Bucket: s3.bucket,
    Key: audioObjectKey
  });

  return getSignedUrl(client, command, {
    expiresIn: env.S3_SIGNED_DOWNLOAD_EXPIRES_SEC
  });
}

export async function deleteAudioObject(audioObjectKey: string) {
  const s3 = getRequiredS3Config();
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey
    }
  });

  await client.send(
    new DeleteObjectCommand({
      Bucket: s3.bucket,
      Key: audioObjectKey
    })
  );
}
