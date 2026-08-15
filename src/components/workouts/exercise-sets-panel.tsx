"use client";

import {
  IconChevronDown,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import useMeasure from "react-use-measure";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExerciseResolveCard } from "@/components/workouts/exercise-resolve-card";
import type { MetricProfile } from "@/db/schema/workout-schema";
import {
  useCreateSet,
  useDeleteSet,
  useSimilarExercises,
  useUpdateSet,
} from "@/features/workouts/hooks";
import {
  fieldsForMetricProfile,
  type SetFieldKey,
} from "@/features/workouts/metric-profile";
import {
  formatDayHeading,
  groupSetsByDay,
  localDateString,
} from "@/features/workouts/set-day";
import type { Set } from "@/features/workouts/types";
import { cn } from "@/shared/utils";

type FieldKey = SetFieldKey;

type RowValues = Record<FieldKey, string>;

type DraftRow = {
  id: string;
  values: RowValues;
  shouldFocus?: boolean;
  committed?: Set;
};

const springSnappy = { type: "spring" as const, stiffness: 520, damping: 36 };
const sizeEase = [0.22, 1, 0.36, 1] as const;
const sizeTransition = { duration: 0.28, ease: sizeEase };
const FOCUS_AFTER_MS = 280;
const collapseGridClass =
  "grid transition-[grid-template-rows] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

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

function emptyValues(): RowValues {
  return { reps: "", weight: "", time: "", distance: "" };
}

function valuesFromSet(set: Set): RowValues {
  return {
    reps: set.reps != null ? String(set.reps) : "",
    weight: set.weight != null ? String(set.weight) : "",
    time: set.time != null ? String(set.time) : "",
    distance: set.distance != null ? String(set.distance) : "",
  };
}

function valuesFromLast(
  set: Set | undefined,
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
  sets: Set[];
  onExerciseResolved?: (workoutExerciseId: string) => void;
};

export function ExerciseSetsPanel({
  workoutId,
  exerciseId,
  workoutExerciseId,
  metricProfile,
  sets,
  onExerciseResolved,
}: ExerciseSetsPanelProps) {
  const createSet = useCreateSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : sizeTransition;
  const showResolve = sets.length === 0;
  const similarQuery = useSimilarExercises(exerciseId, {
    workoutId,
    workoutExerciseId,
    enabled: showResolve,
  });

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [savedValues, setSavedValues] = useState<Record<string, RowValues>>(
    () => Object.fromEntries(sets.map((set) => [set.id, valuesFromSet(set)])),
  );
  const savedValuesRef = useRef(savedValues);
  const [completedDraftIds, setCompletedDraftIds] = useState(
    () => new Set<string>(),
  );
  const [checkedAtById, setCheckedAtById] = useState<Record<string, number>>(
    {},
  );
  const [uncheckedIds, setUncheckedIds] = useState(() => new Set<string>());
  const [removedIds, setRemovedIds] = useState(() => new Set<string>());
  const [rowKeyBySetId, setRowKeyBySetId] = useState<Record<string, string>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const focusedFieldRef = useRef<string | null>(null);
  const baseId = useId().replace(/:/g, "");
  const profileFields = fieldsForMetricProfile(metricProfile);
  const primaryFields = profileFields.primary.map((key) => FIELD_BY_KEY[key]);
  const extraFields = profileFields.extra.map((key) => FIELD_BY_KEY[key]);
  const firstPrimaryKey = primaryFields[0]?.key;

  useEffect(() => {
    savedValuesRef.current = savedValues;
  }, [savedValues]);

  useEffect(() => {
    const ids = new Set(sets.map((set) => set.id));

    setSavedValues((prev) => {
      const next: Record<string, RowValues> = {};
      for (const set of sets) {
        const focusKeyPrefix = `${set.id}:`;
        const isFocused = focusedFieldRef.current?.startsWith(focusKeyPrefix);
        next[set.id] =
          isFocused && prev[set.id] ? prev[set.id] : valuesFromSet(set);
      }
      return next;
    });
    setUncheckedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      return next;
    });
    setDrafts((prev) => {
      const next = prev.filter(
        (draft) => !draft.committed || !ids.has(draft.committed.id),
      );
      return next.length === prev.length ? prev : next;
    });
    setRemovedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [sets]);

  const extraKeys = profileFields.extra;
  const today = localDateString();
  const liveDrafts = drafts.filter((draft) => !draft.committed);
  const visibleSets = [
    ...sets.filter((set) => !removedIds.has(set.id)),
    ...drafts.flatMap((draft) => {
      if (!draft.committed) return [];
      if (removedIds.has(draft.committed.id)) return [];
      if (sets.some((set) => set.id === draft.committed?.id)) return [];
      return [draft.committed];
    }),
  ];
  const dayGroups = groupSetsByDay(visibleSets);
  const todaySets =
    dayGroups.find((group) => group.day === today)?.sets ?? [];
  const pastGroups = dayGroups.filter((group) => group.day !== today);

  type SetRow = {
    kind: "saved" | "draft";
    rowId: string;
    setId: string;
    values: RowValues;
    createdAt: Date | string | undefined;
    index: number;
    shouldFocus: boolean;
    previous: RowValues | null;
  };

  function rowsForDay(day: string, daySets: Set[]): SetRow[] {
    const previousGroup = dayGroups.find((group) => group.day < day);
    const savedRows = daySets.map((set, index) => {
      const previousSet = previousGroup?.sets[index];
      return {
        kind: "saved" as const,
        rowId: rowKeyBySetId[set.id] ?? set.id,
        setId: set.id,
        values: savedValues[set.id] ?? valuesFromSet(set),
        createdAt: set.createdAt,
        index,
        shouldFocus: false as boolean,
        previous: previousSet ? valuesFromSet(previousSet) : null,
      };
    });
    if (day !== today) return savedRows;

    return [
      ...savedRows,
      ...liveDrafts.map((draft, draftIndex) => {
        const index = daySets.length + draftIndex;
        const previousSet = previousGroup?.sets[index];
        return {
          kind: "draft" as const,
          rowId: draft.id,
          setId: draft.id,
          values: draft.values,
          createdAt: undefined as Date | string | undefined,
          index,
          shouldFocus: Boolean(draft.shouldFocus),
          previous: previousSet ? valuesFromSet(previousSet) : null,
        };
      }),
    ];
  }

  const todayRows = rowsForDay(today, todaySets);
  const showEmpty = visibleSets.length === 0 && liveDrafts.length === 0;
  const hasExtraValues =
    extraKeys.some((key) =>
      visibleSets.some((set) => set[key] != null),
    ) ||
    liveDrafts.some((draft) =>
      extraKeys.some((key) => draft.values[key].trim() !== ""),
    );
  const extrasOpen = extraFields.length > 0 && (showExtras || hasExtraValues);

  function handleAddSet() {
    setError(null);
    const lastSaved = todaySets.at(-1);
    const lastDraft = liveDrafts.at(-1);
    const id = createDraftId();
    setDrafts((prev) => [
      ...prev,
      {
        id,
        values: valuesFromLast(lastSaved, lastDraft),
        shouldFocus: true,
      },
    ]);
    setExpandedId(id);
  }

  async function persistSaved(setId: string) {
    const values = savedValuesRef.current[setId];
    if (!values) return;

    if (hasInvalidNumber(values)) {
      setError("Values must be valid numbers");
      return;
    }

    const existing =
      sets.find((set) => set.id === setId) ??
      drafts.find((draft) => draft.committed?.id === setId)?.committed;
    if (!existing) return;

    const payload = toPayload(values);
    const unchanged =
      (existing.reps ?? null) === payload.reps &&
      (existing.weight ?? null) === payload.weight &&
      (existing.time ?? null) === payload.time &&
      (existing.distance ?? null) === payload.distance;
    if (unchanged) return;

    setBusyId(setId);
    setError(null);
    try {
      await updateSet.mutateAsync({ id: setId, ...payload });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update set");
    } finally {
      setBusyId(null);
    }
  }

  async function completeDraft(draftId: string) {
    const draft = drafts.find((row) => row.id === draftId);
    if (!draft || draft.committed) return;

    if (
      !profileFields.primary.some((key) => draft.values[key].trim() !== "")
    ) {
      setError("Enter a value before completing the set");
      return;
    }
    if (hasInvalidNumber(draft.values)) {
      setError("Values must be valid numbers");
      return;
    }

    setBusyId(draftId);
    setError(null);
    setCompletedDraftIds((prev) => new Set(prev).add(draftId));
    setCheckedAtById((prev) => ({ ...prev, [draftId]: Date.now() }));
    try {
      const created = await createSet.mutateAsync({
        workoutId,
        exerciseId,
        ...toPayload(draft.values),
      });
      setRowKeyBySetId((prev) => ({ ...prev, [created.id]: draftId }));
      setSavedValues((prev) => ({
        ...prev,
        [created.id]: valuesFromSet(created),
      }));
      setDrafts((prev) =>
        prev.map((row) =>
          row.id === draftId ? { ...row, committed: created } : row,
        ),
      );
      setCompletedDraftIds((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
      setExpandedId((prev) => (prev === draftId ? null : prev));
    } catch (err) {
      setCompletedDraftIds((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
      setCheckedAtById((prev) => {
        const next = { ...prev };
        delete next[draftId];
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to log set");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteSaved(setId: string, rowId: string) {
    setError(null);
    setBusyId(setId);
    try {
      await deleteSet.mutateAsync(setId);
      setRemovedIds((prev) => new Set(prev).add(setId));
      setExpandedId((prev) => (prev === rowId || prev === setId ? null : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete set");
    } finally {
      setBusyId(null);
    }
  }

  function updateSavedValue(setId: string, key: FieldKey, value: string) {
    setSavedValues((prev) => {
      const nextRow = { ...(prev[setId] ?? emptyValues()), [key]: value };
      const next = { ...prev, [setId]: nextRow };
      savedValuesRef.current = next;
      return next;
    });
    if (uncheckedIds.has(setId)) {
      setUncheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
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

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function renderEditor({
    rowId,
    setId,
    values,
    busy,
    isDraft,
    index,
    autoFocusWeight,
  }: {
    rowId: string;
    setId: string;
    values: RowValues;
    busy: boolean;
    isDraft: boolean;
    index: number;
    autoFocusWeight?: boolean;
  }) {
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
                autoFocus={
                  autoFocusWeight && field.key === firstPrimaryKey && isDraft
                }
                onFocus={() => {
                  focusedFieldRef.current = `${setId}:${field.key}`;
                }}
                onChange={(value) => {
                  focusedFieldRef.current = `${setId}:${field.key}`;
                  if (isDraft) updateDraftValue(rowId, field.key, value);
                  else updateSavedValue(setId, field.key, value);
                }}
                onBlur={() => {
                  focusedFieldRef.current = null;
                  if (!isDraft) void persistSaved(setId);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  if (isDraft) {
                    event.preventDefault();
                    void completeDraft(rowId);
                  } else {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
          ))}
        </div>

        {extraFields.length > 0 ? (
          <div
            className={cn(
              collapseGridClass,
              extrasOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-clip">
              <div className="grid grid-cols-2 gap-2 pb-0.5">
                {extraFields.map((field) => (
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
                      onFocus={() => {
                        focusedFieldRef.current = `${setId}:${field.key}`;
                      }}
                      onChange={(value) => {
                        focusedFieldRef.current = `${setId}:${field.key}`;
                        if (isDraft)
                          updateDraftValue(rowId, field.key, value);
                        else updateSavedValue(setId, field.key, value);
                      }}
                      onBlur={() => {
                        focusedFieldRef.current = null;
                        if (!isDraft) void persistSaved(setId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        if (isDraft) {
                          event.preventDefault();
                          void completeDraft(rowId);
                        } else {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {extraFields.length > 0 && !hasExtraValues ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2 text-xs"
              onClick={() => setShowExtras((prev) => !prev)}
            >
              <motion.span
                animate={{ rotate: extrasOpen ? 180 : 0 }}
                transition={springSnappy}
                className="inline-flex"
              >
                <IconChevronDown className="size-3.5" />
              </motion.span>
              {extrasOpen
                ? "Hide extras"
                : extraFields.map((f) => f.label).join(" / ")}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1">
            {isDraft ? (
              <Button
                type="button"
                size="sm"
                className="h-8"
                disabled={busy}
                onClick={() => {
                  void completeDraft(rowId);
                }}
              >
                {busy ? (
                  <IconLoader2
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : null}
                Save set
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Delete set ${index + 1}`}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              onClick={() => {
                if (isDraft) {
                  setDrafts((prev) => prev.filter((row) => row.id !== rowId));
                  setExpandedId((prev) => (prev === rowId ? null : prev));
                } else {
                  void handleDeleteSaved(setId, rowId);
                }
              }}
            >
              {busy && !isDraft ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconTrash className="size-4" />
              )}
              <span className="sr-only md:not-sr-only md:ml-1">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderHistoryRows(rows: SetRow[]) {
    return (
      <ul className="text-muted-foreground divide-border/50 divide-y overflow-clip rounded-xl bg-muted/10">
        {rows.map((row) => {
          const summary = formatSetSummary(row.values);
          return (
            <li
              key={row.rowId}
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

  function renderSetRows(rows: SetRow[]) {
    return (
      <ul className="divide-border/60 divide-y overflow-clip rounded-xl bg-muted/20">
        <AnimatePresence initial={false}>
          {rows.map((row) => {
            const isDraft = row.kind === "draft";
            const busy = busyId === row.setId || busyId === row.rowId;
            const expanded = expandedId === row.rowId;
            const completed = isDraft
              ? completedDraftIds.has(row.rowId)
              : !uncheckedIds.has(row.setId);
            const summary = formatSetSummary(row.values);
            const previousLabel = row.previous
              ? `Previous ${formatSetSummary(row.previous)}`
              : "Previous —";
            const subtitle =
              isDraft && !completed ? "Draft · not saved" : previousLabel;

            return (
              <motion.li
                key={row.rowId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={transition}
                className={cn(
                  "overflow-clip transition-colors duration-280",
                  completed && "bg-primary/8",
                  expanded && "bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-expanded={expanded}
                    onClick={() => toggleExpanded(row.rowId)}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium tabular-nums",
                          summary === "Tap to log" &&
                            "text-muted-foreground font-normal",
                        )}
                      >
                        {summary}
                      </span>
                      {subtitle ? (
                        <span className="text-muted-foreground text-[11px] tabular-nums">
                          {subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>

                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    transition={springSnappy}
                    className="shrink-0"
                  >
                    <Checkbox
                      checked={completed}
                      disabled={busy}
                      aria-label={
                        isDraft
                          ? `Complete set ${row.index + 1}`
                          : `Mark set ${row.index + 1} complete`
                      }
                      className="size-5 rounded-md data-checked:bg-primary"
                      onCheckedChange={(checked) => {
                        if (isDraft) {
                          if (checked) void completeDraft(row.rowId);
                          return;
                        }
                        setUncheckedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.delete(row.setId);
                          else next.add(row.setId);
                          return next;
                        });
                        setCheckedAtById((prev) => {
                          if (checked) {
                            return { ...prev, [row.setId]: Date.now() };
                          }
                          const next = { ...prev };
                          delete next[row.setId];
                          delete next[row.rowId];
                          return next;
                        });
                      }}
                    />
                  </motion.div>
                </div>

                <div
                  className={cn(
                    collapseGridClass,
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="min-h-0 overflow-clip" inert={!expanded}>
                    {renderEditor({
                      rowId: row.rowId,
                      setId: row.setId,
                      values: row.values,
                      busy,
                      isDraft,
                      index: row.index,
                      autoFocusWeight: isDraft && row.shouldFocus,
                    })}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <SwapSize
        swapKey={showEmpty ? "empty" : "list"}
        transition={transition}
      >
        {showEmpty ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle>No sets yet</CardTitle>
              <CardDescription>
                Add a set to start logging, or link this move to an existing
                exercise to unify history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExerciseResolveCard
                workoutId={workoutId}
                exerciseId={exerciseId}
                workoutExerciseId={workoutExerciseId}
                candidates={similarQuery.data?.items ?? []}
                onResolved={(id) => {
                  onExerciseResolved?.(id);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={handleAddSet}
              >
                <IconPlus data-icon="inline-start" />
                Add set
              </Button>
            </CardContent>
          </Card>
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
              {todayRows.length > 0 ? (
                renderSetRows(todayRows)
              ) : (
                <p className="text-muted-foreground px-1 text-sm">
                  No sets logged today.
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleAddSet}
              >
                <IconPlus data-icon="inline-start" />
                Add set
              </Button>
            </section>

            {pastGroups.map((group) => (
              <section key={group.day} className="flex flex-col gap-2">
                <h3 className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
                  {formatDayHeading(group.day, today)}
                </h3>
                {renderHistoryRows(rowsForDay(group.day, group.sets))}
              </section>
            ))}
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
