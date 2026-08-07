/**
 * Top-of-viewport navigation progress indicator for App Router client transitions.
 */

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/ui/classes";

export const NAVIGATION_START_EVENT = "dizlee:navigation-start";

/** Start the top progress bar for programmatic navigations (router.push, etc.). */
export function startNavigationProgress() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}

/**
 * Thin top progress bar during client-side navigations (Link / router.push).
 * Completes when pathname or search params change.
 */
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [completing, setCompleting] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const previousRouteRef = useRef(routeKey);

  useEffect(() => {
    function begin() {
      setCompleting(false);
      setActive(true);
    }

    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) {
        return;
      }

      const nextKey = `${url.pathname}?${url.searchParams.toString()}`;
      const currentKey = `${window.location.pathname}?${window.location.search.slice(1)}`;
      if (nextKey === currentKey) {
        return;
      }

      begin();
    }

    document.addEventListener("click", onDocumentClick);
    window.addEventListener(NAVIGATION_START_EVENT, begin);

    return () => {
      document.removeEventListener("click", onDocumentClick);
      window.removeEventListener(NAVIGATION_START_EVENT, begin);
    };
  }, []);

  useEffect(() => {
    if (previousRouteRef.current === routeKey) {
      return;
    }
    previousRouteRef.current = routeKey;

    let finishTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      setCompleting(true);
      finishTimer = window.setTimeout(() => {
        setActive(false);
        setCompleting(false);
      }, 220);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      if (finishTimer !== undefined) {
        window.clearTimeout(finishTimer);
      }
    };
  }, [routeKey]);

  if (!active && !completing) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-1 overflow-hidden"
      role="progressbar"
      aria-label="Page loading"
      aria-busy="true"
    >
      <div
        className={cn(
          "h-full rounded-r-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]",
          completing
            ? "w-full transition-[width] duration-200 ease-out"
            : "w-2/5 animate-pulse",
        )}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
