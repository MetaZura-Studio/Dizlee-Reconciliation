/**
 * Global toast stack: context provider, imperative `toast()` API, and portaled dismissible messages.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/ui/classes";

type ToastTone = "success" | "error";

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 3500;

let toastIdCounter = 0;

function nextToastId() {
  toastIdCounter += 1;
  return `toast-${toastIdCounter}`;
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const deadlineRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const armTimer = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      onDismiss(item.id);
    }, remainingRef.current);
    deadlineRef.current = performance.now() + remainingRef.current;
  };

  useEffect(() => {
    remainingRef.current = AUTO_DISMISS_MS;
    armTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per toast
  }, [item.id]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        clearTimer();
        remainingRef.current = Math.max(0, deadlineRef.current - performance.now());
      }}
      onMouseLeave={() => {
        armTimer();
      }}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-[var(--shadow-md)]",
        item.tone === "success"
          ? "border-success-border bg-success-muted text-success"
          : "border-danger-border bg-danger-muted text-danger",
      )}
    >
      <p className="min-w-0 flex-1 font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-current/70 transition-colors hover:bg-black/5 hover:text-current"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const isClient = useIsClient();

  if (!isClient || items.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed top-4 right-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:top-6 sm:right-6"
      aria-label="Status messages"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    const id = nextToastId();
    setItems((current) => [...current, { id, tone, message: trimmed }].slice(-4));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
