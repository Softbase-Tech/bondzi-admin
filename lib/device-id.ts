/**
 * Stable per-browser device identifier. Backend v2 enforces device-scoped
 * sessions (`X-Device-ID` or body `deviceId`) and needs the same value on
 * every login from this browser — otherwise the admin keeps rotating
 * devices and loses their session after each fresh login.
 *
 * Stored in localStorage (not a cookie — the signed-in session cookie is
 * already scoped per browser; this just identifies the browser itself).
 */
const STORAGE_KEY = "bondzi.admin.deviceId";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, next);
  return next;
}
