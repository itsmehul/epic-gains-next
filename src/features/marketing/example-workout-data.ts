import type { MetricProfile, MuscleGroup, TargetSet } from "@/db/schema/workout-schema";
import type { Comment } from "@/features/comments/types";
import type { Set } from "@/features/workouts/types";

export const EXAMPLE_WORKOUT_ID = "demo-mobility";
export const EXAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=gXs3GRt3QpY";
export const EXAMPLE_CHANNEL_URL = "https://www.youtube.com/c/EDRFitness";
export const EXAMPLE_AUTHOR = "EDR Fitness";

const YOU = {
  id: "demo-you",
  name: "Maya Chen",
  username: "maya",
  image: null,
  isPrivate: false,
};

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
}): Comment {
  return {
    id: args.id,
    exerciseId: args.exerciseId,
    workoutId: EXAMPLE_WORKOUT_ID,
    text: args.text,
    createdAt: atDay(args.daysAgo, 10, 4),
    authorId: YOU.id,
    author: YOU,
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
    { daysAgo: 10, reps: Math.max(6, today - 4) },
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
    makeSet({ id: `${prefix}-t0`, exerciseId, daysAgo: 0, time: 40, minute: 20 }),
    makeSet({
      id: `${prefix}-3-0`,
      exerciseId,
      daysAgo: 3,
      time: 38,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-10-0`,
      exerciseId,
      daysAgo: 10,
      time: 35,
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
};

const RAW_EXERCISES: RawExercise[] = [
  {
    name: "Hip Openers",
    timestamp: "00:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Gluteus Medius",
      "Gluteus Minimus",
      "Piriformis",
      "Iliopsoas",
      "Tensor Fasciae Latae",
    ],
  },
  {
    name: "90/90 Good Morning",
    timestamp: "01:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Gluteus Maximus",
      "Piriformis",
      "Gemelli",
      "Obturator Internus",
      "Erector Spinae",
    ],
  },
  {
    name: "90/90 Seated Rotation",
    timestamp: "02:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "Internal Obliques",
      "External Obliques",
      "Gluteus Medius",
      "Piriformis",
      "Erector Spinae",
    ],
  },
  {
    name: "90/90 Good Morning",
    timestamp: "03:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Gluteus Maximus",
      "Piriformis",
      "Gemelli",
      "Obturator Internus",
      "Erector Spinae",
    ],
  },
  {
    name: "90/90 Seated Rotation",
    timestamp: "04:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "Internal Obliques",
      "External Obliques",
      "Gluteus Medius",
      "Piriformis",
      "Erector Spinae",
    ],
  },
  {
    name: "World's Greatest Stretch",
    timestamp: "05:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Iliopsoas",
      "Thoracic Extensors",
      "Gluteus Maximus",
      "Hamstrings",
      "Adductor Magnus",
    ],
  },
  {
    name: "Half Kneeling Twist",
    timestamp: "06:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "External Obliques",
      "Internal Obliques",
      "Iliopsoas",
      "Rectus Femoris",
      "Erector Spinae",
    ],
  },
  {
    name: "Half Kneeling Windmill",
    timestamp: "07:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "External Obliques",
      "Internal Obliques",
      "Quadratus Lumborum",
      "Iliopsoas",
      "Gluteus Medius",
    ],
  },
  {
    name: "World's Greatest Stretch",
    timestamp: "08:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Iliopsoas",
      "Thoracic Extensors",
      "Gluteus Maximus",
      "Hamstrings",
      "Adductor Magnus",
    ],
  },
  {
    name: "Half Kneeling Twist",
    timestamp: "09:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "External Obliques",
      "Internal Obliques",
      "Iliopsoas",
      "Rectus Femoris",
      "Erector Spinae",
    ],
  },
  {
    name: "Half Kneeling Windmill",
    timestamp: "10:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "core",
    key_muscles: [
      "External Obliques",
      "Internal Obliques",
      "Quadratus Lumborum",
      "Iliopsoas",
      "Gluteus Medius",
    ],
  },
  {
    name: "Spinal Waves",
    timestamp: "11:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "back",
    key_muscles: [
      "Erector Spinae",
      "Multifidus",
      "Rectus Abdominis",
      "Latissimus Dorsi",
      "Hamstrings",
    ],
  },
  {
    name: "Scorpion Kick",
    timestamp: "12:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Gluteus Maximus",
      "Hamstrings",
      "Iliopsoas",
      "External Obliques",
      "Gastrocnemius",
    ],
  },
  {
    name: "Pigeon Stretch",
    timestamp: "13:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "legs",
    key_muscles: [
      "Piriformis",
      "Gluteus Maximus",
      "Gluteus Medius",
      "Tensor Fasciae Latae",
      "Iliopsoas",
    ],
  },
  {
    name: "Scorpion Kick",
    timestamp: "14:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Gluteus Maximus",
      "Hamstrings",
      "Iliopsoas",
      "External Obliques",
      "Gastrocnemius",
    ],
  },
  {
    name: "Pigeon Stretch",
    timestamp: "15:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "legs",
    key_muscles: [
      "Piriformis",
      "Gluteus Maximus",
      "Gluteus Medius",
      "Tensor Fasciae Latae",
      "Iliopsoas",
    ],
  },
  {
    name: "Cossack Squat",
    timestamp: "16:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Adductor Magnus",
      "Adductor Longus",
      "Gracilis",
      "Quadriceps",
      "Gluteus Medius",
    ],
  },
  {
    name: "Pancake Thoracic Spine Rotation",
    timestamp: "17:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "back",
    key_muscles: [
      "Thoracic Extensors",
      "Rhomboids",
      "Hamstrings",
      "Adductor Magnus",
      "Internal Obliques",
    ],
  },
  {
    name: "Cossack Squat",
    timestamp: "18:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Adductor Magnus",
      "Adductor Longus",
      "Gracilis",
      "Quadriceps",
      "Gluteus Medius",
    ],
  },
  {
    name: "Pancake Shoulder Stretch",
    timestamp: "19:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "shoulders",
    key_muscles: [
      "Anterior Deltoid",
      "Pectoralis Major",
      "Hamstrings",
      "Adductor Magnus",
      "Biceps Brachii",
    ],
  },
  {
    name: "Natural Leg Extension",
    timestamp: "20:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Rectus Femoris",
      "Vastus Lateralis",
      "Vastus Medialis",
      "Vastus Intermedius",
      "Rectus Abdominis",
    ],
  },
  {
    name: "Low Lunge Lift-Off",
    timestamp: "21:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Iliopsoas",
      "Rectus Femoris",
      "Gluteus Maximus",
      "Tensor Fasciae Latae",
      "Pectineus",
    ],
  },
  {
    name: "Low Lunge Lift-Off",
    timestamp: "22:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "legs",
    key_muscles: [
      "Iliopsoas",
      "Rectus Femoris",
      "Gluteus Maximus",
      "Tensor Fasciae Latae",
      "Pectineus",
    ],
  },
  {
    name: "Puppy Dog Stretch",
    timestamp: "23:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "back",
    key_muscles: [
      "Latissimus Dorsi",
      "Pectoralis Major",
      "Thoracic Spine Extensors",
      "Teres Major",
      "Anterior Deltoid",
    ],
  },
  {
    name: "Quadruped Thoracic Spine Rotation",
    timestamp: "24:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "back",
    key_muscles: [
      "Thoracic Extensors",
      "Rhomboids",
      "Middle Trapezius",
      "Internal Obliques",
      "External Obliques",
    ],
  },
  {
    name: "Quadruped Thoracic Spine Rotation",
    timestamp: "25:24",
    metric_profile: "BODYWEIGHT_REPS",
    muscle_group: "back",
    key_muscles: [
      "Thoracic Extensors",
      "Rhomboids",
      "Middle Trapezius",
      "Internal Obliques",
      "External Obliques",
    ],
  },
  {
    name: "Bridge",
    timestamp: "26:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "back",
    key_muscles: [
      "Erector Spinae",
      "Gluteus Maximus",
      "Latissimus Dorsi",
      "Pectoralis Major",
      "Rectus Abdominis",
    ],
  },
  {
    name: "Plow Pose",
    timestamp: "27:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "back",
    key_muscles: [
      "Erector Spinae",
      "Hamstrings",
      "Trapezius",
      "Rhomboids",
      "Gastrocnemius",
    ],
  },
  {
    name: "Supine Spinal Twist",
    timestamp: "28:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "core",
    key_muscles: [
      "Gluteus Medius",
      "Piriformis",
      "External Obliques",
      "Pectoralis Major",
      "Erector Spinae",
    ],
  },
  {
    name: "Supine Spinal Twist",
    timestamp: "29:24",
    metric_profile: "TIMED_HOLD",
    muscle_group: "core",
    key_muscles: [
      "Gluteus Medius",
      "Piriformis",
      "External Obliques",
      "Pectoralis Major",
      "Erector Spinae",
    ],
  },
];

const COMMENTS_BY_EXERCISE: Record<string, Array<{ id: string; daysAgo: number; text: string }>> = {
  "ex-world-s-greatest-stretch": [
    {
      id: "c-wgs-1",
      daysAgo: 0,
      text: "Front heel wanted to lift. Keep the back hip heavy and rotate from the ribcage, not the neck.",
    },
  ],
  "ex-spinal-waves": [
    {
      id: "c-sw-1",
      daysAgo: 3,
      text: "Move one vertebra at a time. I was dumping into lumbar flexion instead of sequencing the spine.",
    },
  ],
  "ex-pigeon-stretch": [
    {
      id: "c-pg-1",
      daysAgo: 0,
      text: "Square the hips before folding. Right side still tighter — stay taller if the knee complains.",
    },
  ],
  "ex-cossack-squat": [
    {
      id: "c-cs-1",
      daysAgo: 0,
      text: "Sit into the heel, not the toes. Left adductor is the limiter, not the depth.",
    },
    {
      id: "c-cs-2",
      daysAgo: 10,
      text: "Could not get the opposite leg straight last week. Closer today.",
    },
  ],
  "ex-puppy-dog-stretch": [
    {
      id: "c-pd-1",
      daysAgo: 3,
      text: "Walk the hands farther, keep hips over knees. Chest was collapsing toward the floor.",
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

export const EXAMPLE_EXERCISES: ExampleExercise[] = RAW_EXERCISES.map((item, index) => {
  const exerciseId = `ex-${slug(item.name)}`;
  const prefix = slug(item.name).slice(0, 12);

  if (!setsByExerciseId.has(exerciseId)) {
    if (item.metric_profile === "TIMED_HOLD") {
      setsByExerciseId.set(exerciseId, timeHistory(exerciseId, prefix));
    } else {
      setsByExerciseId.set(
        exerciseId,
        repHistory(exerciseId, prefix, 10 + (seed(item.name) % 6)),
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
    targetSets:
      item.metric_profile === "TIMED_HOLD" ? [{ time: 40 }] : [{ reps: 12 }],
    sets: setsByExerciseId.get(exerciseId) ?? [],
    comments: commentsByExerciseId.get(exerciseId) ?? [],
  };
});
