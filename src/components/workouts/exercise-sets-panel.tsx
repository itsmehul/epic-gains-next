"use client";

import {
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import useMeasure from "react-use-measure";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExerciseResolveCard } from "@/components/workouts/exercise-resolve-card";
import {
  collapseGridClass,
  IconChevronDown as SetRowChevronDown,
  SetRowCard,
  springSnappy as setRowSpringSnappy,
  type SetRowPhase,
} from "@/components/workouts/set-row-card";
import type {
  MetricProfile,
  TargetSet,
} from "@/db/schema/workout-schema";
import {
  useCreateSet,
  useDeleteSet,
  useSimilarExercises,
  useWorkoutExercise,
} from "@/features/workouts/hooks";
import {
  fieldsForMetricProfile,
  type MetricProfileFields,
  type SetFieldKey,
} from "@/features/workouts/metric-profile";
import {
  dayKey,
  formatDayHeading,
  groupSetsByDay,
  localDateString,
} from "@/features/workouts/set-day";
import type { Set as WorkoutSet } from "@/features/workouts/types";
import { cn } from "@/shared/utils";

type FieldKey = SetFieldKey;

type RowValues = Record<FieldKey, string>;

type DraftRow = {
  id: string;
  source: "target" | "custom";
  targetIndex?: number;
  values: RowValues;
  shouldFocus?: boolean;
};

const sizeEase = [0.22, 1, 0.36, 1] as const;
const sizeTransition = { duration: 0.28, ease: sizeEase };
const FOCUS_AFTER_MS = 280;

type SizeTransition = typeof sizeTransition | { duration: number };

function SwapSize({
  swapKey,
  children,
  transition,
}: {
  swapKey: string;
  children: React.ReactNode;
  transition: SizeTransition;
}) {
  const [ref, bounds] = useMeasure();
  const lastHeightRef = useRef(0);
  const originHeightRef = useRef(0);
  const [state, setState] = useState({ key: swapKey, locked: false });

  if (swapKey !== state.key) {
    originHeightRef.current = lastHeightRef.current;
    setState({ key: swapKey, locked: true });
  }

  useEffect(() => {
    if (!state.locked && bounds.height > 0) {
      lastHeightRef.current = bounds.height;
    }
  }, [bounds.height, state.locked]);

  useEffect(() => {
    if (!state.locked) return;
    const timeoutId = window.setTimeout(
      () => {
        setState((prev) => {
          if (!prev.locked) return prev;
          return { ...prev, locked: false };
        });
      },
      Math.round(transition.duration * 1000) + 32,
    );
    return () => window.clearTimeout(timeoutId);
  }, [state.locked, state.key, transition.duration]);

  const height = state.locked
    ? bounds.height > 0
      ? bounds.height
      : originHeightRef.current || "auto"
    : "auto";

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={state.locked ? transition : { duration: 0 }}
      onAnimationComplete={() => {
        if (!state.locked) return;
        setState((prev) => (prev.locked ? { ...prev, locked: false } : prev));
        if (bounds.height > 0) lastHeightRef.current = bounds.height;
      }}
      className={state.locked ? "overflow-clip" : undefined}
    >
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}

function createDraftId() {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) return randomUUID();
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function valuesFromTarget(target: TargetSet): RowValues {
  return {
    reps: target.reps != null ? String(target.reps) : "",
    weight: target.weight != null ? String(target.weight) : "",
    time: target.time != null ? String(target.time) : "",
    distance: target.distance != null ? String(target.distance) : "",
  };
}

function draftFromTarget(target: TargetSet, targetIndex: number): DraftRow {
  return {
    id: createDraftId(),
    source: "target",
    targetIndex,
    values: valuesFromTarget(target),
    shouldFocus: false,
  };
}

function emptyValues(): RowValues {
  return { reps: "", weight: "", time: "", distance: "" };
}

function valuesFromSet(set: WorkoutSet): RowValues {
  return {
    reps: set.reps != null ? String(set.reps) : "",
    weight: set.weight != null ? String(set.weight) : "",
    time: set.time != null ? String(set.time) : "",
    distance: set.distance != null ? String(set.distance) : "",
  };
}

function valuesFromLast(
  set: WorkoutSet | undefined,
  draft: DraftRow | undefined,
): RowValues {
  if (draft) return { ...draft.values };
  if (set) return valuesFromSet(set);
  return emptyValues();
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInt(value: string): number | null {
  const n = parseOptionalNumber(value);
  if (n == null) return null;
  return Math.trunc(n);
}

function toPayload(values: RowValues) {
  return {
    reps: parseOptionalInt(values.reps),
    weight: parseOptionalNumber(values.weight),
    time: parseOptionalNumber(values.time),
    distance: parseOptionalNumber(values.distance),
  };
}

function hasInvalidNumber(values: RowValues) {
  return (Object.keys(values) as FieldKey[]).some((key) => {
    const raw = values[key].trim();
    if (!raw) return false;
    return key === "reps"
      ? parseOptionalInt(raw) == null
      : parseOptionalNumber(raw) == null;
  });
}

function hasLoggedValues(values: RowValues): boolean {
  return formatSetSummary(values) !== "Tap to log";
}

function offProfileValueKeys(
  values: RowValues,
  fields: MetricProfileFields,
): FieldKey[] {
  const profileKeys = new Set<FieldKey>([...fields.primary, ...fields.extra]);
  return (Object.keys(values) as FieldKey[]).filter(
    (key) => !profileKeys.has(key) && values[key].trim() !== "",
  );
}

function extraFieldsForValues(
  values: RowValues,
  fields: MetricProfileFields,
): FieldDef[] {
  const keys = [
    ...new Set([...fields.extra, ...offProfileValueKeys(values, fields)]),
  ];
  return keys.map((key) => FIELD_BY_KEY[key]);
}

function formatSetSummary(values: RowValues): string {
  const parts: string[] = [];
  if (values.weight.trim()) parts.push(`${values.weight.trim()} kg`);
  if (values.reps.trim()) parts.push(`${values.reps.trim()} reps`);
  if (values.time.trim()) parts.push(`${values.time.trim()}s`);
  if (values.distance.trim()) parts.push(`${values.distance.trim()} m`);
  if (parts.length === 0) return "Tap to log";
  if (values.weight.trim() && values.reps.trim()) {
    return `${values.weight.trim()} kg × ${values.reps.trim()}`;
  }
  return parts.join(" · ");
}

function setMatchesTarget(set: WorkoutSet, target: TargetSet): boolean {
  return (
    (set.reps ?? null) === (target.reps ?? null) &&
    (set.weight ?? null) === (target.weight ?? null) &&
    (set.time ?? null) === (target.time ?? null) &&
    (set.distance ?? null) === (target.distance ?? null)
  );
}

function inferConsumedTargetIndices(
  targets: TargetSet[],
  loggedSets: WorkoutSet[],
): Set<number> {
  const consumed = new Set<number>();
  const sorted = [...loggedSets].sort((a, b) => {
    const aTime = new Date(a.createdAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.createdAt ?? b.updatedAt).getTime();
    return aTime - bTime;
  });

  for (const logged of sorted) {
    for (let index = 0; index < targets.length; index += 1) {
      if (consumed.has(index)) continue;
      if (setMatchesTarget(logged, targets[index]!)) {
        consumed.add(index);
        break;
      }
    }
  }

  return consumed;
}

function syncTargetDrafts(
  prev: DraftRow[],
  targets: TargetSet[],
  consumedTargetIndices: Set<number>,
): DraftRow[] {
  const customDrafts = prev.filter((draft) => draft.source === "custom");
  const existingTargetDrafts = new Map(
    prev
      .filter(
        (draft) =>
          draft.source === "target" && draft.targetIndex != null,
      )
      .map((draft) => [draft.targetIndex!, draft]),
  );

  const nextTargetDrafts: DraftRow[] = [];
  for (let index = 0; index < targets.length; index += 1) {
    if (consumedTargetIndices.has(index)) continue;
    const existing = existingTargetDrafts.get(index);
    nextTargetDrafts.push(
      existing ?? draftFromTarget(targets[index]!, index),
    );
  }

  const next = [...nextTargetDrafts, ...customDrafts];
  if (
    next.length === prev.length &&
    next.every((row, index) => row === prev[index])
  ) {
    return prev;
  }
  return next;
}

function SetMetricInput({
  id,
  value,
  disabled,
  inputMode,
  step,
  ariaLabel,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  autoFocus,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  inputMode: "numeric" | "decimal";
  step: string | number;
  ariaLabel: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timeoutId = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.select();
    }, FOCUS_AFTER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [autoFocus]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="number"
      inputMode={inputMode}
      min={0}
      step={step}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => {
        onFocus?.();
        event.currentTarget.select();
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-transparent bg-muted/80 px-2 text-center text-base tabular-nums outline-none transition-[color,box-shadow,background-color]",
        "placeholder:text-muted-foreground/45",
        "focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:opacity-50",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      )}
      placeholder="—"
    />
  );
}

type FieldDef = {
  key: FieldKey;
  label: string;
  unit: string;
  inputMode: "numeric" | "decimal";
  step: string | number;
};

const ALL_FIELDS: FieldDef[] = [
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    inputMode: "decimal",
    step: "0.5",
  },
  {
    key: "reps",
    label: "Reps",
    unit: "reps",
    inputMode: "numeric",
    step: 1,
  },
  {
    key: "time",
    label: "Time",
    unit: "s",
    inputMode: "decimal",
    step: "0.1",
  },
  {
    key: "distance",
    label: "Distance",
    unit: "m",
    inputMode: "decimal",
    step: "0.1",
  },
];

const FIELD_BY_KEY = Object.fromEntries(
  ALL_FIELDS.map((field) => [field.key, field]),
) as Record<FieldKey, FieldDef>;

type ExerciseSetsPanelProps = {
  workoutId: string;
  exerciseId: string;
  workoutExerciseId: string;
  metricProfile?: MetricProfile | null;
  targetSets?: TargetSet[] | null;
  sets: WorkoutSet[];
  setsReady?: boolean;
  readOnly?: boolean;
  canResolve?: boolean;
  onExerciseResolved?: (workoutExerciseId: string) => void;
};

export function ExerciseSetsPanel({
  workoutId,
  exerciseId,
  workoutExerciseId,
  metricProfile,
  targetSets,
  sets,
  setsReady = true,
  readOnly = false,
  canResolve = !readOnly,
  onExerciseResolved,
}: ExerciseSetsPanelProps) {
  const createSet = useCreateSet();
  const deleteSet = useDeleteSet();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : sizeTransition;
  const today = localDateString();
  const showResolve = sets.length === 0;
  const similarQuery = useSimilarExercises(exerciseId, {
    workoutId,
    workoutExerciseId,
    enabled: showResolve && canResolve,
  });

  const workoutExerciseQuery = useWorkoutExercise(workoutExerciseId, {
    enabled: canResolve,
  });

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [rowKeyBySetId, setRowKeyBySetId] = useState<Record<string, string>>(
    {},
  );
  const [promotedByRowKey, setPromotedByRowKey] = useState<
    Record<string, { setId: string; values: RowValues }>
  >({});
  const [enteringRowKeys, setEnteringRowKeys] = useState(
    () => new Set<string>(),
  );
  const [approvingRowKeys, setApprovingRowKeys] = useState(
    () => new Set<string>(),
  );
  const [removedIds, setRemovedIds] = useState(() => new Set<string>());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const baseId = useId().replace(/:/g, "");
  const profileFields = fieldsForMetricProfile(metricProfile);
  const primaryFields = profileFields.primary.map((key) => FIELD_BY_KEY[key]);
  const extraFields = profileFields.extra.map((key) => FIELD_BY_KEY[key]);
  const firstPrimaryKey = primaryFields[0]?.key;

  const visibleSets = useMemo(
    () => sets.filter((set) => !removedIds.has(set.id)),
    [sets, removedIds],
  );
  const resolvedTargets =
    workoutExerciseQuery.data?.metaData?.targets ?? targetSets ?? null;
  const todayLoggedSets = useMemo(
    () => visibleSets.filter((set) => dayKey(set.updatedAt) === today),
    [visibleSets, today],
  );
  const todayLoggedRowKeys = useMemo(
    () =>
      todayLoggedSets
        .map((set) => rowKeyBySetId[set.id] ?? set.id)
        .sort()
        .join(","),
    [todayLoggedSets, rowKeyBySetId],
  );
  const draftRowKeys = useMemo(
    () => drafts.map((draft) => draft.id).join(","),
    [drafts],
  );
  const promotedRowKeys = useMemo(
    () => Object.keys(promotedByRowKey).sort().join(","),
    [promotedByRowKey],
  );
  const approvingRowKeyStr = useMemo(
    () => [...approvingRowKeys].sort().join(","),
    [approvingRowKeys],
  );
  const rowKeyBySetIdKey = useMemo(
    () =>
      Object.entries(rowKeyBySetId)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([setId, rowKey]) => `${setId}:${rowKey}`)
        .join("|"),
    [rowKeyBySetId],
  );
  const targetDraftSyncKey = useMemo(() => {
    if (!resolvedTargets?.length) return "";
    const consumed = inferConsumedTargetIndices(resolvedTargets, todayLoggedSets);
    return `${todayLoggedSets.length}:${resolvedTargets.length}:${[...consumed].sort((a, b) => a - b).join(",")}`;
  }, [resolvedTargets, todayLoggedSets]);

  useEffect(() => {
    if (!setsReady) return;

    setDrafts((prev) => {
      if (todayLoggedSets.length > 0) {
        const customDrafts = prev.filter((draft) => draft.source === "custom");
        if (
          customDrafts.length === prev.length &&
          customDrafts.every((row, index) => row === prev[index])
        ) {
          return prev;
        }
        return customDrafts;
      }

      if (!resolvedTargets?.length) return prev;

      const consumedTargetIndices = inferConsumedTargetIndices(
        resolvedTargets,
        todayLoggedSets,
      );
      return syncTargetDrafts(prev, resolvedTargets, consumedTargetIndices);
    });
  }, [setsReady, targetDraftSyncKey]);

  useEffect(() => {
    const ids = new Set(sets.map((set) => set.id));
    setRemovedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [sets]);

  useEffect(() => {
    setPromotedByRowKey((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [rowKey, promoted] of Object.entries(prev)) {
        const logged = todayLoggedSets.find((set) => set.id === promoted.setId);
        if (!logged) continue;
        const stableKey = rowKeyBySetId[promoted.setId] ?? promoted.setId;
        if (stableKey !== rowKey) continue;
        delete next[rowKey];
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [todayLoggedRowKeys, rowKeyBySetIdKey, rowKeyBySetId, todayLoggedSets]);

  useEffect(() => {
    setRowOrder((prev) => {
      const activeKeys = new Set<string>();

      for (const set of todayLoggedSets) {
        activeKeys.add(rowKeyBySetId[set.id] ?? set.id);
      }
      for (const draft of drafts) {
        activeKeys.add(draft.id);
      }
      for (const rowKey of Object.keys(promotedByRowKey)) {
        activeKeys.add(rowKey);
      }

      const next: string[] = [];
      for (const rowKey of prev) {
        if (activeKeys.has(rowKey)) {
          next.push(rowKey);
          activeKeys.delete(rowKey);
        }
      }
      for (const rowKey of activeKeys) {
        next.push(rowKey);
      }
      return next.length === prev.length &&
        next.every((key, index) => key === prev[index])
        ? prev
        : next;
    });
  }, [draftRowKeys, promotedRowKeys, rowKeyBySetIdKey, todayLoggedRowKeys]);

  const dayGroups = groupSetsByDay(visibleSets);
  const todaySets =
    dayGroups.find((group) => group.day === today)?.sets ?? [];

  type TodayRowEntry = {
    rowKey: string;
    phase: SetRowPhase;
    setId?: string;
    values: RowValues;
    draftSource?: DraftRow["source"];
    shouldFocus: boolean;
    index: number;
  };

  function resolveTodayRow(rowKey: string, index: number): TodayRowEntry | null {
    const promoted = promotedByRowKey[rowKey];
    if (promoted) {
      return {
        rowKey,
        phase: "logged",
        setId: promoted.setId,
        values: promoted.values,
        shouldFocus: false,
        index,
      };
    }

    const draft = drafts.find((row) => row.id === rowKey);
    if (draft) {
      return {
        rowKey,
        phase: approvingRowKeys.has(draft.id)
          ? ("approving" as const)
          : ("draft" as const),
        values: draft.values,
        draftSource: draft.source,
        shouldFocus: Boolean(draft.shouldFocus),
        index,
      };
    }

    const logged = todaySets.find(
      (set) => (rowKeyBySetId[set.id] ?? set.id) === rowKey,
    );
    if (logged) {
      return {
        rowKey,
        phase: "logged",
        setId: logged.id,
        values: valuesFromSet(logged),
        shouldFocus: false,
        index,
      };
    }

    return null;
  }

  const todayRowKeys = useMemo(() => {
    const keys: string[] = [];
    const seen = new Set<string>();
    const addKey = (key: string) => {
      if (seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    };

    for (const key of rowOrder) addKey(key);
    for (const key of Object.keys(promotedByRowKey)) addKey(key);
    for (const key of approvingRowKeys) addKey(key);
    for (const draft of drafts) addKey(draft.id);
    for (const set of todaySets) {
      addKey(rowKeyBySetId[set.id] ?? set.id);
    }

    return keys;
  }, [
    approvingRowKeyStr,
    draftRowKeys,
    promotedRowKeys,
    rowKeyBySetIdKey,
    rowOrder,
    todayLoggedRowKeys,
    approvingRowKeys,
    drafts,
    promotedByRowKey,
    rowKeyBySetId,
    todaySets,
  ]);

  const todayRows = todayRowKeys
    .map((rowKey, index) => resolveTodayRow(rowKey, index))
    .filter((row): row is TodayRowEntry => row != null);

  const hasPendingTodayRows =
    todayRows.length > 0 ||
    Object.keys(promotedByRowKey).length > 0 ||
    approvingRowKeys.size > 0;
  const showEmpty =
    visibleSets.length === 0 &&
    drafts.length === 0 &&
    !hasPendingTodayRows;
  const isContentLoading =
    showEmpty &&
    (!setsReady ||
      (!readOnly &&
        workoutExerciseQuery.isPending &&
        drafts.length === 0 &&
        !targetSets?.length));
  const hasExtraValues =
    extraFields.some((field) =>
      visibleSets.some((set) => set[field.key] != null),
    ) ||
    drafts.some((draft) =>
      extraFields.some((field) => draft.values[field.key].trim() !== ""),
    );
  const extrasOpen = extraFields.length > 0 && (showExtras || hasExtraValues);

  function handleAddSet() {
    setError(null);
    const lastLogged = todaySets.at(-1);
    const lastDraft = drafts.at(-1);
    const id = createDraftId();
    setDrafts((prev) => [
      ...prev,
      {
        id,
        source: "custom",
        values: valuesFromLast(lastLogged, lastDraft),
        shouldFocus: true,
      },
    ]);
    setEnteringRowKeys((prev) => new Set(prev).add(id));
    setExpandedId(id);
  }

  useEffect(() => {
    if (enteringRowKeys.size === 0) return;
    const timeoutId = window.setTimeout(() => {
      setEnteringRowKeys(new Set());
    }, Math.round(transition.duration * 1000) + 48);
    return () => window.clearTimeout(timeoutId);
  }, [enteringRowKeys, transition.duration]);

  async function approveDraft(draftId: string) {
    const draft = drafts.find((row) => row.id === draftId);
    if (!draft) return;

    if (!hasLoggedValues(draft.values)) {
      setError("Enter a value before approving the set");
      return;
    }
    if (hasInvalidNumber(draft.values)) {
      setError("Values must be valid numbers");
      return;
    }

    setBusyId(draftId);
    setError(null);
    setExpandedId((prev) => (prev === draftId ? null : prev));
    setApprovingRowKeys((prev) => new Set(prev).add(draftId));
    try {
      const created = await createSet.mutateAsync({
        workoutId,
        exerciseId,
        ...toPayload(draft.values),
      });
      const values = valuesFromSet(created);
      setRowKeyBySetId((prev) => ({ ...prev, [created.id]: draftId }));
      setPromotedByRowKey((prev) => ({
        ...prev,
        [draftId]: { setId: created.id, values },
      }));
      setDrafts((prev) => prev.filter((row) => row.id !== draftId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log set");
    } finally {
      setApprovingRowKeys((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
      setBusyId(null);
    }
  }

  async function handleDeleteLogged(setId: string) {
    setError(null);
    setBusyId(setId);
    try {
      await deleteSet.mutateAsync(setId);
      setRemovedIds((prev) => new Set(prev).add(setId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete set");
    } finally {
      setBusyId(null);
    }
  }

  function updateDraftValue(draftId: string, key: FieldKey, value: string) {
    setDrafts((prev) =>
      prev.map((row) =>
        row.id === draftId
          ? { ...row, values: { ...row.values, [key]: value } }
          : row,
      ),
    );
  }

  function removeDraft(draftId: string) {
    setDrafts((prev) => prev.filter((row) => row.id !== draftId));
    setExpandedId((prev) => (prev === draftId ? null : prev));
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function renderDraftEditor({
    rowId,
    values,
    busy,
    index,
    autoFocusWeight,
  }: {
    rowId: string;
    values: RowValues;
    busy: boolean;
    index: number;
    autoFocusWeight?: boolean;
  }) {
    const rowExtraFields = extraFieldsForValues(values, profileFields);
    const rowExtrasOpen =
      rowExtraFields.length > 0 &&
      (showExtras ||
        hasExtraValues ||
        offProfileValueKeys(values, profileFields).length > 0);

    return (
      <div className="space-y-3 px-3 pb-2 pt-1">
        <div className="grid grid-cols-2 gap-2">
          {primaryFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <label
                htmlFor={`${baseId}-${rowId}-${field.key}`}
                className="text-muted-foreground flex items-baseline justify-between px-0.5 text-[11px] font-medium tracking-wide uppercase"
              >
                <span>{field.label}</span>
                <span className="normal-case tracking-normal opacity-70">
                  {field.unit}
                </span>
              </label>
              <SetMetricInput
                id={`${baseId}-${rowId}-${field.key}`}
                value={values[field.key]}
                disabled={busy}
                inputMode={field.inputMode}
                step={field.step}
                ariaLabel={field.label}
                autoFocus={autoFocusWeight && field.key === firstPrimaryKey}
                onChange={(value) => updateDraftValue(rowId, field.key, value)}
                onBlur={() => {}}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void approveDraft(rowId);
                }}
              />
            </div>
          ))}
        </div>

        {rowExtraFields.length > 0 ? (
          <div
            className={cn(
              collapseGridClass,
              rowExtrasOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-clip">
              <div className="grid grid-cols-2 gap-2 pb-0.5">
                {rowExtraFields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label
                      htmlFor={`${baseId}-${rowId}-${field.key}`}
                      className="text-muted-foreground flex items-baseline justify-between px-0.5 text-[11px] font-medium tracking-wide uppercase"
                    >
                      <span>{field.label}</span>
                      <span className="normal-case tracking-normal opacity-70">
                        {field.unit}
                      </span>
                    </label>
                    <SetMetricInput
                      id={`${baseId}-${rowId}-${field.key}`}
                      value={values[field.key]}
                      disabled={busy}
                      inputMode={field.inputMode}
                      step={field.step}
                      ariaLabel={field.label}
                      onChange={(value) =>
                        updateDraftValue(rowId, field.key, value)
                      }
                      onBlur={() => {}}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void approveDraft(rowId);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {rowExtraFields.length > 0 &&
          !hasExtraValues &&
          offProfileValueKeys(values, profileFields).length === 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2 text-xs"
              onClick={() => setShowExtras((prev) => !prev)}
            >
              <motion.span
                animate={{ rotate: rowExtrasOpen ? 180 : 0 }}
                transition={setRowSpringSnappy}
                className="inline-flex"
              >
                <SetRowChevronDown className="size-3.5" />
              </motion.span>
              {rowExtrasOpen
                ? "Hide extras"
                : rowExtraFields.map((f) => f.label).join(" / ")}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={busy}
              onClick={() => {
                void approveDraft(rowId);
              }}
            >
              {busy ? (
                <IconLoader2 className="animate-spin" data-icon="inline-start" />
              ) : null}
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Discard draft set ${index + 1}`}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              onClick={() => removeDraft(rowId)}
            >
              <IconTrash className="size-4" />
              <span className="sr-only md:not-sr-only md:ml-1">Discard</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderHistoryRows(
    rows: { rowKey: string; values: RowValues }[],
  ) {
    return (
      <ul className="text-muted-foreground divide-border/50 divide-y overflow-clip rounded-xl bg-muted/10">
        {rows.map((row) => {
          const summary = formatSetSummary(row.values);
          return (
            <li
              key={row.rowKey}
              className="flex items-center gap-2 px-3 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm tabular-nums">
                {summary === "Tap to log" ? "—" : summary}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  function renderSetRows(rows: TodayRowEntry[]) {
    return (
      <LayoutGroup id={`${baseId}-today-rows`}>
        <ul className="divide-border/60 divide-y overflow-clip rounded-xl bg-muted/20">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((row) => {
              const busy =
                busyId === row.rowKey ||
                (row.setId != null && busyId === row.setId);
              const expanded = expandedId === row.rowKey;
              const summary = formatSetSummary(row.values);
              const subtitle =
                row.phase === "logged"
                  ? "Logged"
                  : row.draftSource === "target"
                    ? "Draft · save to log"
                    : "Draft · custom";

              return (
                <SetRowCard
                  key={row.rowKey}
                  rowKey={row.rowKey}
                  phase={row.phase}
                  summary={summary}
                  subtitle={subtitle}
                  expanded={expanded}
                  busy={busy}
                  isEntering={enteringRowKeys.has(row.rowKey)}
                  transition={transition}
                  onToggleExpanded={() => toggleExpanded(row.rowKey)}
                  onApprove={() => {
                    void approveDraft(row.rowKey);
                  }}
                  onRemove={() => {
                    if (row.phase === "logged" && row.setId) {
                      void handleDeleteLogged(row.setId);
                      return;
                    }
                    if (row.phase === "draft") {
                      removeDraft(row.rowKey);
                    }
                  }}
                  editor={renderDraftEditor({
                    rowId: row.rowKey,
                    values: row.values,
                    busy,
                    index: row.index,
                    autoFocusWeight: row.shouldFocus,
                  })}
                />
              );
            })}
          </AnimatePresence>
        </ul>
      </LayoutGroup>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <SwapSize
        swapKey={isContentLoading ? "loading" : showEmpty ? "empty" : "list"}
        transition={transition}
      >
        {isContentLoading ? (
          <div
            aria-busy="true"
            aria-live="polite"
            className="text-muted-foreground flex items-center justify-center gap-2 py-12"
            role="status"
          >
            <Spinner className="size-5" />
            <span className="text-sm">Loading sets…</span>
          </div>
        ) : showEmpty ? (
          readOnly && !canResolve ? (
            <p className="text-muted-foreground px-1 py-8 text-center text-sm">
              No sets logged yet.
            </p>
          ) : (
            <Card size="sm">
              <CardHeader>
                <CardTitle>No sets yet</CardTitle>
                <CardDescription>
                  Add a set to start logging, or link this move to an existing
                  exercise to unify history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canResolve ? (
                  <ExerciseResolveCard
                    workoutId={workoutId}
                    exerciseId={exerciseId}
                    workoutExerciseId={workoutExerciseId}
                    candidates={similarQuery.data?.items ?? []}
                    onResolved={(id) => {
                      onExerciseResolved?.(id);
                    }}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className={canResolve ? "mt-3 mx-auto w-fit" : "mx-auto w-fit"}
                  onClick={handleAddSet}
                >
                  <IconPlus data-icon="inline-start" />
                  Add set
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h3 className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  {formatDayHeading(today)}
                </h3>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {todayRows.length} {todayRows.length === 1 ? "set" : "sets"}
                </span>
              </div>
              {hasPendingTodayRows ? (
                readOnly ? (
                  renderHistoryRows(todayRows)
                ) : (
                  renderSetRows(todayRows)
                )
              ) : (
                <p className="text-muted-foreground px-1 text-sm">
                  No sets logged today.
                </p>
              )}
              {readOnly ? null : (
                <Button
                  type="button"
                  variant="secondary"
                  className="mx-auto w-fit"
                  onClick={handleAddSet}
                >
                  <IconPlus data-icon="inline-start" />
                  Add set
                </Button>
              )}
            </section>
          </div>
        )}
      </SwapSize>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="text-destructive overflow-clip px-3 text-xs"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
