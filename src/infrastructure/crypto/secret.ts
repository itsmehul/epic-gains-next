import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { getEnv } from "@/shared/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = getEnv().BETTER_AUTH_SECRET;
  return createHash("sha256").update(secret).digest();
}

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
};

/** Encrypt a secret with AES-256-GCM. Returns base64 ciphertext (incl. auth tag) and iv. */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

/** Decrypt a secret previously encrypted with encryptSecret. */
export function decryptSecret(payload: EncryptedSecret): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "base64");
  const data = Buffer.from(payload.ciphertext, "base64");
  if (data.length < AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext");
  }
  const encrypted = data.subarray(0, data.length - AUTH_TAG_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
