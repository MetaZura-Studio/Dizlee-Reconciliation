/** Shared UI class strings — presentation only, no logic. */

export const ui = {
  page: "min-h-screen bg-canvas text-foreground antialiased",
  pageCard:
    "rounded-[28px] border border-border bg-surface p-6 shadow-[var(--shadow-md)] sm:p-8",
  card: "rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]",
  cardPadding:
    "rounded-[28px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5",
  cardPaddingLg:
    "rounded-[28px] border border-border bg-surface p-5 shadow-[var(--shadow-md)] sm:p-6",
  input:
    "h-11 w-full rounded-2xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  select:
    "h-11 w-full rounded-2xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  btnPrimary:
    "inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  btnSecondary:
    "inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  btnDanger:
    "inline-flex h-10 items-center justify-center rounded-2xl border border-danger-border bg-surface px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  btnDangerSolid:
    "inline-flex h-10 items-center justify-center rounded-2xl bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:opacity-60",
  btnGhost:
    "inline-flex h-10 items-center justify-center rounded-2xl px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
  iconButton:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  iconButtonPrimary:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  iconButtonDanger:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-danger-border bg-surface text-danger shadow-[var(--shadow-sm)] transition-colors hover:bg-danger-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  modalCloseButton:
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
  navItem:
    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground",
  navItemActive:
    "flex items-center gap-3 rounded-2xl bg-primary-muted px-3 py-2.5 text-sm font-semibold text-primary",
  navItemSimple:
    "block rounded-2xl px-2 py-1.5 text-sm text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground",
  navItemSimpleActive:
    "block rounded-2xl bg-primary-muted px-2 py-1.5 text-sm font-semibold text-primary",
  sidebar:
    "flex shrink-0 flex-col rounded-[32px] border border-border bg-white/80 shadow-[var(--shadow-md)] backdrop-blur-md",
  header:
    "rounded-[28px] border border-border bg-white/80 shadow-[var(--shadow-sm)] backdrop-blur-md",
  tableWrap:
    "overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]",
  table: "w-full border-separate border-spacing-0 text-sm",
  tableHead:
    "bg-surface-muted text-left text-xs font-semibold tracking-wide text-foreground-muted",
  tableHeadCell: "px-4 py-3.5",
  tableCell: "border-t border-border px-4 py-3.5",
  tableRowHover: "hover:bg-surface-muted/50",
  alertSuccess:
    "rounded-2xl border border-success-border bg-success-muted px-3 py-2 text-sm text-success",
  alertError:
    "rounded-2xl border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger",
  alertWarning:
    "rounded-2xl border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning",
  badge:
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
  unreadRow: "bg-primary-muted/60",
  logoChip:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)]",
  logoChipSm:
    "flex h-8 w-8 items-center justify-center rounded-2xl bg-primary text-xs font-semibold text-primary-foreground",
  authCard:
    "w-full max-w-md space-y-6 rounded-[28px] border border-border bg-surface p-8 shadow-[var(--shadow-md)]",
  modal:
    "w-full max-w-lg rounded-[28px] border border-border bg-surface p-6 shadow-[var(--shadow-md)]",
  dropdown:
    "absolute right-0 z-50 mt-2 min-w-[12rem] rounded-2xl border border-border bg-surface py-1 shadow-[var(--shadow-md)]",
  label: "mb-1.5 block text-xs font-semibold tracking-wide text-foreground-muted",
  hint: "text-xs text-foreground-subtle",
  pageTitle: "text-xl font-semibold tracking-tight text-foreground sm:text-2xl",
  pageSubtitle: "mt-1 text-sm text-foreground-muted",
  filterToolbar:
    "flex flex-wrap items-end gap-3 rounded-[24px] border border-border bg-surface-muted/60 p-4",
  emptyState:
    "rounded-3xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center",
} as const;

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
