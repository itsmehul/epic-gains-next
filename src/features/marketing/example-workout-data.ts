import type { MetricProfile, MuscleGroup, TargetSet } from "@/db/schema/workout-schema";
import type { Comment } from "@/features/comments/types";
import type { Set } from "@/features/workouts/types";
import { defaultAvatarUrl } from "@/shared/avatar";

export const EXAMPLE_WORKOUT_ID = "demo-mobility";
export const EXAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=gXs3GRt3QpY";
export const EXAMPLE_CHANNEL_URL = "https://www.youtube.com/c/EDRFitness";
export const EXAMPLE_AUTHOR = "EDR Fitness";

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
    makeSet({ id: `${prefix}-t0`, exerciseId, daysAgo: 0, time: 45, minute: 20 }),
    makeSet({
      id: `${prefix}-3-0`,
      exerciseId,
      daysAgo: 3,
      time: 40,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-7-0`,
      exerciseId,
      daysAgo: 7,
      time: 38,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-14-0`,
      exerciseId,
      daysAgo: 14,
      time: 35,
      minute: 20,
    }),
    makeSet({
      id: `${prefix}-21-0`,
      exerciseId,
      daysAgo: 21,
      time: 30,
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

type DemoCommentSeed = {
  id: string;
  daysAgo: number;
  text: string;
  author?: DemoAuthor;
  hour?: number;
  minute?: number;
};

const COMMENTS_BY_EXERCISE: Record<string, DemoCommentSeed[]> = {
  "ex-hip-openers": [
    {
      id: "c-ho-1",
      daysAgo: 0,
      hour: 9,
      minute: 41,
      text: "Slow circles, not huge ones. Left hip still clicks if I rush the first two reps.",
    },
    {
      id: "c-ho-2",
      daysAgo: 7,
      author: JORDAN,
      hour: 18,
      minute: 12,
      text: "Cue I stole: imagine drawing a small oval with the knee, not swinging the whole leg.",
    },
  ],
  "ex-90-90-good-morning": [
    {
      id: "c-gm-1",
      daysAgo: 0,
      text: "Hinge from the hips, keep the chest long. I was rounding the low back to fake range.",
    },
    {
      id: "c-gm-2",
      daysAgo: 14,
      author: PRIYA,
      hour: 7,
      minute: 22,
      text: "If the front shin lifts, you lost the 90/90. Reset before you fold.",
    },
  ],
  "ex-90-90-seated-rotation": [
    {
      id: "c-sr-1",
      daysAgo: 0,
      hour: 10,
      minute: 18,
      text: "Rotate from the ribs, not the neck. Exhale as you turn — range opened up after the third breath.",
    },
    {
      id: "c-sr-2",
      daysAgo: 3,
      author: JORDAN,
      text: "Hand on the back knee helps me stay stacked instead of collapsing into the sit bone.",
    },
  ],
  "ex-world-s-greatest-stretch": [
    {
      id: "c-wgs-1",
      daysAgo: 0,
      text: "Front heel wanted to lift. Keep the back hip heavy and rotate from the ribcage, not the neck.",
    },
    {
      id: "c-wgs-2",
      daysAgo: 3,
      author: PRIYA,
      hour: 8,
      minute: 5,
      text: "Drop the back knee if the hip flexor cramps. Depth is optional; square hips are not.",
    },
    {
      id: "c-wgs-3",
      daysAgo: 14,
      author: JORDAN,
      hour: 19,
      minute: 40,
      text: "Reach the top arm like you are putting something on a high shelf. That cue fixed my shrug.",
    },
  ],
  "ex-half-kneeling-twist": [
    {
      id: "c-hkt-1",
      daysAgo: 0,
      text: "Squeeze the back glute before you twist. Otherwise the pelvis spins with the ribs.",
    },
    {
      id: "c-hkt-2",
      daysAgo: 7,
      author: PRIYA,
      text: "Front foot feels more stable if I press the big toe down. Tiny change, way less wobble.",
    },
  ],
  "ex-half-kneeling-windmill": [
    {
      id: "c-hkw-1",
      daysAgo: 0,
      hour: 11,
      minute: 2,
      text: "Follow the top hand with your eyes. I was looking at the floor and losing the thoracic turn.",
    },
    {
      id: "c-hkw-2",
      daysAgo: 21,
      author: JORDAN,
      text: "If the bottom shoulder dumps, shorten the reach. Quality over touching the floor.",
    },
  ],
  "ex-spinal-waves": [
    {
      id: "c-sw-1",
      daysAgo: 0,
      text: "Move one vertebra at a time. I was dumping into lumbar flexion instead of sequencing the spine.",
    },
    {
      id: "c-sw-2",
      daysAgo: 7,
      author: PRIYA,
      hour: 16,
      minute: 8,
      text: "Start from the tailbone on the way up. Reverse that and it feels like a different drill.",
    },
  ],
  "ex-scorpion-kick": [
    {
      id: "c-sk-1",
      daysAgo: 0,
      text: "Keep the planted hip heavy. The kick is a hip opener, not a low-back twist.",
    },
    {
      id: "c-sk-2",
      daysAgo: 14,
      author: JORDAN,
      hour: 20,
      minute: 15,
      text: "Point the kicking toes and it loads the glute more. Felt it immediately.",
    },
  ],
  "ex-pigeon-stretch": [
    {
      id: "c-pg-1",
      daysAgo: 0,
      text: "Square the hips before folding. Right side still tighter — stay taller if the knee complains.",
    },
    {
      id: "c-pg-2",
      daysAgo: 3,
      author: PRIYA,
      text: "Prop the hip with a block on the tight side. Folding without that just yanks the knee.",
    },
    {
      id: "c-pg-3",
      daysAgo: 21,
      author: JORDAN,
      hour: 6,
      minute: 50,
      text: "Breathe into the back of the hip for four counts. Hold got easier after that.",
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
      daysAgo: 7,
      author: PRIYA,
      hour: 9,
      minute: 30,
      text: "Could not get the opposite leg straight last week. Closer today.",
    },
    {
      id: "c-cs-3",
      daysAgo: 21,
      author: JORDAN,
      text: "Hold a light kettlebell as a counterweight if you keep falling backward.",
    },
  ],
  "ex-pancake-thoracic-spine-rotation": [
    {
      id: "c-pt-1",
      daysAgo: 0,
      text: "Sit tall first, then rotate. If the hamstrings yank you forward, bend the knees a little.",
    },
    {
      id: "c-pt-2",
      daysAgo: 14,
      author: PRIYA,
      text: "Reach the back of the hand toward the ceiling, not just the fingers. More upper-back.",
    },
  ],
  "ex-pancake-shoulder-stretch": [
    {
      id: "c-pss-1",
      daysAgo: 0,
      hour: 10,
      minute: 44,
      text: "Walk the hands forward until the armpits feel the stretch. Hips stay heavy on the floor.",
    },
    {
      id: "c-pss-2",
      daysAgo: 7,
      author: JORDAN,
      text: "If the low back rounds, scoot the sit bones back. This is a shoulder drill, not a pancake PR.",
    },
  ],
  "ex-natural-leg-extension": [
    {
      id: "c-nle-1",
      daysAgo: 0,
      text: "Control the lower. Quads shake around rep 8 — that is the set, not flopping back up.",
    },
    {
      id: "c-nle-2",
      daysAgo: 14,
      author: PRIYA,
      hour: 12,
      minute: 11,
      text: "Pad under the ankles if the floor bites. Range felt cleaner after that.",
    },
  ],
  "ex-low-lunge-lift-off": [
    {
      id: "c-lll-1",
      daysAgo: 0,
      text: "Tuck the pelvis before you lift. Otherwise it is just a backbend in disguise.",
    },
    {
      id: "c-lll-2",
      daysAgo: 3,
      author: JORDAN,
      text: "Hands on the front thigh help me stay stacked. Floor versions were too easy to cheat.",
    },
  ],
  "ex-puppy-dog-stretch": [
    {
      id: "c-pd-1",
      daysAgo: 0,
      text: "Walk the hands farther, keep hips over knees. Chest was collapsing toward the floor.",
    },
    {
      id: "c-pd-2",
      daysAgo: 7,
      author: PRIYA,
      hour: 17,
      minute: 3,
      text: "Think armpits toward the mat, not forehead. Melts the lats more.",
    },
  ],
  "ex-quadruped-thoracic-spine-rotation": [
    {
      id: "c-qts-1",
      daysAgo: 0,
      text: "Hand behind the head, elbow to the ceiling. I was rotating the whole torso instead of the upper back.",
    },
    {
      id: "c-qts-2",
      daysAgo: 14,
      author: JORDAN,
      text: "Brace the opposite hand into the floor so the hips stay quiet.",
    },
  ],
  "ex-bridge": [
    {
      id: "c-br-1",
      daysAgo: 0,
      hour: 11,
      minute: 20,
      text: "Press through the hands and lift the chest. Shoulders were dumping toward the ears.",
    },
    {
      id: "c-br-2",
      daysAgo: 21,
      author: PRIYA,
      text: "Feet a little closer to the hips made the hold feel like glutes, not low back.",
    },
  ],
  "ex-plow-pose": [
    {
      id: "c-pp-1",
      daysAgo: 0,
      text: "Do not force the toes to the floor. Support the back and keep the neck unloaded.",
    },
    {
      id: "c-pp-2",
      daysAgo: 7,
      author: JORDAN,
      hour: 8,
      minute: 55,
      text: "Bent knees still count. Straight legs were yanking my cervical spine.",
    },
  ],
  "ex-supine-spinal-twist": [
    {
      id: "c-sst-1",
      daysAgo: 0,
      text: "Both shoulders stay on the floor. If the top one lifts, back off the knee.",
    },
    {
      id: "c-sst-2",
      daysAgo: 3,
      author: PRIYA,
      text: "Look away from the knees. Neck unwind plus hip unwind at the same time.",
    },
    {
      id: "c-sst-3",
      daysAgo: 14,
      author: JORDAN,
      hour: 21,
      minute: 6,
      text: "Right side still needs a pillow under the knee. Left side is already on the floor.",
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
