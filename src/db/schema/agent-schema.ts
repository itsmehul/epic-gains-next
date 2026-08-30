import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/** Per-user Gemini API key, stored encrypted (AES-256-GCM). */
export const userGeminiKey = pgTable("user_gemini_key", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userGeminiKeyRelations = relations(userGeminiKey, ({ one }) => ({
  user: one(user, {
    fields: [userGeminiKey.userId],
    references: [user.id],
  }),
}));

export type UserGeminiKey = typeof userGeminiKey.$inferSelect;
export type NewUserGeminiKey = typeof userGeminiKey.$inferInsert;
