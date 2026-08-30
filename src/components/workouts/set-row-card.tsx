"use client";

import { IconChevronDown, IconLoader2, IconTimer } from "@/components/ui/icons";
import { motion, type Transition } from "motion/react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/shared/utils";

export type SetRowPhase = "draft" | "approving" | "logged";
export type SetRowSource = "target" | "previous" | "custom";

export type SetRowValues = {
  reps: string;
  weight: string;
  time: string;
  distance: string;
};

type SetRowCardProps = {
  rowKey: string;
  phase: SetRowPhase;
  source?: SetRowSource;
  summary: string;
  expanded: boolean;
  busy: boolean;
  isEntering?: boolean;
  transition: Transition;
  onToggleExpanded: () => void;
  onApprove: () => void;
  onRemove: () => void;
  onOpenTimer?: () => void;
  editor: React.ReactNode;
};

const springSnappy = { type: "spring" as const, stiffness: 520, damping: 36 };
const collapseGridClass =
  "grid transition-[grid-template-rows] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

const statusToneClass = {
  logged:
    "bg-primary/10",
  approving:
    "bg-primary/10",
  previous:
    "bg-[repeating-linear-gradient(-38deg,color-mix(in_oklab,var(--foreground)_11%,transparent)_0_2px,transparent_2px_9px)]",
  target:
    "bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_16%,transparent)_1.15px,transparent_1.2px)] bg-size-[7px_7px]",
  custom:
    "bg-transparent",
} as const;

function statusLabel(phase: SetRowPhase, source: SetRowSource): string {
  if (phase === "logged") return "Logged";
  if (phase === "approving") return "Saving";
  if (source === "previous") return "Draft from last session";
  if (source === "target") return "Draft from target";
  return "Custom draft";
}

export function SetRowCard({
  phase,
  source = "custom",
  summary,
  expanded,
  busy,
  isEntering = false,
  transition,
  onToggleExpanded,
  onApprove,
  onRemove,
  onOpenTimer,
  editor,
}: SetRowCardProps) {
  const isDraft = phase === "draft";
  const isApproving = phase === "approving";
  const isLogged = phase === "logged";
  const isComplete = isApproving || isLogged;
  const editorOpen = isDraft && expanded && !isApproving;
  const checkboxChecked = isComplete;
  const canExpand = isDraft && !isApproving;
  const checkboxDisabled = isApproving || busy;
  const tone = isLogged
    ? "logged"
    : isApproving
      ? "approving"
      : source;

  return (
    <motion.li
      layout="position"
      initial={isEntering ? { opacity: 0, height: 0 } : false}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={transition}
      className={cn(
        "overflow-clip transition-[background-color] duration-280",
        statusToneClass[tone],
        editorOpen && "bg-muted/40 bg-none",
      )}
    >
      <div className="relative">
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              !canExpand && "cursor-default",
            )}
            aria-expanded={editorOpen}
            disabled={!canExpand}
            onClick={onToggleExpanded}
          >
            <span className="min-w-0 flex-1">
              <span className="sr-only">{statusLabel(phase, source)}. </span>
              <span
                className={cn(
                  "block truncate text-lg font-semibold leading-tight tabular-nums tracking-tight transition-colors duration-280",
                  summary === "Tap to log" &&
                    isDraft &&
                    "text-muted-foreground text-base font-normal tracking-normal",
                )}
              >
                {summary}
              </span>
            </span>
          </button>

          {onOpenTimer ? (
            <button
              type="button"
              aria-label="Start set timer"
              disabled={busy || isApproving}
              className="text-muted-foreground hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-foreground/8 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
              onClick={(event) => {
                event.stopPropagation();
                onOpenTimer();
              }}
            >
              <IconTimer className="size-5" />
            </button>
          ) : null}

          <div className="relative flex size-8 shrink-0 items-center justify-center">
            <Checkbox
              checked={checkboxChecked}
              disabled={checkboxDisabled}
              aria-label={
                isDraft
                  ? "Save set"
                  : isLogged
                    ? "Delete set"
                    : "Set logged"
              }
              className="size-8 rounded-md border-foreground/40 bg-background after:-inset-x-1 after:-inset-y-1 transition-[background-color,border-color] duration-280 data-checked:border-primary data-checked:bg-primary [&>[data-slot=checkbox-indicator]>.ms-icon]:size-5"
              onCheckedChange={(checked) => {
                if (checked && isDraft) onApprove();
                if (!checked && isLogged) onRemove();
              }}
            />
            {busy ? (
              <IconLoader2
                aria-hidden
                className="text-primary pointer-events-none absolute inset-0 m-auto size-4 animate-spin"
              />
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            collapseGridClass,
            editorOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-clip" inert={!editorOpen}>
            {editor}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export { IconChevronDown, springSnappy, collapseGridClass };
