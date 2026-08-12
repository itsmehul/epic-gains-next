/** Normalize exercise names for fuzzy matching (Push-up ≈ push up). */
export function normalizeExerciseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }

  return prev[b.length]!;
}

/** Similarity in [0, 1]. Higher is closer. */
export function exerciseNameSimilarity(a: string, b: string): number {
  const na = normalizeExerciseName(a);
  const nb = normalizeExerciseName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const compactA = na.replace(/ /g, "");
  const compactB = nb.replace(/ /g, "");
  if (compactA === compactB) return 0.98;

  const maxLen = Math.max(na.length, nb.length);
  const distanceScore = 1 - levenshtein(na, nb) / maxLen;

  let containsScore = 0;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    containsScore = 0.75 + 0.2 * (shorter / maxLen);
  }

  let compactScore = 0;
  if (compactA.includes(compactB) || compactB.includes(compactA)) {
    const shorter = Math.min(compactA.length, compactB.length);
    const longer = Math.max(compactA.length, compactB.length);
    compactScore = 0.8 + 0.15 * (shorter / longer);
  }

  return Math.max(distanceScore, containsScore, compactScore);
}

export const SIMILAR_EXERCISE_THRESHOLD = 0.62;
