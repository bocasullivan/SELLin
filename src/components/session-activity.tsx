"use client";

import { useEffect } from "react";
import { AUTH_SYNC_KEY } from "@/lib/auth-sync";

export function SessionActivity({ userEmail }: { userEmail: string }) {
  useEffect(() => {
    let lastRequest = 0;
    let pending = false;
    let disposed = false;

    async function touch(force = false) {
      if (
        document.visibilityState !== "visible" ||
        pending ||
        (!force && Date.now() - lastRequest < 60_000)
      )
        return;
      pending = true;
      try {
        const response = await fetch("/api/auth/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (response.status === 401 && !disposed) window.location.replace("/login");
        if (response.ok) {
          const result = await response.json();
          if (!disposed && result.userEmail !== userEmail) window.location.replace("/");
          lastRequest = Date.now();
        }
      } finally {
        pending = false;
      }
    }

    const activity = () => {
      void touch().catch(() => undefined);
    };
    const recheck = () => {
      void touch(true).catch(() => undefined);
    };
    const changed = () => {
      // Reload discards old account data, even if another tab already logged in again.
      window.location.replace("/");
    };
    const storage = (event: StorageEvent) => {
      if (event.key === AUTH_SYNC_KEY) changed();
    };
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(AUTH_SYNC_KEY) : null;
    if (channel) channel.onmessage = changed;
    window.addEventListener("storage", storage);
    activity();
    // No background heartbeat: an unattended tab must not extend the session forever.
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("scroll", activity, true);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      disposed = true;
      channel?.close();
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity, true);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [userEmail]);

  return null;
}
