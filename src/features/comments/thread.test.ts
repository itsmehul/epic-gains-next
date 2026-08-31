import { describe, expect, it } from "vitest";

import { groupCommentsIntoThreads } from "@/features/comments/thread";
import type { Comment } from "@/features/comments/types";

function comment(
  id: string,
  text: string,
  parentId: string | null = null,
): Comment {
  return {
    id,
    exerciseId: "ex",
    workoutId: null,
    text,
    role: "user",
    mentions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    parentId,
    authorId: "u1",
    author: {
      id: "u1",
      name: "Ada",
      username: "ada",
      image: null,
      isPrivate: false,
    },
  };
}

describe("groupCommentsIntoThreads", () => {
  it("nests one level of replies under the root, newest roots first", () => {
    const a = comment("a", "root a");
    const b = comment("b", "root b");
    const a1 = comment("a1", "reply", "a");
    const a2 = comment("a2", "reply 2", "a");
    const threads = groupCommentsIntoThreads([a, a1, b, a2]);

    expect(threads.map((t) => t.root.id)).toEqual(["b", "a"]);
    expect(threads[1]?.replies.map((r) => r.id)).toEqual(["a1", "a2"]);
  });

  it("treats replies to replies as roots so nesting stays one level", () => {
    const a = comment("a", "root");
    const a1 = comment("a1", "reply", "a");
    const deep = comment("deep", "too deep", "a1");
    const threads = groupCommentsIntoThreads([a, a1, deep]);

    expect(threads.map((t) => t.root.id)).toEqual(["deep", "a"]);
    expect(threads[1]?.replies.map((r) => r.id)).toEqual(["a1"]);
  });
});
