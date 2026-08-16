"use client";

import { IconChartLine, IconListChecks, IconMessage2 } from "@/components/ui/icons";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExerciseAnalyticsPanel } from "@/components/workouts/exercise-analytics-panel";
import { ExerciseCommentsPanel } from "@/components/workouts/exercise-comments-panel";
import { ExerciseSetsPanel } from "@/components/workouts/exercise-sets-panel";
import type { MetricProfile, TargetSet } from "@/db/schema/workout-schema";
import { useComments } from "@/features/comments/hooks";
import type { Comment } from "@/features/comments/types";
import type { Set } from "@/features/workouts/types";

const tabTriggerClassName =
  "h-7 gap-1.5 px-2.5 py-1 text-xs data-active:bg-surface-container-lowest data-active:shadow-xs dark:data-active:bg-surface-container-highest dark:data-active:shadow-none [&_svg]:size-3.5 [&_.ms-icon]:size-3.5";

const tabPanelClassName =
  "col-start-1 row-start-1 min-w-0 transition-[opacity,translate] duration-[var(--dur-medium)] ease-[var(--ease-standard)] data-starting-style:opacity-0 data-ending-style:opacity-0 motion-safe:data-starting-style:data-[activation-direction=left]:-translate-x-8 motion-safe:data-starting-style:data-[activation-direction=right]:translate-x-8 motion-safe:data-ending-style:data-[activation-direction=left]:translate-x-8 motion-safe:data-ending-style:data-[activation-direction=right]:-translate-x-8";

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
      className="gap-4"
    >
      <div className="px-4 md:px-0">
        <TabsList className="h-8 w-fit bg-surface-container">
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
      <div className="grid overflow-x-clip">
        <TabsContent keepMounted value="sets" className={tabPanelClassName}>
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
        </TabsContent>
        <TabsContent keepMounted value="comments" className={tabPanelClassName}>
          <ExerciseCommentsPanel
            exerciseId={exerciseId}
            workoutId={workoutId}
            items={comments}
            readOnly={readOnly}
          />
        </TabsContent>
        <TabsContent keepMounted value="analytics" className={tabPanelClassName}>
          <ExerciseAnalyticsPanel
            sets={sets}
            metricProfile={metricProfile}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
