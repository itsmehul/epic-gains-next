import { describe, expect, it } from "vitest";

import {
  commentMentionsAgent,
  extractMentionHandles,
  mentionedUserIds,
  addressCommentToUsers,
  mergeCommentMentions,
  buildTrainerRelayComment,
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

  it("resolves agent and known users only", () => {
    const mentions = resolveMentions("@agent @maya @stranger tips", [
      { id: "1", username: "maya", name: "Maya" },
    ]);
    expect(mentions).toEqual([
      { kind: "agent" },
      { kind: "user", userId: "1", username: "maya" },
    ]);
    expect(commentMentionsAgent(mentions)).toBe(true);
    expect(mentionedUserIds(mentions, "author")).toEqual(["1"]);
    expect(mentionedUserIds(mentions, "1")).toEqual([]);
  });

  it("prefixes athlete handles so replies stay private to them", () => {
    expect(
      addressCommentToUsers("Brace and sit back.", [
        { id: "a1", username: "mehul" },
      ]),
    ).toEqual({
      text: "@mehul Brace and sit back.",
      mentions: [{ kind: "user", userId: "a1", username: "mehul" }],
    });
  });

  it("merges extra @mentions without duplicating the athlete", () => {
    const addressed = addressCommentToUsers("also looping @maya", [
      { id: "a1", username: "mehul" },
    ]);
    expect(
      mergeCommentMentions(
        addressed.mentions,
        resolveMentions(addressed.text, [
          { id: "a1", username: "mehul", name: "Mehul" },
          { id: "1", username: "maya", name: "Maya" },
        ]),
      ),
    ).toEqual([
      { kind: "user", userId: "a1", username: "mehul" },
      { kind: "user", userId: "1", username: "maya" },
    ]);
  });

  it("prefixes trainer handles on a relay message", () => {
    expect(
      buildTrainerRelayComment("Pain on the last set — please check form.", [
        { id: "t1", username: "maya" },
      ]),
    ).toEqual({
      text: "@maya Pain on the last set — please check form.",
      mentions: [{ kind: "user", userId: "t1", username: "maya" }],
    });
  });

  it("does not duplicate handles already in the message", () => {
    expect(
      buildTrainerRelayComment("@maya can you jump in?", [
        { id: "t1", username: "maya" },
      ]).text,
    ).toBe("@maya can you jump in?");
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
