import { describe, expect, it } from "vitest";

import {
  commentMentionsAgent,
  extractMentionHandles,
  resolveMentions,
  splitCommentText,
} from "@/features/agent/mentions";

describe("mentions", () => {
  it("extracts handles", () => {
    expect(extractMentionHandles("@agent help with squat")).toEqual(["agent"]);
    expect(
      extractMentionHandles("hey @maya and @Agent — form check"),
    ).toEqual(["maya", "agent"]);
  });

  it("resolves agent and followed users only", () => {
    const mentions = resolveMentions("@agent @maya @stranger tips", [
      { id: "1", username: "maya", name: "Maya" },
    ]);
    expect(mentions).toEqual([
      { kind: "agent" },
      { kind: "user", userId: "1", username: "maya" },
    ]);
    expect(commentMentionsAgent(mentions)).toBe(true);
  });

  it("splits text into mention chips", () => {
    const parts = splitCommentText("@agent cue my hips", [
      { kind: "agent" },
    ]);
    expect(parts).toEqual([
      { type: "mention", kind: "agent" },
      { type: "text", value: " cue my hips" },
    ]);
  });
});
