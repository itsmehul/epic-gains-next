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
  assignTrainer,
  buildProfilePayload,
  followUser,
  getAthletesPerformanceMetrics,
  getComparePerformanceMetrics,
  getFollowingPerformanceMetrics,
  getMyAthletes,
  getMyTrainers,
  rejectFollowRequest,
  unassignTrainer,
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
        "Get a user's public profile, follow relationship, trainer assignment, and workout visibility. Not for recaps or 1v1/circle/trainer comparisons — those use compare_performance_metrics, performance_metrics, following_performance_metrics, or athletes_performance_metrics. Do not call this to preflight access.",
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
      description:
        "List accounts a username is following. Not for recaps or comparisons — use following_performance_metrics or performance_metrics.",
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
        "Follow a user. Private accounts create a follow request instead. Only when the user asks to follow someone. Never use to unlock recaps or after a metrics visibility error.",
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
    "assign_trainer",
    {
      title: "Assign trainer",
      description:
        "Assign a friend you follow as your trainer. They can see your workouts even if your account is private.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      const { userId } = getMcpAuth();
      const result = await assignTrainer(userId, username);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "unassign_trainer",
    {
      title: "Unassign trainer",
      description: "Remove a user as your trainer.",
      inputSchema: z.object({
        username: z.string().min(1),
      }),
    },
    async ({ username }) => {
      const { userId } = getMcpAuth();
      const result = await unassignTrainer(userId, username);
      if (!result.ok) return mcpErrorResult(result.error);
      return mcpTextResult(result.data);
    },
  );

  server.registerTool(
    "list_trainers",
    {
      title: "List trainers",
      description: "List people the authenticated user has assigned as trainers.",
      inputSchema: z.object({}),
    },
    async () => {
      const { userId } = getMcpAuth();
      const result = await getMyTrainers(userId);
      return mcpTextResult(result);
    },
  );

  server.registerTool(
    "list_athletes",
    {
      title: "List athletes",
      description:
        "List people who assigned the authenticated user as their trainer. For a roster recap, call athletes_performance_metrics once. Do not loop performance_metrics.",
      inputSchema: z.object({}),
    },
    async () => {
      const { userId } = getMcpAuth();
      const result = await getMyAthletes(userId);
      return mcpTextResult(result);
    },
  );

  server.registerTool(
    "list_follow_requests",
    {
      title: "List follow requests",
      description:
        "List people asking to follow YOU. Use only when the user wants to review, accept, or reject incoming requests. Never use for recaps, 1v1/circle comparisons, or to check whether you can see another user's workouts.",
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
      description:
        "Accept an incoming follow request by id. Only after the user names a request from list_follow_requests. Never after a metrics call.",
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
      description:
        "Reject an incoming follow request by id. Only after the user names a request from list_follow_requests.",
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
        "One-call recap for everyone the authenticated user follows. Includes pulse plus each visible friend's compact analytics (windows, week-over-week, comments, focal-day sets). No multi-week set dump. Do not list_following or loop performance_metrics. Caps at 50 follows.",
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

  server.registerTool(
    "athletes_performance_metrics",
    {
      title: "Athletes performance metrics",
      description:
        "One-call recap for athletes who assigned you as trainer. Includes pulse plus each visible athlete's compact analytics (windows, week-over-week, comments, focal-day sets). No multi-week set dump. Do not list_athletes or loop performance_metrics. Caps at 50 athletes.",
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

      const result = await getAthletesPerformanceMetrics(userId, {
        date: on ?? undefined,
        muscleGroup,
        keyMuscle,
      });
      return mcpTextResult(result);
    },
  );

  server.registerTool(
    "compare_performance_metrics",
    {
      title: "Compare performance metrics",
      description:
        "One-call me-vs-friend comparison. Call exactly once. For 'me vs @nitin' pass only username=nitin — never leftUsername, never a second call. Each side is the same compact analytics as performance_metrics (no multi-week sets). Write the comparison from this payload.",
      inputSchema: z.object({
        username: z
          .string()
          .trim()
          .min(1)
          .describe(
            "Opponent (right). For me vs a friend this is the only username to pass.",
          ),
        leftUsername: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            "Do not set for me vs a friend. Only when comparing two other people (left vs right).",
          ),
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
    async ({ username, leftUsername, date, muscleGroup, keyMuscle }) => {
      const { userId } = getMcpAuth();
      const on = date ? parseIsoDate(date) : new Date();
      if (date && !on) {
        return mcpErrorResult("date must be a valid YYYY-MM-DD calendar date");
      }

      const result = await getComparePerformanceMetrics(userId, {
        username,
        leftUsername,
        date: on ?? undefined,
        muscleGroup,
        keyMuscle,
      });
      return mcpTextResult(result);
    },
  );
}
