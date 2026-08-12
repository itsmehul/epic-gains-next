"use client";

import {
  IconAlertTriangle,
  IconCheck,
  IconSearch,
} from "@tabler/icons-react";
import {
  createContext,
  useContext,
  useDeferredValue,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerBody,
  FamilyDrawerClose,
  FamilyDrawerContent,
  FamilyDrawerFooter,
  FamilyDrawerHeader,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerSecondaryButton,
  FamilyDrawerTrigger,
  useFamilyDrawer,
} from "@/components/ui/family-drawer";
import { Input } from "@/components/ui/input";
import {
  useExercises,
  useMergeExercise,
  useMergeExerciseImpact,
} from "@/features/workouts/hooks";
import type { SimilarExerciseCandidate } from "@/features/workouts/types";

function CandidateButton({
  candidate,
  onSelect,
}: {
  candidate: SimilarExerciseCandidate;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-vaul-no-drag=""
      onClick={onSelect}
      className="flex w-full items-start justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-left transition-colors hover:bg-muted"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{candidate.name}</span>
        {candidate.matchedAlias ? (
          <span className="text-muted-foreground block truncate text-xs">
            matched “{candidate.matchedAlias}”
          </span>
        ) : null}
      </span>
      <IconCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
    </button>
  );
}

type ResolveDrawerContextValue = {
  workoutId: string;
  exerciseId: string;
  pendingTargetId: string | null;
  setPendingTargetId: (id: string | null) => void;
  onResolved: (targetExerciseId: string) => void;
  setOpen: (open: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
};

const ResolveDrawerContext = createContext<ResolveDrawerContextValue | null>(
  null,
);

function useResolveDrawer() {
  const ctx = useContext(ResolveDrawerContext);
  if (!ctx) {
    throw new Error("Resolve drawer context missing");
  }
  return ctx;
}

function SearchView() {
  const { setView } = useFamilyDrawer();
  const ctx = useResolveDrawer();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q.trim());
  const search = useExercises({
    q: deferredQ || undefined,
    excludeId: ctx.exerciseId,
  });
  const items = (search.data?.items ?? []) as SimilarExerciseCandidate[];

  return (
    <>
      <FamilyDrawerHeader icon={<IconSearch />} title="Find existing exercise" />
      <FamilyDrawerBody className="space-y-3 pt-2">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search your exercises…"
          autoFocus
          data-vaul-no-drag=""
        />
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <CandidateButton
                candidate={item}
                onSelect={() => {
                  ctx.setPendingTargetId(item.id);
                  ctx.setError(null);
                  setView("confirm");
                }}
              />
            </li>
          ))}
        </ul>
        {search.isLoading ? (
          <p className="text-muted-foreground text-xs">Searching…</p>
        ) : null}
        {!search.isLoading && items.length === 0 ? (
          <p className="text-muted-foreground text-xs">No matching exercises.</p>
        ) : null}
      </FamilyDrawerBody>
    </>
  );
}

function ConfirmView() {
  const { setView } = useFamilyDrawer();
  const ctx = useResolveDrawer();
  const merge = useMergeExercise();
  const impact = useMergeExerciseImpact(
    ctx.exerciseId,
    ctx.pendingTargetId,
    ctx.workoutId,
  );

  async function confirm() {
    if (!ctx.pendingTargetId) return;
    ctx.setError(null);
    try {
      const result = await merge.mutateAsync({
        sourceExerciseId: ctx.exerciseId,
        targetExerciseId: ctx.pendingTargetId,
        workoutId: ctx.workoutId,
      });
      ctx.setOpen(false);
      ctx.setPendingTargetId(null);
      ctx.onResolved(result.targetExerciseId);
    } catch (err) {
      ctx.setError(err instanceof Error ? err.message : "Failed to resolve");
    }
  }

  return (
    <>
      <FamilyDrawerHeader
        icon={<IconAlertTriangle />}
        title="Link to existing exercise"
      />
      <FamilyDrawerBody className="space-y-3 pt-2">
        <p className="text-muted-foreground text-sm">
          Merges all logs for this exercise into the target. This workout keeps
          its local name and video.
        </p>
        {impact.isLoading ? (
          <p className="text-muted-foreground text-xs">Checking impact…</p>
        ) : null}
        {impact.data ? (
          <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
            <p>
              <span className="font-medium">{impact.data.setCount}</span>{" "}
              {impact.data.setCount === 1 ? "set" : "sets"} across{" "}
              <span className="font-medium">{impact.data.workoutCount}</span>{" "}
              {impact.data.workoutCount === 1 ? "workout" : "workouts"} will
              move to the target exercise.
            </p>
            {impact.data.willDeleteSource ? (
              <p className="text-muted-foreground mt-1 text-xs">
                The unused exercise record will be removed.
              </p>
            ) : null}
          </div>
        ) : null}
        {ctx.error ? (
          <p className="text-destructive text-xs" role="alert">
            {ctx.error}
          </p>
        ) : null}
      </FamilyDrawerBody>
      <FamilyDrawerFooter>
        <FamilyDrawerSecondaryButton
          className="bg-muted text-foreground"
          disabled={merge.isPending}
          onClick={() => {
            ctx.setPendingTargetId(null);
            setView("default");
          }}
        >
          Back
        </FamilyDrawerSecondaryButton>
        <FamilyDrawerSecondaryButton
          className="bg-primary text-primary-foreground"
          disabled={merge.isPending || !ctx.pendingTargetId}
          onClick={() => {
            void confirm();
          }}
        >
          {merge.isPending ? "Linking…" : "Confirm link"}
        </FamilyDrawerSecondaryButton>
      </FamilyDrawerFooter>
    </>
  );
}

type ExerciseResolveCardProps = {
  workoutId: string;
  exerciseId: string;
  candidates: SimilarExerciseCandidate[];
  onResolved: (targetExerciseId: string) => void;
};

export function ExerciseResolveCard({
  workoutId,
  exerciseId,
  candidates,
  onResolved,
}: ExerciseResolveCardProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("default");
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctxValue = useMemo(
    () => ({
      workoutId,
      exerciseId,
      pendingTargetId,
      setPendingTargetId,
      onResolved,
      setOpen,
      error,
      setError,
    }),
    [workoutId, exerciseId, pendingTargetId, onResolved, error],
  );

  function openConfirm(targetId: string) {
    setPendingTargetId(targetId);
    setError(null);
    setView("confirm");
    setOpen(true);
  }

  return (
    <ResolveDrawerContext.Provider value={ctxValue}>
      <FamilyDrawerRoot
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPendingTargetId(null);
            setError(null);
            setView("default");
          }
        }}
        view={view}
        defaultView="default"
        onViewChange={setView}
        views={{
          default: SearchView,
          confirm: ConfirmView,
        }}
      >
        <div className="space-y-3">
          {candidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Similar exercises
              </p>
              <ul className="space-y-1.5">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => openConfirm(candidate.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {candidate.name}
                        </span>
                        {candidate.matchedAlias ? (
                          <span className="text-muted-foreground block truncate text-xs">
                            via “{candidate.matchedAlias}”
                          </span>
                        ) : null}
                      </span>
                      <span className="text-primary shrink-0 text-xs font-medium">
                        Link
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <FamilyDrawerTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2 text-xs"
              onClick={() => {
                setPendingTargetId(null);
                setView("default");
              }}
            >
              <IconSearch data-icon="inline-start" />
              Find existing exercise
            </Button>
          </FamilyDrawerTrigger>
        </div>

        <FamilyDrawerPortal>
          <FamilyDrawerOverlay />
          <FamilyDrawerContent>
            <FamilyDrawerClose />
            <FamilyDrawerAnimatedWrapper>
              <FamilyDrawerAnimatedContent />
            </FamilyDrawerAnimatedWrapper>
          </FamilyDrawerContent>
        </FamilyDrawerPortal>
      </FamilyDrawerRoot>
    </ResolveDrawerContext.Provider>
  );
}
