// Only a notification is shared. Never store credentials or session tokens here.
export const AUTH_SYNC_KEY = "sellin:auth-change";

export function publishAuthChange() {
  try {
    localStorage.setItem(AUTH_SYNC_KEY, crypto.randomUUID());
  } catch {
    // Storage can be disabled; BroadcastChannel still works independently.
  }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(AUTH_SYNC_KEY);
    channel.postMessage("changed");
    channel.close();
  }
}
