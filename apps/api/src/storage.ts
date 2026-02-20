import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY
  }
});

export async function createPresignedAudioUpload(input: { key: string; contentType: string }) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.key,
    ContentType: input.contentType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: env.S3_SIGNED_UPLOAD_EXPIRES_SEC
  });

  return {
    method: "PUT" as const,
    uploadUrl,
    headers: {
      "content-type": input.contentType
    }
  };
}

export function buildAudioObjectKey(userId: string, fileName: string) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${userId}/${Date.now()}-${safeFileName}`;
}
