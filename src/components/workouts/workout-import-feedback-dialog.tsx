"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateImportPromptFeedback } from "@/features/workouts/hooks";
import {
  IMPORT_PROMPT_INSTRUCTIONS,
  type ImportPromptInstruction,
  type ImportPromptVerdict,
} from "@/features/workouts/import-prompt-instructions";
import { formatVideoTimestamp } from "@/features/workouts/youtube";
import { cn } from "@/shared/utils";

const VERDICTS: { value: ImportPromptVerdict; label: string }[] = [
  { value: "accurate", label: "Looks right" },
  { value: "inaccurate", label: "Off" },
  { value: "unclear", label: "Not sure" },
];

type Draft = {
  verdict: ImportPromptVerdict | null;
  note: string;
};

export function WorkoutImportFeedbackDialog({
  workoutId,
  videoTimestamp,
  open,
  onOpenChange,
}: {
  workoutId: string;
  videoTimestamp: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submit = useCreateImportPromptFeedback(workoutId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [comment, setComment] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, ImportPromptInstruction[]>();
    for (const instruction of IMPORT_PROMPT_INSTRUCTIONS) {
      const existing = map.get(instruction.group) ?? [];
      map.set(instruction.group, [...existing, instruction]);
    }
    return [...map.entries()];
  }, []);

  const canSubmit =
    Boolean(comment.trim()) ||
    Object.values(drafts).some((draft) => draft.verdict != null);

  function resetForm() {
    setDrafts({});
    setComment("");
  }

  function setVerdict(id: string, verdict: ImportPromptVerdict) {
    setDrafts((current) => {
      const existing = current[id];
      const nextVerdict = existing?.verdict === verdict ? null : verdict;
      if (!nextVerdict && !existing?.note) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [id]: {
          verdict: nextVerdict,
          note: existing?.note ?? "",
        },
      };
    });
  }

  function setNote(id: string, note: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        verdict: current[id]?.verdict ?? null,
        note,
      },
    }));
  }

  async function handleSubmit() {
    const annotations = Object.entries(drafts).flatMap(
      ([instructionId, draft]) => {
        if (!draft.verdict) return [];
        const note = draft.note.trim();
        return [
          {
            instructionId,
            verdict: draft.verdict,
            ...(note ? { note } : {}),
          },
        ];
      },
    );

    await submit.mutateAsync({
      annotations,
      comment: comment.trim() || undefined,
      videoTimestamp,
    });
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[min(88dvh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Something off at {formatVideoTimestamp(videoTimestamp)}?
          </DialogTitle>
          <DialogDescription>
            Does the workout list match the video here? Tap what’s wrong so we
            can read videos more accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {groups.map(([group, instructions]) => (
            <section key={group} className="flex flex-col gap-2.5">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {group}
              </h3>
              <div className="flex flex-col gap-2">
                {instructions.map((instruction) => {
                  const draft = drafts[instruction.id];
                  return (
                    <div
                      key={instruction.id}
                      className="bg-surface-container-highest/70 rounded-xl px-3 py-2.5"
                    >
                      <p className="text-sm font-medium">{instruction.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        {instruction.body}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {VERDICTS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                              draft?.verdict === option.value
                                ? option.value === "inaccurate"
                                  ? "bg-destructive text-primary-foreground"
                                  : option.value === "accurate"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                                : "bg-background/70 text-muted-foreground hover:text-foreground",
                            )}
                            aria-pressed={draft?.verdict === option.value}
                            onClick={() =>
                              setVerdict(instruction.id, option.value)
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {draft?.verdict && draft.verdict !== "accurate" ? (
                        <Textarea
                          className="mt-2 min-h-12 text-sm"
                          placeholder="What should it have been?"
                          value={draft.note}
                          onChange={(event) =>
                            setNote(instruction.id, event.target.value)
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="import-prompt-comment">Anything else?</Label>
            <Textarea
              id="import-prompt-comment"
              placeholder="Wrong name, missing move, time is early or late…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || submit.isPending}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {submit.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
