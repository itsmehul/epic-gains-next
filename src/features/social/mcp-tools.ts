import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { listFollowingFeed } from "@/db/repositories/feed.repository";
import {
  countIncomingFollowRequests,
  ensureUserSocialProfile,
  getUserByUsername,
  listFollowers,
  listFollowing,
  listIncomingFollowRequests,
  searchUsers,
} from "@/db/repositories/social.repository";
import { updateSocialProfileSchema } from "@/features/social/schemas";
import {
  listWorkoutsQuerySchema,
  muscleGroupEnum,
} from "@/features/workouts/schemas";
import { parseIsoDate } from "@/features/workouts/set-day";
import {
  acceptFollowRequest,
  buildProfilePayload,
  followUser,
  getFollowingPerformanceMetrics,
  rejectFollowRequest,
  unfollowUser,
  updateMySocialSettings,
} from "@/features/social/service";
import { getMcpAuth } from "@/infrastructure/mcp/context";
import {
  mcpErrorResult,
  mcpTextResult,
} from "@/infrastructure/mcp/tool-helpers";

export function registerSocialMcpTools(server: McpServer) {
  server.registerTool(
    "search_users",
    {
      title: "Search users",
      description: "Search users by name or username.",
      inputSchema: z.object({
        query: z.string().trim().min(1).max(64),
      }),
    },
    async ({ query }) => {
      getMcpAuth();
      const items = await searchUsers(query);
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "get_social_profile",
    {
      title: "Get social profile",
      description:
        "Get a user's public profile, follow relationship, and workout visibility. For one friend's training recap, prefer performance_metrics with their username. For everyone you follow, use following_performance_metrics once.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      const { userId } = getMcpAuth();
      const profile = await buildProfilePayload(userId, username);
      if (!profile) return mcpErrorResult("User not found");
      return mcpTextResult(profile);
    },
  );

  server.registerTool(
    "list_followers",
    {
      title: "List followers",
      description: "List followers for a username.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      getMcpAuth();
      const profile = await getUserByUsername(username);
      if (!profile) return mcpErrorResult("User not found");
      const items = await listFollowers(profile.id);
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "list_following",
    {
      title: "List following",
      description: "List accounts a username is following.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      getMcpAuth();
      const profile = await getUserByUsername(username);
      if (!profile) return mcpErrorResult("User not found");
      const items = await listFollowing(profile.id);
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "follow_user",
    {
      title: "Follow user",
      description:
        "Follow a user. Private accounts create a follow request instead.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      const { userId } = getMcpAuth();
      const result = await followUser(userId, username);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "unfollow_user",
    {
      title: "Unfollow user",
      description: "Unfollow a user or cancel a pending follow request.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      const { userId } = getMcpAuth();
      const result = await unfollowUser(userId, username);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "list_follow_requests",
    {
      title: "List follow requests",
      description: "List incoming follow requests for the authenticated user.",
      inputSchema: z.object({}),
    },
    async () => {
      const { userId } = getMcpAuth();
      await ensureUserSocialProfile(userId);
      const items = await listIncomingFollowRequests(userId);
      const count = await countIncomingFollowRequests(userId);
      return mcpTextResult({
        count,
        items: items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "accept_follow_request",
    {
      title: "Accept follow request",
      description: "Accept an incoming follow request by id.",
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async ({ requestId }) => {
      const { userId } = getMcpAuth();
      const result = await acceptFollowRequest(userId, requestId);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "reject_follow_request",
    {
      title: "Reject follow request",
      description: "Reject an incoming follow request by id.",
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async ({ requestId }) => {
      const { userId } = getMcpAuth();
      const result = await rejectFollowRequest(userId, requestId);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "update_social_settings",
    {
      title: "Update social settings",
      description: "Update the authenticated user's username and/or privacy.",
      inputSchema: updateSocialProfileSchema,
    },
    async (input) => {
      const { userId } = getMcpAuth();
      const result = await updateMySocialSettings(userId, input);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "list_following_feed",
    {
      title: "List following feed",
      description:
        "Recent workouts from people you follow. Not for training analytics — use following_performance_metrics for a circle recap, or performance_metrics with a username for one friend.",
      inputSchema: z.object({
        query: z.string().trim().max(200).optional(),
        muscleGroup: listWorkoutsQuerySchema.shape.muscleGroup,
      }),
    },
    async ({ query, muscleGroup }) => {
      const { userId } = getMcpAuth();
      await ensureUserSocialProfile(userId);
      const items = await listFollowingFeed(userId, {
        q: query,
        muscleGroups: muscleGroup,
      });
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "following_performance_metrics",
    {
      title: "Following performance metrics",
      description:
        "One-call recap for everyone the authenticated user follows. Returns each friend's profile fields plus the same performance_metrics payload when workouts are visible, or a visibility reason when not. Do not list_following or loop performance_metrics / get_social_profile for this job. Optional date, muscleGroup, and keyMuscle apply to every friend. Caps at 50 follows.",
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            "As-of date YYYY-MM-DD. Defaults to today. Same window rules as performance_metrics.",
          ),
        muscleGroup: muscleGroupEnum
          .optional()
          .describe("Only include exercises in this muscle group."),
        keyMuscle: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .optional()
          .describe("Only include exercises whose key muscles match this name."),
      }),
    },
    async ({ date, muscleGroup, keyMuscle }) => {
      const { userId } = getMcpAuth();
      const on = date ? parseIsoDate(date) : new Date();
      if (date && !on) {
        return mcpErrorResult("date must be a valid YYYY-MM-DD calendar date");
      }

      const result = await getFollowingPerformanceMetrics(userId, {
        date: on ?? undefined,
        muscleGroup,
        keyMuscle,
      });
      return mcpTextResult(result);
    },
  );
}
