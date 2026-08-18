"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconStop,
} from "@/components/ui/icons";
import { cn } from "@/shared/utils";

type SetTimerDialogProps = {
  open: boolean;
  presetSeconds: number;
  onOpenChange: (open: boolean) => void;
  onSelectTime: (seconds: number) => void;
};

function formatStopwatch(totalMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, totalMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

let timerAudioContext: AudioContext | null = null;

function getTimerAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!timerAudioContext || timerAudioContext.state === "closed") {
    timerAudioContext = new AudioCtx();
  }
  return timerAudioContext;
}

function playTimerCompleteChime() {
  const ctx = getTimerAudioContext();
  if (!ctx) return;

  const start = () => {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(ctx.destination);

    const tones = [
      { freq: 880, offset: 0 },
      { freq: 1174.66, offset: 0.12 },
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.freq, now + tone.offset);
      gain.gain.setValueAtTime(0.0001, now + tone.offset);
      gain.gain.exponentialRampToValueAtTime(0.9, now + tone.offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.offset + 0.32);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + tone.offset);
      osc.stop(now + tone.offset + 0.34);
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(start).catch(() => {});
    return;
  }
  start();
}

function formatSecondsLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const rounded = Number(seconds.toFixed(seconds % 1 === 0 ? 0 : 1));
  if (rounded >= 60) {
    const mins = Math.floor(rounded / 60);
    const secs = Number((rounded % 60).toFixed(rounded % 1 === 0 ? 0 : 1));
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${rounded}s`;
}

export function SetTimerDialog({
  open,
  presetSeconds,
  onOpenChange,
  onSelectTime,
}: SetTimerDialogProps) {
  const targetMs = Math.max(0, presetSeconds) * 1000;
  const hasPreset = targetMs > 0;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"running" | "review">("running");
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const completeChimePlayedRef = useRef(false);
  const stoppedSecondsRef = useRef(0);

  const computeElapsedMs = () => {
    const base = accumulatedRef.current;
    if (!isRunning || startedAtRef.current === null) return base;
    return base + Math.max(0, Date.now() - startedAtRef.current);
  };

  useEffect(() => {
    if (!open) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startedAtRef.current = null;
      accumulatedRef.current = 0;
      completeChimePlayedRef.current = false;
      setElapsedMs(0);
      setIsRunning(false);
      setPhase("running");
      return;
    }

    accumulatedRef.current = 0;
    completeChimePlayedRef.current = false;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setIsRunning(true);
    setPhase("running");
    void getTimerAudioContext()?.resume();
  }, [open]);

  useEffect(() => {
    if (!open || !isRunning || phase !== "running") return;
    const tick = () => {
      setElapsedMs(computeElapsedMs());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, isRunning, phase]);

  const currentElapsedMs = isRunning ? computeElapsedMs() : elapsedMs;
  const overshot = hasPreset && currentElapsedMs > targetMs;

  useEffect(() => {
    if (!open || !hasPreset || phase !== "running") return;
    if (currentElapsedMs < targetMs) return;
    if (completeChimePlayedRef.current) return;
    completeChimePlayedRef.current = true;
    playTimerCompleteChime();
  }, [open, hasPreset, phase, currentElapsedMs, targetMs]);
  const progress = hasPreset
    ? Math.min(1.15, currentElapsedMs / targetMs)
    : 0;

  const handlePauseResume = () => {
    if (isRunning) {
      const now = Date.now();
      const base = startedAtRef.current ?? now;
      accumulatedRef.current += now - base;
      startedAtRef.current = null;
      setIsRunning(false);
      setElapsedMs(accumulatedRef.current);
      return;
    }
    startedAtRef.current = Date.now();
    setIsRunning(true);
  };

  const handleStop = () => {
    let totalMs = accumulatedRef.current;
    if (isRunning && startedAtRef.current !== null) {
      totalMs += Date.now() - startedAtRef.current;
    }
    startedAtRef.current = null;
    accumulatedRef.current = totalMs;
    setIsRunning(false);
    setElapsedMs(totalMs);
    const elapsedSeconds = Math.max(0, totalMs / 1000);
    stoppedSecondsRef.current = elapsedSeconds;
    if (!hasPreset) {
      onSelectTime(elapsedSeconds);
      onOpenChange(false);
      return;
    }
    setPhase("review");
  };

  const commitSelectedTime = (seconds: number) => {
    onSelectTime(seconds);
    onOpenChange(false);
  };

  const elapsedSeconds = Math.max(0, elapsedMs / 1000);
  const elapsedChanged =
    Math.abs(elapsedSeconds - presetSeconds) >= 0.05;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-background inset-0 top-0 left-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <DialogTitle className="text-sm font-medium tracking-wide uppercase">
            {phase === "review" ? "Save time" : isRunning ? "Running" : "Paused"}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>

        <DialogDescription className="sr-only">
          Count-up timer for this set. You can go past the target time, then keep
          the original target or track what you actually did.
        </DialogDescription>

        {phase === "running" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-16">
            <div className="relative flex size-64 items-center justify-center sm:size-72">
              <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="6"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={cn(
                    overshot ? "stroke-primary" : "stroke-primary/80",
                  )}
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - Math.min(progress, 1))}`}
                />
              </svg>
              <div className="relative flex flex-col items-center gap-1">
                <span className="font-heading text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl">
                  {formatStopwatch(currentElapsedMs)}
                </span>
                {hasPreset ? (
                  <span
                    className={cn(
                      "text-sm tabular-nums",
                      overshot ? "text-primary font-medium" : "text-muted-foreground",
                    )}
                  >
                    {overshot ? "Past target · " : "Target "}
                    {formatSecondsLabel(presetSeconds)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">No target set</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <Button
                type="button"
                size="icon-lg"
                variant="secondary"
                className="size-16 rounded-full"
                aria-label={isRunning ? "Pause timer" : "Resume timer"}
                onClick={handlePauseResume}
              >
                {isRunning ? (
                  <IconPlayerPauseFilled className="size-7" />
                ) : (
                  <IconPlayerPlayFilled className="size-7" />
                )}
              </Button>
              <Button
                type="button"
                size="icon-lg"
                className="size-16 rounded-full"
                aria-label="Stop timer"
                onClick={handleStop}
              >
                <IconStop className="size-7" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-16">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-heading text-5xl font-semibold tabular-nums tracking-tight">
                {formatStopwatch(elapsedMs)}
              </p>
              <p className="text-muted-foreground text-sm">
                {elapsedChanged
                  ? `Target was ${formatSecondsLabel(presetSeconds)}`
                  : "Matches the current target"}
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-2">
              <Button
                type="button"
                size="lg"
                className="h-12 rounded-full"
                onClick={() => {
                  commitSelectedTime(stoppedSecondsRef.current || elapsedSeconds);
                }}
              >
                Track {formatSecondsLabel(elapsedSeconds)}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-12 rounded-full"
                onClick={() => {
                  commitSelectedTime(presetSeconds);
                }}
              >
                Keep {formatSecondsLabel(presetSeconds)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
