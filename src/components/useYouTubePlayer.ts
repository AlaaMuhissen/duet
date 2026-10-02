"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal types for the YouTube IFrame Player API */
interface YTPlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      apiPromise = null; // allow a retry later
      reject(new Error("YouTube player failed to load"));
    };
    document.head.appendChild(s);
    setTimeout(() => {
      if (window.YT?.Player) return;
      apiPromise = null;
      reject(new Error("YouTube player timed out"));
    }, 15000);
  });
  return apiPromise;
}

const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;

/**
 * Wraps the official YouTube embedded player. The player must stay visible
 * (YouTube's rules), so the element you attach `containerRef` to should be on screen.
 */
export function useYouTubePlayer({ onEnded, onError }: { onEnded: () => void; onError: (code: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const creating = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [failed, setFailed] = useState(false);

  // keep the latest callbacks without recreating the player
  const cb = useRef({ onEnded, onError });
  useEffect(() => {
    cb.current = { onEnded, onError };
  });

  const load = useCallback(async (videoId: string) => {
    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }
    if (creating.current || !containerRef.current) return;
    creating.current = true;
    let YT: YTNamespace;
    try {
      YT = await loadApi();
    } catch {
      creating.current = false;
      setFailed(true);
      return;
    }
    setFailed(false);
    if (!containerRef.current) {
      creating.current = false;
      return;
    }
    const mount = document.createElement("div");
    containerRef.current.replaceChildren(mount);
    playerRef.current = new YT.Player(mount, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
      events: {
        onStateChange: (e) => {
          if (e.data === PLAYING) setPlaying(true);
          else if (e.data === PAUSED) setPlaying(false);
          else if (e.data === ENDED) {
            setPlaying(false);
            cb.current.onEnded();
          }
        },
        onError: (e) => cb.current.onError(e.data),
      },
    });
    creating.current = false;
  }, []);

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const seek = useCallback((s: number) => playerRef.current?.seekTo(s, true), []);

  // progress polling while playing
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (p) setProgress({ current: p.getCurrentTime() || 0, duration: p.getDuration() || 0 });
    }, 500);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  return { containerRef, load, play, pause, seek, playing, progress, failed };
}
