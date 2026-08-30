import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const follow = pgTable(
  "follow",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    index("follow_followingId_idx").on(table.followingId),
    index("follow_followerId_idx").on(table.followerId),
  ],
);

export const followRequest = pgTable(
  "follow_request",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("follow_request_requester_target_uidx").on(
      table.requesterId,
      table.targetId,
    ),
    index("follow_request_targetId_idx").on(table.targetId),
    index("follow_request_requesterId_idx").on(table.requesterId),
  ],
);

export const followRelations = relations(follow, ({ one }) => ({
  follower: one(user, {
    fields: [follow.followerId],
    references: [user.id],
    relationName: "followers",
  }),
  following: one(user, {
    fields: [follow.followingId],
    references: [user.id],
    relationName: "following",
  }),
}));

export const followRequestRelations = relations(followRequest, ({ one }) => ({
  requester: one(user, {
    fields: [followRequest.requesterId],
    references: [user.id],
    relationName: "outgoingFollowRequests",
  }),
  target: one(user, {
    fields: [followRequest.targetId],
    references: [user.id],
    relationName: "incomingFollowRequests",
  }),
}));

export const trainerAssignment = pgTable(
  "trainer_assignment",
  {
    athleteId: text("athlete_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.athleteId, table.trainerId] }),
    index("trainer_assignment_trainerId_idx").on(table.trainerId),
    index("trainer_assignment_athleteId_idx").on(table.athleteId),
  ],
);

export const trainerAssignmentRelations = relations(
  trainerAssignment,
  ({ one }) => ({
    athlete: one(user, {
      fields: [trainerAssignment.athleteId],
      references: [user.id],
      relationName: "athletes",
    }),
    trainer: one(user, {
      fields: [trainerAssignment.trainerId],
      references: [user.id],
      relationName: "trainers",
    }),
  }),
);
