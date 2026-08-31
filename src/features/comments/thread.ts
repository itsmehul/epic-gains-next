import type { Comment } from "@/features/comments/types";

export type CommentThread = {
  root: Comment;
  replies: Comment[];
};

export function groupCommentsIntoThreads(items: Comment[]): CommentThread[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const repliesByParent = new Map<string, Comment[]>();
  const roots: Comment[] = [];

  for (const item of items) {
    const parentId = item.parentId ?? null;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parentId && parent && !parent.parentId) {
      const list = repliesByParent.get(parentId) ?? [];
      list.push(item);
      repliesByParent.set(parentId, list);
      continue;
    }
    roots.push(item);
  }

  return roots
    .toReversed()
    .map((root) => ({
      root,
      replies: repliesByParent.get(root.id) ?? [],
    }));
}
