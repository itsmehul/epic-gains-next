import "server-only";

import { getEnv } from "@/shared/env";

export type PutObjectInput = {
  key: string;
  body: Buffer | string;
  contentType?: string;
};

/**
 * S3-compatible storage stub.
 * Without credentials, stores nothing and returns a fake URL.
 */
export async function putObject(input: PutObjectInput) {
  const env = getEnv();

  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    console.info("[storage:stub] putObject", {
      key: input.key,
      contentType: input.contentType,
      bytes:
        typeof input.body === "string"
          ? Buffer.byteLength(input.body)
          : input.body.byteLength,
    });
    return {
      key: input.key,
      url: `stub://storage/${input.key}`,
      stub: true as const,
    };
  }

  // Intentionally left as an interface hook — wire @aws-sdk/client-s3 per app.
  throw new Error(
    "S3 credentials are set but the SDK client is not wired yet. Add @aws-sdk/client-s3 in your app.",
  );
}

export async function getObjectUrl(key: string) {
  const env = getEnv();
  if (!env.S3_BUCKET) {
    return `stub://storage/${key}`;
  }
  if (env.S3_ENDPOINT) {
    return `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
  }
  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}
