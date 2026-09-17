/**
 * Full-screen overlay while fan-out emails are sending.
 * Shows a determinate progress bar that advances per email, then a brief “done” state.
 */

"use client";

import { createPortal } from "react-dom";

import { LoadingSpinner } from "@/components/ui/loading";
import type { EmailSendProgress } from "@/lib/ui/post-with-email-progress";

export function EmailSendProgressOverlay({
  active,
  progress,
  complete = false,
}: {
  active: boolean;
  progress: EmailSendProgress | null;
  complete?: boolean;
}) {
  if (!active || typeof document === "undefined") {
    return null;
  }

  const total = progress?.total ?? 0;
  const attempted = progress ? progress.sent + progress.failed : 0;
  const percent =
    total > 0 ? Math.min(100, Math.round((attempted / total) * 100)) : complete ? 100 : 0;

  let title = "Sending emails…";
  let description = "Please wait while we deliver this message.";

  if (complete) {
    title = "All emails sent";
    description =
      total > 0
        ? `${attempted} of ${total} delivered.`
        : "Your message has been delivered.";
  } else if (total > 0) {
    title = `Sending ${attempted} of ${total} emails`;
    description = "Progress updates as each email goes out.";
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="status"
        aria-live="polite"
        aria-busy={!complete}
        className="w-full max-w-md rounded-[28px] border border-border bg-surface px-6 py-10 text-center shadow-[var(--shadow-md)]"
      >
        {complete ? (
          <div
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
            aria-hidden
          >
            ✓
          </div>
        ) : (
          <LoadingSpinner size="lg" className="mx-auto" />
        )}

        <div className="mt-4 space-y-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>

        <div className="mt-6 space-y-2 text-left">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Email send progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-center text-xs font-medium text-foreground-subtle">
            {total > 0 ? `${percent}%` : complete ? "Done" : "Preparing…"}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
