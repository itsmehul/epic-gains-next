"use client";

import { useState } from "react";
import { IconChartLine, IconListChecks, IconMessage2 } from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExerciseAnalyticsPanel } from "@/components/workouts/exercise-analytics-panel";
import { ExerciseCommentsPanel } from "@/components/workouts/exercise-comments-panel";
import { ExerciseSetsPanel } from "@/components/workouts/exercise-sets-panel";
import type { MetricProfile, TargetSet } from "@/db/schema/workout-schema";
import { useComments } from "@/features/comments/hooks";
import type { Comment } from "@/features/comments/types";
import type { Set } from "@/features/workouts/types";

const tabTriggerClassName =
  "gap-1.5 px-2 py-1 text-xs text-primary/55 hover:text-primary/75 data-active:text-primary data-active:after:bg-primary/55 [&_svg]:size-3.5 [&_.ms-icon]:size-3.5";

export function WorkoutExerciseTabs({
  workoutId,
  exerciseId,
  workoutExerciseId,
  metricProfile,
  targetSets,
  sets,
  setsReady,
  readOnly,
  canResolve,
  comments,
  onExerciseResolved,
}: {
  workoutId: string;
  exerciseId: string;
  workoutExerciseId: string;
  metricProfile?: MetricProfile | null;
  targetSets?: TargetSet[] | null;
  sets: Set[];
  setsReady?: boolean;
  readOnly?: boolean;
  canResolve?: boolean;
  comments?: Comment[];
  onExerciseResolved?: (id: string) => void;
}) {
  const [tab, setTab] = useState("sets");
  const commentsQuery = useComments({
    exerciseId,
    workoutId,
    enabled: comments == null,
  });
  const commentItems = comments ?? commentsQuery.data?.items ?? [];
  const commentCount = commentItems.length;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (typeof value === "string") setTab(value);
      }}
      className="gap-0"
    >
      <div className="px-4 md:px-0">
        <TabsList className="h-7 w-full gap-0 p-0" variant="line">
          <TabsTrigger value="sets" className={tabTriggerClassName}>
            <IconListChecks aria-hidden />
            Sets
          </TabsTrigger>
          <TabsTrigger value="comments" className={tabTriggerClassName}>
            <IconMessage2 aria-hidden />
            Comments
            {commentCount > 0 ? (
              <Badge
                variant="secondary"
                className="h-4 min-w-4 justify-center px-1.5 text-[10px] tabular-nums"
              >
                {commentCount}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analytics" className={tabTriggerClassName}>
            <IconChartLine aria-hidden />
            Analytics
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="mt-4">
        <div hidden={tab !== "sets"}>
          <ExerciseSetsPanel
            workoutId={workoutId}
            exerciseId={exerciseId}
            workoutExerciseId={workoutExerciseId}
            metricProfile={metricProfile}
            targetSets={targetSets}
            sets={sets}
            setsReady={setsReady}
            readOnly={readOnly}
            canResolve={canResolve}
            onExerciseResolved={onExerciseResolved}
          />
        </div>
        <div hidden={tab !== "comments"}>
          <ExerciseCommentsPanel
            exerciseId={exerciseId}
            workoutId={workoutId}
            items={comments}
            readOnly={readOnly}
          />
        </div>
        <div hidden={tab !== "analytics"}>
          <ExerciseAnalyticsPanel
            sets={sets}
            metricProfile={metricProfile}
          />
        </div>
      </div>
    </Tabs>
  );
}
