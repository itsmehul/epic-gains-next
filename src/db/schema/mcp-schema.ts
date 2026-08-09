import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const mcpApiKey = pgTable(
  "mcp_api_key",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("mcp_api_key_user_id_idx").on(table.userId),
    index("mcp_api_key_key_hash_idx").on(table.keyHash),
  ],
);

export const mcpApiKeyRelations = relations(mcpApiKey, ({ one }) => ({
  user: one(user, {
    fields: [mcpApiKey.userId],
    references: [user.id],
  }),
}));

export type McpApiKey = typeof mcpApiKey.$inferSelect;
export type NewMcpApiKey = typeof mcpApiKey.$inferInsert;
