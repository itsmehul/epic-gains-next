import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userGeminiKey } from "@/db/schema";
import {
  decryptSecret,
  encryptSecret,
} from "@/infrastructure/crypto/secret";

export async function hasUserGeminiKey(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: userGeminiKey.userId })
    .from(userGeminiKey)
    .where(eq(userGeminiKey.userId, userId))
    .limit(1);
  return Boolean(row);
}

export async function getDecryptedUserGeminiKey(
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(userGeminiKey)
    .where(eq(userGeminiKey.userId, userId))
    .limit(1);
  if (!row) return null;
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv });
}

export async function upsertUserGeminiKey(
  userId: string,
  apiKey: string,
): Promise<void> {
  const { ciphertext, iv } = encryptSecret(apiKey);
  await db
    .insert(userGeminiKey)
    .values({ userId, ciphertext, iv })
    .onConflictDoUpdate({
      target: userGeminiKey.userId,
      set: { ciphertext, iv, updatedAt: new Date() },
    });
}

export async function deleteUserGeminiKey(userId: string): Promise<void> {
  await db.delete(userGeminiKey).where(eq(userGeminiKey.userId, userId));
}
