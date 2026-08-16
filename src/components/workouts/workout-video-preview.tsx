"use client";

import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBadgeCc,
  IconLoader2,
  IconMaximize,
  IconMinimize,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@/components/ui/icons";
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";

import { Button } from "@/components/ui/button";
import { WorkoutChannelLink } from "@/components/workouts/workout-channel-link";
import {
  formatVideoTimestamp,
  getYouTubeVideoId,
} from "@/features/workouts/youtube";
import { cn } from "@/shared/utils";

const YT_UNSTARTED = -1;
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_BUFFERING = 3;
const YT_CUED = 5;

type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  loadModule: (module: string) => void;
  unloadModule: (module: string) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: string | HTMLElement,
    config: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: {
          data: number;
          target: YTPlayer;
        }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is only available in the browser"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }
      reject(new Error("YouTube API failed to initialize"));
    };

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube API"));
      document.body.appendChild(script);
    }

    const started = Date.now();
    const interval = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(interval);
        resolve(window.YT);
        return;
      }
      if (Date.now() - started > 15_000) {
        window.clearInterval(interval);
        reject(new Error("Timed out loading YouTube API"));
      }
    }, 50);
  });

  return youtubeApiPromise;
}

function isIdleState(state: number) {
  return (
    state === YT_UNSTARTED ||
    state === YT_ENDED ||
    state === YT_PAUSED ||
    state === YT_CUED
  );
}

export type WorkoutVideoPreviewHandle = {
  seekTo: (seconds: number) => void;
};

type WorkoutVideoPreviewProps = {
  videoUrl: string;
  className?: string;
  author?: string | null;
  channelUrl?: string | null;
  onTimeUpdate?: (seconds: number) => void;
  ref?: Ref<WorkoutVideoPreviewHandle>;
};

export function WorkoutVideoPreview({
  videoUrl,
  className,
  author,
  channelUrl,
  onTimeUpdate,
  ref,
}: WorkoutVideoPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const mediaUnlockedRef = useRef(false);
  const ignoreSurfaceClickRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [touchDevice, setTouchDevice] = useState(true);
  const [showPlayPrompt, setShowPlayPrompt] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);

  const videoId = getYouTubeVideoId(videoUrl);

  function allowIframeAutoplay(playerHost: HTMLElement | null) {
    const iframe = playerHost?.querySelector("iframe");
    if (!iframe) return;
    iframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
    );
    iframe.setAttribute("allowfullscreen", "true");
  }

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const noHover = window.matchMedia("(hover: none)");
    const sync = () => {
      setTouchDevice(
        coarse.matches || noHover.matches || navigator.maxTouchPoints > 0,
      );
    };
    sync();
    coarse.addEventListener("change", sync);
    noHover.addEventListener("change", sync);
    return () => {
      coarse.removeEventListener("change", sync);
      noHover.removeEventListener("change", sync);
    };
  }, []);

  const clearHideControlsTimer = useEffectEvent(() => {
    if (hideControlsTimerRef.current != null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
  });

  const scheduleHideControls = useEffectEvent(() => {
    clearHideControlsTimer();
    if (!playing) return;
    hideControlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2200);
  });

  const revealControls = useEffectEvent(() => {
    setControlsVisible(true);
    scheduleHideControls();
  });

  const emitTimeUpdate = useEffectEvent((seconds: number) => {
    onTimeUpdate?.(seconds);
  });

  const syncFromPlayer = useEffectEvent(() => {
    const player = playerRef.current;
    if (!player || scrubbingRef.current) return;
    try {
      const nextTime = player.getCurrentTime() || 0;
      setCurrentTime(nextTime);
      emitTimeUpdate(nextTime);
      const nextDuration = player.getDuration() || 0;
      if (nextDuration > 0) setDuration(nextDuration);
    } catch {
      // Player may be mid-destroy.
    }
  });

  const markMediaUnlocked = useEffectEvent(() => {
    if (mediaUnlockedRef.current) return;
    mediaUnlockedRef.current = true;
  });

  const applySeek = useEffectEvent((seconds: number, { pause }: { pause: boolean }) => {
    const target = Math.max(0, seconds);
    const player = playerRef.current;
    setCurrentTime(target);
    emitTimeUpdate(target);
    setControlsVisible(true);

    if (pause) {
      setShowPlayPrompt(true);
      setPlaying(false);
      clearHideControlsTimer();
    } else {
      scheduleHideControls();
    }

    if (!player) {
      pendingSeekRef.current = target;
      return;
    }

    player.seekTo(target, true);
    if (pause) {
      player.pauseVideo();
    }
  });

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      applySeek(seconds, { pause: true });
    },
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!videoId || !host) {
      if (!videoId) setError("Unsupported video URL");
      return;
    }

    let cancelled = false;
    let player: YTPlayer | null = null;
    const mount = document.createElement("div");
    mount.className = "size-full";
    host.replaceChildren(mount);

    mediaUnlockedRef.current = false;
    setReady(false);
    setPlaying(false);
    setBuffering(false);
    setShowPlayPrompt(true);
    setControlsVisible(true);
    setCurrentTime(0);
    setDuration(0);
    setCaptionsOn(false);
    setError(null);

    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;

        player = new YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            cc_load_policy: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              try {
                event.target.unloadModule("captions");
                event.target.unloadModule("cc");
              } catch {
                // Caption modules may already be unavailable.
              }
              setReady(true);
              setDuration(event.target.getDuration() || 0);
              allowIframeAutoplay(host);

              const pending = pendingSeekRef.current;
              if (pending != null) {
                pendingSeekRef.current = null;
                applySeek(pending, { pause: true });
                return;
              }

              setShowPlayPrompt(isIdleState(event.target.getPlayerState()));
            },
            onStateChange: (event) => {
              if (cancelled) return;

              if (event.data === YT_PLAYING) {
                markMediaUnlocked();
                setPlaying(true);
                setBuffering(false);
                setShowPlayPrompt(false);
                scheduleHideControls();
                return;
              }

              if (event.data === YT_BUFFERING) {
                markMediaUnlocked();
                setBuffering(true);
                setShowPlayPrompt(false);
                return;
              }

              if (isIdleState(event.data)) {
                setPlaying(false);
                setBuffering(false);
                setShowPlayPrompt(true);
                setControlsVisible(true);
                clearHideControlsTimer();
                syncFromPlayer();
              }
            },
          },
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load video");
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      clearHideControlsTimer();
      try {
        player?.destroy();
      } catch {
        // Player may not be fully constructed yet.
      }
      host.replaceChildren();
    };
  }, [videoId]);

  useEffect(() => {
    function syncFullscreen() {
      const frame = playerFrameRef.current;
      setFullscreen(Boolean(frame && document.fullscreenElement === frame));
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!ready || !playing) return;

    const id = window.setInterval(() => {
      syncFromPlayer();
    }, 250);

    return () => window.clearInterval(id);
  }, [ready, playing]);

  function togglePlayback() {
    const player = playerRef.current;
    if (!player || !ready) return;

    try {
      const state = player.getPlayerState();
      if (state === YT_PLAYING || state === YT_BUFFERING) {
        setPlaying(false);
        setBuffering(false);
        setShowPlayPrompt(true);
        setControlsVisible(true);
        clearHideControlsTimer();
        player.pauseVideo();
        return;
      }
      setShowPlayPrompt(false);
      setBuffering(true);
      setPlaying(true);
      allowIframeAutoplay(hostRef.current);
      // Same-gesture mute/play/unmute unlocks iOS when a custom overlay
      // (not the iframe) receives the tap.
      if (!mediaUnlockedRef.current) {
        player.mute();
        player.playVideo();
        player.unMute();
        return;
      }
      player.playVideo();
    } catch {
      // Player may be mid-destroy.
    }
  }

  function handlePlayClick(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    ignoreSurfaceClickRef.current = true;
    togglePlayback();
  }

  function handleSurfaceClick() {
    if (ignoreSurfaceClickRef.current) {
      ignoreSurfaceClickRef.current = false;
      return;
    }

    if (!ready) return;

    // Phone UX: when playing with hidden controls, first tap only reveals chrome.
    if (playing && !controlsVisible && touchDevice) {
      revealControls();
      return;
    }

    togglePlayback();
  }

  function seekFromClientX(clientX: number) {
    const track = progressTrackRef.current;
    const player = playerRef.current;
    if (!track || !player || duration <= 0) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const next = ratio * duration;
    setCurrentTime(next);
    emitTimeUpdate(next);
    player.seekTo(next, true);
  }

  function handleProgressPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!ready || duration <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubbingRef.current = true;
    setControlsVisible(true);
    clearHideControlsTimer();
    seekFromClientX(event.clientX);
  }

  function handleProgressPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return;
    seekFromClientX(event.clientX);
  }

  function handleProgressPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released.
    }
    if (playing) scheduleHideControls();
    else setShowPlayPrompt(true);
  }

  if (!videoId) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-xl text-sm",
          className,
        )}
      >
        Unsupported video URL
      </div>
    );
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  async function toggleFullscreen() {
    const frame = playerFrameRef.current;
    if (!frame) return;

    try {
      if (document.fullscreenElement === frame) {
        await document.exitFullscreen();
        return;
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      await frame.requestFullscreen();
    } catch {
      // Fullscreen may be blocked by the browser.
    }
  }

  function toggleCaptions() {
    const player = playerRef.current;
    if (!player || !ready) return;

    try {
      if (captionsOn) {
        player.unloadModule("captions");
        player.unloadModule("cc");
        setCaptionsOn(false);
        return;
      }
      player.loadModule("captions");
      player.loadModule("cc");
      setCaptionsOn(true);
    } catch {
      // Caption modules are unavailable on some videos.
    }
  }

  function minimizePlayer() {
    const player = playerRef.current;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    try {
      player?.pauseVideo();
    } catch {
      // Player may be mid-destroy.
    }
    setMinimized(true);
  }

  const timeLabel =
    duration > 0
      ? `${formatVideoTimestamp(currentTime)} / ${formatVideoTimestamp(duration)}`
      : formatVideoTimestamp(currentTime);

  return (
    <div className="relative flex flex-col">
      {minimized ? (
        <div className="bg-muted/70 flex items-center gap-1.5 rounded-xl py-1 pr-1 pl-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-full"
            aria-label={playing ? "Pause video" : "Play video"}
            disabled={!ready || Boolean(error)}
            onClick={togglePlayback}
          >
            {buffering && !playing ? (
              <IconLoader2 className="animate-spin" />
            ) : playing ? (
              <IconPlayerPauseFilled />
            ) : (
              <IconPlayerPlayFilled className="translate-x-px" />
            )}
          </Button>

          <div
            ref={progressTrackRef}
            className="relative h-7 min-w-0 flex-1 cursor-pointer touch-none"
            onPointerDown={handleProgressPointerDown}
            onPointerMove={handleProgressPointerMove}
            onPointerUp={handleProgressPointerUp}
            onPointerCancel={handleProgressPointerUp}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
            onKeyDown={(event) => {
              const player = playerRef.current;
              if (!player || duration <= 0) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                applySeek(Math.max(0, currentTime - 5), {
                  pause: !playing,
                });
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                applySeek(Math.min(duration, currentTime + 5), {
                  pause: !playing,
                });
              }
            }}
          >
            <div className="bg-foreground/10 absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div
              className="border-background bg-foreground absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
              style={{ left: `${progress * 100}%` }}
            />
          </div>

          <span className="text-muted-foreground shrink-0 px-1 font-mono text-[11px] tabular-nums">
            {timeLabel}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-full"
            aria-label="Expand video"
            onClick={() => setMinimized(false)}
          >
            <IconArrowsMaximize />
          </Button>
        </div>
      ) : null}

      <div
        ref={playerFrameRef}
        className={cn(
          "bg-muted group/player relative overflow-hidden rounded-xl select-none [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full",
          minimized
            ? "pointer-events-none invisible absolute size-px overflow-hidden"
            : fullscreen
              ? "h-dvh w-full rounded-none"
              : "aspect-video",
          "[&_iframe]:pointer-events-none",
          !minimized && className,
        )}
        onPointerMove={(event) => {
          // Touch devices fire pointermove during scroll; only mouse should auto-reveal.
          if (playing && event.pointerType === "mouse") revealControls();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          if (playing && !scrubbingRef.current) {
            clearHideControlsTimer();
            setControlsVisible(false);
          }
        }}
      >
        <div ref={hostRef} className="absolute inset-0 size-full" />

        {!error ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-10 touch-manipulation"
              aria-label={playing ? "Pause video" : "Play video"}
              onClick={handleSurfaceClick}
            />

            {showPlayPrompt ? (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 touch-manipulation"
                onClick={handlePlayClick}
              >
                <button
                  type="button"
                  className="flex size-14 touch-manipulation items-center justify-center rounded-full bg-white text-black shadow-lg"
                  aria-label="Play video"
                  disabled={!ready}
                  onClick={handlePlayClick}
                >
                  {!ready || (buffering && !playing) ? (
                    <IconLoader2 className="size-7 animate-spin" />
                  ) : (
                    <IconPlayerPlayFilled className="size-7 translate-x-0.5" />
                  )}
                </button>
              </div>
            ) : null}

            {playing && buffering ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <IconLoader2 className="size-8 animate-spin text-white drop-shadow" />
              </div>
            ) : null}

            <button
              type="button"
              className={cn(
                "absolute top-2 right-2 z-30 flex size-8 items-center justify-center rounded-full text-white shadow-sm transition-opacity duration-200 hover:bg-black/40",
                controlsVisible || showPlayPrompt
                  ? "opacity-100"
                  : "pointer-events-none opacity-0",
              )}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={(event) => {
                event.stopPropagation();
                void toggleFullscreen();
              }}
            >
              {fullscreen ? (
                <IconMinimize className="size-4" />
              ) : (
                <IconMaximize className="size-4" />
              )}
            </button>

            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/75 via-black/35 to-transparent px-3 pt-10 pb-3 transition-opacity duration-200",
                controlsVisible || showPlayPrompt
                  ? "opacity-100"
                  : "opacity-0",
              )}
            >
              <div
                className={cn(
                  controlsVisible || showPlayPrompt
                    ? "pointer-events-auto"
                    : "pointer-events-none",
                )}
              >
              {author || channelUrl ? (
                <div
                  className="mb-1.5 min-w-0"
                  onClick={(event) => event.stopPropagation()}
                >
                  <WorkoutChannelLink
                    author={author}
                    channelUrl={channelUrl}
                    className="max-w-full text-xs text-white/90 hover:text-white"
                  />
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={handlePlayClick}
                >
                  {playing ? (
                    <IconPlayerPauseFilled className="size-4" />
                  ) : (
                    <IconPlayerPlayFilled className="size-4 translate-x-px" />
                  )}
                </button>

                <div
                  ref={minimized ? undefined : progressTrackRef}
                  className="relative h-7 flex-1 cursor-pointer touch-none"
                  onPointerDown={handleProgressPointerDown}
                  onPointerMove={handleProgressPointerMove}
                  onPointerUp={handleProgressPointerUp}
                  onPointerCancel={handleProgressPointerUp}
                  role="slider"
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={Math.floor(duration)}
                  aria-valuenow={Math.floor(currentTime)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    const player = playerRef.current;
                    if (!player || duration <= 0) return;
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      applySeek(Math.max(0, currentTime - 5), {
                        pause: !playing,
                      });
                    }
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      applySeek(Math.min(duration, currentTime + 5), {
                        pause: !playing,
                      });
                    }
                  }}
                >
                  <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <div
                    className="border-background absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white shadow"
                    style={{ left: `${progress * 100}%` }}
                  />
                </div>

                <span className="min-w-18 text-right font-mono text-[11px] tabular-nums text-white/90">
                  {timeLabel}
                </span>

                <button
                  type="button"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15",
                    captionsOn && "bg-white/20",
                  )}
                  aria-label={captionsOn ? "Hide captions" : "Show captions"}
                  aria-pressed={captionsOn}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCaptions();
                  }}
                >
                  <IconBadgeCc className="size-4" />
                </button>

                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                  aria-label="Minimize video"
                  onClick={(event) => {
                    event.stopPropagation();
                    minimizePlayer();
                  }}
                >
                  <IconArrowsMinimize className="size-4" />
                </button>
              </div>
              </div>
            </div>
          </>
        ) : null}

        {error ? (
          <div className="bg-muted text-destructive absolute inset-0 z-40 flex items-center justify-center p-4 text-center text-sm">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
