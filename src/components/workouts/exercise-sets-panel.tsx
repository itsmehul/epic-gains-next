"use client";

import {
  IconChevronDown,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ExerciseResolveCard } from "@/components/workouts/exercise-resolve-card";
import {
  useCreateSet,
  useDeleteSet,
  useSimilarExercises,
  useUpdateSet,
  useUpdateWorkoutExercise,
  useDeleteWorkoutExercise,
} from "@/features/workouts/hooks";
import type { Set } from "@/features/workouts/types";
import { cn } from "@/shared/utils";

type FieldKey = "reps" | "weight" | "time" | "distance";

type RowValues = Record<FieldKey, string>;

type DraftRow = {
  id: string;
  values: RowValues;
};

const springSoft = { type: "spring" as const, stiffness: 420, damping: 32 };
const springSnappy = { type: "spring" as const, stiffness: 520, damping: 36 };
const easeOut = [0.25, 1, 0.5, 1] as const;

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

function hasAnyValue(values: RowValues) {
  return Object.values(values).some((value) => value.trim() !== "");
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
  return (
    <input
      id={id}
      type="number"
      inputMode={inputMode}
      min={0}
      step={step}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      autoFocus={autoFocus}
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

const PRIMARY_FIELDS: FieldDef[] = [
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
];

const EXTRA_FIELDS: FieldDef[] = [
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

type ExerciseSetsPanelProps = {
  workoutId: string;
  exerciseId: string;
  localName: string;
  sets: Set[];
  onExerciseResolved?: (targetExerciseId: string) => void;
};

export function ExerciseSetsPanel({
  workoutId,
  exerciseId,
  localName,
  sets,
  onExerciseResolved,
}: ExerciseSetsPanelProps) {
  const createSet = useCreateSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();
  const updateWorkoutExercise = useUpdateWorkoutExercise();
  const deleteWorkoutExercise = useDeleteWorkoutExercise();
  const showResolve = sets.length === 0;
  const similarQuery = useSimilarExercises(exerciseId, {
    workoutId,
    enabled: showResolve,
  });

  const [nameDraft, setNameDraft] = useState(localName);
  const [nameBusy, setNameBusy] = useState(false);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [savedValues, setSavedValues] = useState<Record<string, RowValues>>(
    () => Object.fromEntries(sets.map((set) => [set.id, valuesFromSet(set)])),
  );
  const savedValuesRef = useRef(savedValues);
  const [completedDraftIds, setCompletedDraftIds] = useState(
    () => new Set<string>(),
  );
  const [uncheckedIds, setUncheckedIds] = useState(() => new Set<string>());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const focusedFieldRef = useRef<string | null>(null);
  const baseId = useId().replace(/:/g, "");

  useEffect(() => {
    savedValuesRef.current = savedValues;
  }, [savedValues]);

  useEffect(() => {
    setNameDraft(localName);
  }, [localName, exerciseId]);

  useEffect(() => {
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
      const ids = new Set(sets.map((set) => set.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
      }
      return next;
    });
  }, [sets]);

  const hasExtraValues =
    sets.some((set) => set.time != null || set.distance != null) ||
    drafts.some(
      (draft) =>
        draft.values.time.trim() !== "" || draft.values.distance.trim() !== "",
    );
  const extrasOpen = showExtras || hasExtraValues;

  function handleAddSet() {
    setError(null);
    const lastSaved = sets.at(-1);
    const lastDraft = drafts.at(-1);
    const id = createDraftId();
    setDrafts((prev) => [
      ...prev,
      {
        id,
        values: valuesFromLast(lastSaved, lastDraft),
      },
    ]);
    setExpandedId(id);
  }

  async function handleDeleteExercise() {
    setError(null);
    setNameBusy(true);
    try {
      await deleteWorkoutExercise.mutateAsync({
        workoutId,
        exerciseId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exercise");
      setNameBusy(false);
    }
  }

  async function persistLocalName() {
    const next = nameDraft.trim();
    if (!next || next === localName) {
      setNameDraft(localName);
      return;
    }
    setNameBusy(true);
    setError(null);
    try {
      await updateWorkoutExercise.mutateAsync({
        workoutId,
        exerciseId,
        name: next,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
      setNameDraft(localName);
    } finally {
      setNameBusy(false);
    }
  }

  async function persistSaved(setId: string) {
    const values = savedValuesRef.current[setId];
    if (!values) return;

    if (hasInvalidNumber(values)) {
      setError("Values must be valid numbers");
      return;
    }

    const existing = sets.find((set) => set.id === setId);
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
    if (!draft) return;

    if (!hasAnyValue(draft.values)) {
      setError("Enter weight or reps before completing the set");
      return;
    }
    if (hasInvalidNumber(draft.values)) {
      setError("Values must be valid numbers");
      return;
    }

    setBusyId(draftId);
    setError(null);
    setCompletedDraftIds((prev) => new Set(prev).add(draftId));
    try {
      const created = await createSet.mutateAsync({
        workoutId,
        exerciseId,
        ...toPayload(draft.values),
      });
      setDrafts((prev) => prev.filter((row) => row.id !== draftId));
      setCompletedDraftIds((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
      setExpandedId(created.id);
    } catch (err) {
      setCompletedDraftIds((prev) => {
        const next = new Set(prev);
        next.delete(draftId);
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to log set");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteSaved(setId: string) {
    setError(null);
    setBusyId(setId);
    try {
      await deleteSet.mutateAsync(setId);
      setExpandedId((prev) => (prev === setId ? null : prev));
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
    values,
    busy,
    isDraft,
    index,
    autoFocusWeight,
  }: {
    rowId: string;
    values: RowValues;
    busy: boolean;
    isDraft: boolean;
    index: number;
    autoFocusWeight?: boolean;
  }) {
    return (
      <motion.div
        key={`${rowId}-editor`}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.22, ease: easeOut }}
        className="overflow-hidden"
      >
        <div className="space-y-3 px-3 pb-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {PRIMARY_FIELDS.map((field, fieldIndex) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.04 + fieldIndex * 0.04,
                  duration: 0.2,
                  ease: easeOut,
                }}
                className="space-y-1"
              >
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
                    autoFocusWeight && field.key === "weight" && isDraft
                  }
                  onFocus={() => {
                    focusedFieldRef.current = `${rowId}:${field.key}`;
                  }}
                  onChange={(value) => {
                    focusedFieldRef.current = `${rowId}:${field.key}`;
                    if (isDraft) updateDraftValue(rowId, field.key, value);
                    else updateSavedValue(rowId, field.key, value);
                  }}
                  onBlur={() => {
                    focusedFieldRef.current = null;
                    if (!isDraft) void persistSaved(rowId);
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
              </motion.div>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {extrasOpen ? (
              <motion.div
                key="extras"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: easeOut }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 pb-0.5">
                  {EXTRA_FIELDS.map((field, fieldIndex) => (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: fieldIndex * 0.03,
                        duration: 0.18,
                        ease: easeOut,
                      }}
                      className="space-y-1"
                    >
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
                          focusedFieldRef.current = `${rowId}:${field.key}`;
                        }}
                        onChange={(value) => {
                          focusedFieldRef.current = `${rowId}:${field.key}`;
                          if (isDraft)
                            updateDraftValue(rowId, field.key, value);
                          else updateSavedValue(rowId, field.key, value);
                        }}
                        onBlur={() => {
                          focusedFieldRef.current = null;
                          if (!isDraft) void persistSaved(rowId);
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
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            {!hasExtraValues ? (
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
                {extrasOpen ? "Hide extras" : "Time / distance"}
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
                    <IconLoader2 className="animate-spin" data-icon="inline-start" />
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
                    void handleDeleteSaved(rowId);
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
      </motion.div>
    );
  }

  return (
    <div>
      <div className="mx-2 mb-2 flex items-center gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor={`${baseId}-local-name`}>
            Exercise name in this workout
          </label>
          <Input
            id={`${baseId}-local-name`}
            value={nameDraft}
            disabled={nameBusy}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              void persistLocalName();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="h-9 border-transparent bg-transparent px-1 text-base font-medium shadow-none focus-visible:border-ring focus-visible:bg-background"
            placeholder="Exercise name"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={nameBusy}
          className="text-muted-foreground hover:text-destructive size-8 shrink-0"
          onClick={() => {
            if (
              window.confirm(
                "Are you sure you want to remove this exercise from the workout?",
              )
            ) {
              void handleDeleteExercise();
            }
          }}
          aria-label="Remove exercise"
        >
          {nameBusy && deleteWorkoutExercise.isPending ? (
            <IconLoader2 className="animate-spin size-4" />
          ) : (
            <IconTrash className="size-4" />
          )}
        </Button>
      </div>

      <LayoutGroup>
        <ul className="divide-border/60 mx-2 divide-y overflow-hidden rounded-xl bg-muted/20">
          <AnimatePresence initial={false} mode="popLayout">
            {sets.map((set, index) => {
              const values = savedValues[set.id] ?? valuesFromSet(set);
              const completed = !uncheckedIds.has(set.id);
              const busy = busyId === set.id;
              const expanded = expandedId === set.id;
              const summary = formatSetSummary(values);

              return (
                <motion.li
                  key={set.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={springSoft}
                  className={cn(
                    "overflow-hidden",
                    completed && "bg-primary/8",
                    expanded && "bg-muted/40",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-expanded={expanded}
                      onClick={() => toggleExpanded(set.id)}
                    >
                      <motion.span
                        layout
                        aria-hidden
                        className="text-primary/50 flex w-4 shrink-0 justify-center text-xs tabular-nums"
                      >
                        {index + 1}
                      </motion.span>
                      <span className="min-w-0 flex-1">
                        <motion.span
                          key={summary}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: easeOut }}
                          className={cn(
                            "block truncate text-sm font-medium tabular-nums",
                            summary === "Tap to log" &&
                            "text-muted-foreground font-normal",
                          )}
                        >
                          {summary}
                        </motion.span>
                        <span className="text-muted-foreground text-[11px]">
                          {expanded ? "Editing" : "Previous —"}
                        </span>
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
                        aria-label={`Mark set ${index + 1} complete`}
                        className="size-5 rounded-md data-checked:bg-primary"
                        onCheckedChange={(checked) => {
                          setUncheckedIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.delete(set.id);
                            else next.add(set.id);
                            return next;
                          });
                        }}
                      />
                    </motion.div>
                  </div>

                  <AnimatePresence initial={false}>
                    {expanded
                      ? renderEditor({
                        rowId: set.id,
                        values,
                        busy,
                        isDraft: false,
                        index,
                      })
                      : null}
                  </AnimatePresence>
                </motion.li>
              );
            })}

            {drafts.map((draft, draftIndex) => {
              const index = sets.length + draftIndex;
              const busy = busyId === draft.id;
              const completing = completedDraftIds.has(draft.id);
              const expanded = expandedId === draft.id;
              const summary = formatSetSummary(draft.values);

              return (
                <motion.li
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                  transition={springSoft}
                  className={cn(
                    "overflow-hidden",
                    completing && "bg-primary/6",
                    expanded && "bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-expanded={expanded}
                      onClick={() => toggleExpanded(draft.id)}
                    >
                      <span
                        aria-hidden
                        className="text-primary/50 flex w-4 shrink-0 justify-center text-xs tabular-nums"
                      >
                        {index + 1}
                      </span>
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
                        <span className="text-muted-foreground text-[11px]">
                          Draft · not saved
                        </span>
                      </span>
                    </button>

                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      transition={springSnappy}
                      className="shrink-0"
                    >
                      <Checkbox
                        checked={completing}
                        disabled={busy}
                        aria-label={`Complete set ${index + 1}`}
                        className="size-5 rounded-md data-checked:bg-primary"
                        onCheckedChange={(checked) => {
                          if (checked) void completeDraft(draft.id);
                        }}
                      />
                    </motion.div>
                  </div>

                  <AnimatePresence initial={false}>
                    {expanded
                      ? renderEditor({
                        rowId: draft.id,
                        values: draft.values,
                        busy,
                        isDraft: true,
                        index,
                        autoFocusWeight: true,
                      })
                      : null}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </LayoutGroup>

      <AnimatePresence initial={false}>
        {sets.length === 0 && drafts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mx-2"
          >
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
                  candidates={similarQuery.data?.items ?? []}
                  onResolved={(targetId) => {
                    onExerciseResolved?.(targetId);
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div layout className="mx-2 flex justify-center pt-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddSet}
        >
          <IconPlus data-icon="inline-start" />
          Add Set
        </Button>
      </motion.div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-destructive mx-2 overflow-hidden px-3 text-xs"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
