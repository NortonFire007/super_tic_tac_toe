"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readValue<T>(key: string, fallback: T, parse: (value: unknown) => T): T {
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = fallback;
  if (raw !== null) {
    try {
      value = parse(JSON.parse(raw));
    } catch {
      value = fallback;
    }
  }
  snapshots.set(key, { raw, value });
  return value;
}

/**
 * State mirrored to localStorage. Renders `fallback` on the server and during hydration,
 * then switches to the stored value, so it never causes a hydration mismatch.
 * `parse` must return a valid value for any input (corrupt data falls back).
 */
export function usePersistentState<T>(key: string, fallback: T, parse: (value: unknown) => T) {
  const value = useSyncExternalStore(
    subscribe,
    () => readValue(key, fallback, parse),
    () => fallback,
  );

  const setValue = useCallback(
    (update: (current: T) => T) => {
      const current = readValue(key, fallback, parse);
      const next = update(current);
      if (Object.is(next, current)) return;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage unavailable (private mode / quota): keep the in-memory value for this session.
        snapshots.set(key, { raw: readRaw(key), value: next });
      }
      notify();
    },
    [key, fallback, parse],
  );

  return [value, setValue] as const;
}
