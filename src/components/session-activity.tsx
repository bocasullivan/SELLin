"use client";

import { useEffect } from "react";

export function SessionActivity() {
  useEffect(() => {
    let lastRequest = 0;
    let pending = false;
    let disposed = false;

    async function touch() {
      if (document.visibilityState !== "visible" || pending || Date.now() - lastRequest < 60_000)
        return;
      pending = true;
      try {
        const response = await fetch("/api/auth/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (response.status === 401 && !disposed) window.location.replace("/login");
        if (response.ok) lastRequest = Date.now();
      } finally {
        pending = false;
      }
    }

    const activity = () => {
      void touch().catch(() => undefined);
    };
    activity();
    // No background heartbeat: an unattended tab must not extend the session forever.
    window.addEventListener("focus", activity);
    window.addEventListener("pageshow", activity);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("scroll", activity, true);
    document.addEventListener("visibilitychange", activity);
    return () => {
      disposed = true;
      window.removeEventListener("focus", activity);
      window.removeEventListener("pageshow", activity);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity, true);
      document.removeEventListener("visibilitychange", activity);
    };
  }, []);

  return null;
}
