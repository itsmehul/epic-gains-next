import {
  MUSCLE_GROUP_VALUES,
  type MuscleGroup,
} from "@/db/schema/workout-schema";
import {
  SIMILAR_EXERCISE_THRESHOLD,
  exerciseNameSimilarity,
  normalizeExerciseName,
} from "@/features/workouts/exercise-name";

export type MuscleSearchTarget = {
  muscleGroups: MuscleGroup[];
  keyMusclePatterns: string[];
  matchedExerciseNames: string[];
};

type CatalogExercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup | null;
  keyMuscles: string[];
};

const QUERY_ALIASES: Array<{
  match: RegExp;
  muscleGroups: MuscleGroup[];
  keyMuscles: string[];
}> = [
  {
    match: /\b(knees?|patella)\b/i,
    muscleGroups: ["legs"],
    keyMuscles: ["quad", "vastus", "glute", "hamstring"],
  },
  {
    match: /\b(upper legs?|thighs?|quads?|quadriceps)\b/i,
    muscleGroups: ["legs"],
    keyMuscles: ["quad", "vastus"],
  },
  {
    match: /\b(hamstrings?|posterior chain)\b/i,
    muscleGroups: ["legs", "back"],
    keyMuscles: ["hamstring", "glute", "erector"],
  },
  {
    match: /\b(glutes?|hips?)\b/i,
    muscleGroups: ["legs"],
    keyMuscles: ["glute"],
  },
  {
    match: /\b(deadlifts?)\b/i,
    muscleGroups: ["back", "legs"],
    keyMuscles: ["lat", "erector", "hamstring", "glute", "trap"],
  },
  {
    match: /\b(lower back|low back|lumbar)\b/i,
    muscleGroups: ["back", "core"],
    keyMuscles: ["erector", "glute"],
  },
  {
    match: /\b(lats?|upper back)\b/i,
    muscleGroups: ["back"],
    keyMuscles: ["lat", "trap", "rhomboid"],
  },
  {
    match: /\b(shoulders?|delts?)\b/i,
    muscleGroups: ["shoulders"],
    keyMuscles: ["delt"],
  },
  {
    match: /\b(elbows?|biceps?|triceps?)\b/i,
    muscleGroups: ["arms"],
    keyMuscles: ["bicep", "tricep"],
  },
  {
    match: /\b(core|abs?|obliques?)\b/i,
    muscleGroups: ["core"],
    keyMuscles: ["ab", "oblique", "transverse"],
  },
  {
    match: /\b(chest|pecs?)\b/i,
    muscleGroups: ["chest"],
    keyMuscles: ["pec"],
  },
];

function addGroup(target: Set<MuscleGroup>, group: MuscleGroup | null | undefined) {
  if (group && MUSCLE_GROUP_VALUES.includes(group)) target.add(group);
}

function addPattern(target: Set<string>, value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length >= 2) target.add(trimmed);
}

/** Map a complaint or lift name to muscle groups and key-muscle search patterns. */
export function resolveMuscleSearch(input: {
  query: string;
  muscleGroups?: MuscleGroup[];
  keyMuscles?: string[];
  catalog?: CatalogExercise[];
  currentExercise?: CatalogExercise | null;
}): MuscleSearchTarget {
  const groups = new Set<MuscleGroup>();
  const patterns = new Set<string>();
  const matchedExerciseNames: string[] = [];
  const query = input.query.trim();
  const lower = query.toLowerCase();

  for (const group of input.muscleGroups ?? []) addGroup(groups, group);
  for (const muscle of input.keyMuscles ?? []) addPattern(patterns, muscle);

  for (const group of MUSCLE_GROUP_VALUES) {
    if (new RegExp(`\\b${group}\\b`, "i").test(query)) addGroup(groups, group);
  }

  for (const alias of QUERY_ALIASES) {
    if (alias.match.test(query)) {
      for (const group of alias.muscleGroups) addGroup(groups, group);
      for (const muscle of alias.keyMuscles) addPattern(patterns, muscle);
    }
  }

  if (input.currentExercise) {
    addGroup(groups, input.currentExercise.muscleGroup);
    for (const muscle of input.currentExercise.keyMuscles) {
      addPattern(patterns, muscle);
    }
    if (lower && exerciseNameSimilarity(query, input.currentExercise.name) >= 0.5) {
      matchedExerciseNames.push(input.currentExercise.name);
    }
  }

  if (query && input.catalog) {
    const tokens = normalizeExerciseName(query)
      .split(" ")
      .filter((token) => token.length >= 4);

    const ranked = input.catalog
      .map((exercise) => {
        const name = normalizeExerciseName(exercise.name);
        const tokenHit = tokens.some((token) => {
          const stem = token.endsWith("s") ? token.slice(0, -1) : token;
          return name.includes(token) || (stem.length >= 4 && name.includes(stem));
        });
        const score = Math.max(
          exerciseNameSimilarity(query, exercise.name),
          tokenHit ? 0.9 : 0,
        );
        return { exercise, score };
      })
      .filter((item) => item.score >= SIMILAR_EXERCISE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const item of ranked) {
      matchedExerciseNames.push(item.exercise.name);
      addGroup(groups, item.exercise.muscleGroup);
      for (const muscle of item.exercise.keyMuscles) {
        addPattern(patterns, muscle);
      }
    }
  }

  return {
    muscleGroups: [...groups],
    keyMusclePatterns: [...patterns],
    matchedExerciseNames: [...new Set(matchedExerciseNames)],
  };
}
