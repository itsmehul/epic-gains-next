import type { MetricProfile, MuscleGroup, TargetSet } from "@/db/schema/workout-schema";
import type { Comment } from "@/features/comments/types";
import type { Set } from "@/features/workouts/types";
import { defaultAvatarUrl } from "@/shared/avatar";

export const EXAMPLE_WORKOUT_ID = "demo-mib-circuit";
export const EXAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=Kuv0xThzxrU";
export const EXAMPLE_CHANNEL_URL = "https://www.youtube.com/@menshealthmag";
export const EXAMPLE_AUTHOR = "Men's Health";

const YOU = {
  id: "demo-you",
  name: "Maya Chen",
  username: "maya",
  image: defaultAvatarUrl("maya@epicgains.demo"),
  isPrivate: false,
};

const JORDAN = {
  id: "demo-jordan",
  name: "Jordan Hale",
  username: "jordan",
  image: defaultAvatarUrl("jordan@epicgains.demo"),
  isPrivate: false,
};

const PRIYA = {
  id: "demo-priya",
  name: "Priya Nair",
  username: "priya",
  image: defaultAvatarUrl("priya@epicgains.demo"),
  isPrivate: false,
};

type DemoAuthor = typeof YOU;

function atDay(daysAgo: number, hour = 9, minute = 12): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function makeSet(args: {
  id: string;
  exerciseId: string;
  daysAgo: number;
  reps?: number | null;
  time?: number | null;
  minute?: number;
}): Set {
  const stamped = atDay(args.daysAgo, 9, args.minute ?? 12);
  return {
    id: args.id,
    userId: YOU.id,
    workoutId: EXAMPLE_WORKOUT_ID,
    exerciseId: args.exerciseId,
    reps: args.reps ?? null,
    weight: null,
    time: args.time ?? null,
    distance: null,
    createdAt: stamped,
    updatedAt: stamped,
  };
}

function makeComment(args: {
  id: string;
  exerciseId: string;
  daysAgo: number;
  text: string;
  author?: DemoAuthor;
  hour?: number;
  minute?: number;
}): Comment {
  const author = args.author ?? YOU;
  return {
    id: args.id,
    exerciseId: args.exerciseId,
    workoutId: EXAMPLE_WORKOUT_ID,
    text: args.text,
    createdAt: atDay(args.daysAgo, args.hour ?? 10, args.minute ?? 4),
    authorId: author.id,
    author,
  };
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTimestamp(value: string): number {
  const [minutes, seconds] = value.split(":").map(Number);
  return minutes * 60 + seconds;
}

function seed(name: string): number {
  return name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function repHistory(exerciseId: string, prefix: string, today: number): Set[] {
  const earlier = [
    { daysAgo: 3, reps: Math.max(8, today - 2) },
    { daysAgo: 7, reps: Math.max(7, today - 3) },
    { daysAgo: 14, reps: Math.max(6, today - 4) },
    { daysAgo: 21, reps: Math.max(5, today - 5) },
  ];
  return [
    makeSet({ id: `${prefix}-t0`, exerciseId, daysAgo: 0, reps: today, minute: 14 }),
    ...earlier.map((session) =>
      makeSet({
        id: `${prefix}-${session.daysAgo}-0`,
        exerciseId,
        daysAgo: session.daysAgo,
        reps: session.reps,
        minute: 14,
      }),
    ),
  ];
}

function timeHistory(exerciseId: string, prefix: string): Set[] {
  return [
    makeSet({ id: `${prefix}-t0`, exerciseId, daysAgo: 0, time: 20, minute: 20 }),
    makeSet({
      id: `${prefix}-3-0`,
      exerciseId,
      daysAgo: 3,
      time: 20,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-7-0`,
      exerciseId,
      daysAgo: 7,
      time: 18,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-14-0`,
      exerciseId,
      daysAgo: 14,
      time: 15,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-21-0`,
      exerciseId,
      daysAgo: 21,
      time: 12,
      minute: 20,
    }),
  ];
}

type RawExercise = {
  name: string;
  timestamp: string;
  metric_profile: MetricProfile;
  muscle_group: MuscleGroup;
  key_muscles: string[];
  suggested_sets: number;
  suggested_reps?: number;
  suggested_time?: number;
};

const RAW_EXERCISES: RawExercise[] = [
  {
    name: "Bear Crawl",
    timestamp: "01:26",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "Rectus Abdominis",
      "Transversus Abdominis",
      "Deltoids",
      "Quadriceps",
      "Gluteus Maximus",
    ],
    suggested_sets: 1,
    suggested_time: 20,
  },
  {
    name: "Bodyweight Squat",
    timestamp: "01:47",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Quadriceps",
      "Gluteus Maximus",
      "Hamstrings",
      "Erector Spinae",
    ],
    suggested_sets: 1,
    suggested_time: 20,
  },
  {
    name: "Dumbbell Burpee",
    timestamp: "02:30",
    metric_profile: "WEIGHTED_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Quadriceps",
      "Gluteus Maximus",
      "Pectoralis Major",
      "Deltoids",
      "Rectus Abdominis",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Curl and Press",
    timestamp: "02:58",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "shoulders",
    key_muscles: [
      "Biceps Brachii",
      "Anterior Deltoid",
      "Lateral Deltoid",
      "Triceps Brachii",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Goblet Squat",
    timestamp: "03:13",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Quadriceps",
      "Gluteus Maximus",
      "Adductors",
      "Rectus Abdominis",
      "Erector Spinae",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Overhead Tricep Extension",
    timestamp: "03:40",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "arms",
    key_muscles: [
      "Triceps Brachii",
      "Anterior Deltoid",
      "Rectus Abdominis",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Reverse Lunge Curl",
    timestamp: "04:15",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Quadriceps",
      "Gluteus Maximus",
      "Hamstrings",
      "Biceps Brachii",
      "Rectus Abdominis",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Lateral Raise",
    timestamp: "04:49",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "shoulders",
    key_muscles: ["Lateral Deltoid", "Anterior Deltoid", "Trapezius"],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Front Raise",
    timestamp: "04:53",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "shoulders",
    key_muscles: ["Anterior Deltoid", "Lateral Deltoid", "Serratus Anterior"],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Upright Row",
    timestamp: "04:55",
    metric_profile: "WEIGHT_REPS",
    muscle_group: "shoulders",
    key_muscles: ["Lateral Deltoid", "Trapezius", "Biceps Brachii"],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Plank Punch",
    timestamp: "05:23",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "Rectus Abdominis",
      "Transversus Abdominis",
      "Obliques",
      "Anterior Deltoid",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Plank Pulse",
    timestamp: "05:28",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "Rectus Abdominis",
      "Transversus Abdominis",
      "Serratus Anterior",
      "Erector Spinae",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
  {
    name: "Plank Pike",
    timestamp: "05:37",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "Rectus Abdominis",
      "Transversus Abdominis",
      "Hip Flexors",
      "Serratus Anterior",
    ],
    suggested_sets: 3,
    suggested_reps: 8,
  },
];

type DemoCommentSeed = {
  id: string;
  daysAgo: number;
  text: string;
  author?: DemoAuthor;
  hour?: number;
  minute?: number;
};

const COMMENTS_BY_EXERCISE: Record<string, DemoCommentSeed[]> = {
  "ex-bear-crawl": [
    {
      id: "c-bc-1",
      daysAgo: 0,
      hour: 9,
      minute: 41,
      text: "Started slow then sped up. Shoulders were the limiter, not the legs.",
    },
    {
      id: "c-bc-2",
      daysAgo: 3,
      author: PRIYA,
      text: "Hips stay low. If they pike up, the core unloads.",
    },
  ],
  "ex-bodyweight-squat": [
    {
      id: "c-bws-1",
      daysAgo: 0,
      text: "Weight on the heels, sit-to-a-chair cue actually helped.",
    },
    {
      id: "c-bws-2",
      daysAgo: 7,
      author: JORDAN,
      text: "Twenty seconds is plenty if the last five stay honest.",
    },
  ],
  "ex-dumbbell-burpee": [
    {
      id: "c-db-1",
      daysAgo: 0,
      text: "Neutral spine on the way down. Lost it once when I rushed the jump.",
    },
    {
      id: "c-db-2",
      daysAgo: 3,
      author: PRIYA,
      text: "Keep the bells in hand the whole way. No dumping them at the floor.",
    },
  ],
  "ex-curl-and-press": [
    {
      id: "c-cp-1",
      daysAgo: 0,
      text: "Curl first, then press. If I swing the curl the press gets sloppy.",
    },
    {
      id: "c-cp-2",
      daysAgo: 14,
      author: JORDAN,
      hour: 21,
      minute: 6,
      text: "Heels down, ribs stacked. This is a core move disguised as arms.",
    },
  ],
  "ex-goblet-squat": [
    {
      id: "c-gs-1",
      daysAgo: 0,
      text: "The bell pulling me forward is the whole point. Brace harder, not lighter.",
    },
    {
      id: "c-gs-2",
      daysAgo: 7,
      author: PRIYA,
      text: "Elbows inside the knees at the bottom. Depth was better this week.",
    },
  ],
  "ex-overhead-tricep-extension": [
    {
      id: "c-ote-1",
      daysAgo: 0,
      text: "Elbows back, not flared. Standing version lights up the midline.",
    },
    {
      id: "c-ote-2",
      daysAgo: 3,
      author: JORDAN,
      text: "If the low back arches, the weight is too heavy.",
    },
  ],
  "ex-reverse-lunge-curl": [
    {
      id: "c-rlc-1",
      daysAgo: 0,
      text: "Curl on the way down. Balance failed when I tried to curl on the way up.",
    },
    {
      id: "c-rlc-2",
      daysAgo: 14,
      author: PRIYA,
      text: "Shorten the step if the front knee caves. Form over the extra inch.",
    },
  ],
  "ex-lateral-raise": [
    {
      id: "c-lr-1",
      daysAgo: 0,
      text: "Control the eccentric. No back arch to cheat the last two reps.",
    },
  ],
  "ex-front-raise": [
    {
      id: "c-fr-1",
      daysAgo: 0,
      text: "Stopped at shoulder height. Higher just turns into a shrug.",
    },
  ],
  "ex-upright-row": [
    {
      id: "c-ur-1",
      daysAgo: 0,
      text: "Chin stays quiet. If it juts forward, the traps have taken over.",
    },
    {
      id: "c-ur-2",
      daysAgo: 7,
      author: JORDAN,
      text: "Lighter than the raises. This one gets ugly fast.",
    },
  ],
  "ex-plank-punch": [
    {
      id: "c-pp-1",
      daysAgo: 0,
      text: "Eight punches, hips still. If they rock, the punch is too big.",
    },
  ],
  "ex-plank-pulse": [
    {
      id: "c-plp-1",
      daysAgo: 0,
      text: "Whole body rocks, not just the shoulders. Tiny range, hard brace.",
    },
  ],
  "ex-plank-pike": [
    {
      id: "c-pk-1",
      daysAgo: 0,
      text: "Pull the belly in on the way up. Pike from the hips, not a down-dog dump.",
    },
    {
      id: "c-pk-2",
      daysAgo: 3,
      author: PRIYA,
      text: "Three core moves back to back is the actual finisher. Don't rest between them.",
    },
  ],
};

export type ExampleExercise = {
  id: string;
  exerciseId: string;
  name: string;
  start: number;
  muscleGroup: MuscleGroup;
  keyMuscles: string[];
  metricProfile: MetricProfile;
  targetSets: TargetSet[];
  sets: Set[];
  comments: Comment[];
};

const setsByExerciseId = new Map<string, Set[]>();
const commentsByExerciseId = new Map<string, Comment[]>();

function targetFor(item: RawExercise): TargetSet[] {
  const count = item.suggested_sets;
  const one: TargetSet = {
    reps: item.suggested_reps ?? null,
    time: item.suggested_time ?? null,
  };
  return Array.from({ length: count }, () => ({ ...one }));
}

export const EXAMPLE_EXERCISES: ExampleExercise[] = RAW_EXERCISES.map((item, index) => {
  const exerciseId = `ex-${slug(item.name)}`;
  const prefix = slug(item.name).slice(0, 12);

  if (!setsByExerciseId.has(exerciseId)) {
    if (item.suggested_time && !item.suggested_reps) {
      setsByExerciseId.set(exerciseId, timeHistory(exerciseId, prefix));
    } else {
      setsByExerciseId.set(
        exerciseId,
        repHistory(exerciseId, prefix, item.suggested_reps ?? 8 + (seed(item.name) % 3)),
      );
    }
  }

  if (!commentsByExerciseId.has(exerciseId)) {
    commentsByExerciseId.set(
      exerciseId,
      (COMMENTS_BY_EXERCISE[exerciseId] ?? []).map((comment) =>
        makeComment({ ...comment, exerciseId }),
      ),
    );
  }

  return {
    id: `we-${index}-${prefix}`,
    exerciseId,
    name: item.name,
    start: parseTimestamp(item.timestamp),
    muscleGroup: item.muscle_group,
    keyMuscles: item.key_muscles,
    metricProfile: item.metric_profile,
    targetSets: targetFor(item),
    sets: setsByExerciseId.get(exerciseId) ?? [],
    comments: commentsByExerciseId.get(exerciseId) ?? [],
  };
});
