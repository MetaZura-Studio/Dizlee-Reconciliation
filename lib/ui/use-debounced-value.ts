"use client";

/**
 * Debounced React state for search fields and filter inputs.
 *
 * Portal-agnostic client hook. Resets the timer on every `value` change; default
 * delay matches list search UX elsewhere in the app.
 */

import { useEffect, useState } from "react";

/** Returns `value` after it has stayed unchanged for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
