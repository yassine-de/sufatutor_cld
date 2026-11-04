"use client";

import { useEffect } from "react";
import { trackLearning } from "./actions";

const INTERVAL_MS = 30_000;

// Reports "a child is learning right now" while a learning page is open and visible.
// It renders nothing; the server ignores calls when no child profile is active.
export function SessionTracker() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === "visible") void trackLearning();
    };
    ping();
    const timer = setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
