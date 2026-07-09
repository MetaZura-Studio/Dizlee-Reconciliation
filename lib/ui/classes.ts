/** Shared UI class strings — presentation only, no logic. */

export const ui = {
  page: "min-h-screen bg-canvas text-foreground antialiased",
  card: "rounded-lg border border-border bg-surface shadow-sm",
  cardPadding: "rounded-lg border border-border bg-surface p-4 shadow-sm",
  cardPaddingLg: "rounded-lg border border-border bg-surface p-5 shadow-sm",
  input:
    "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-primary focus:ring-2 focus:ring-primary/20",
  select:
    "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20",
  btnPrimary:
    "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60",
  btnSecondary:
    "rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted disabled:opacity-60",
  btnDanger:
    "rounded-md border border-danger-border bg-surface px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-muted disabled:opacity-60",
  btnGhost:
    "rounded-md px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground",
  navItem:
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground",
  navItemActive:
    "flex items-center gap-3 rounded-md bg-primary-muted px-3 py-2 text-sm font-medium text-primary",
  navItemSimple:
    "block rounded-md px-2 py-1.5 text-sm text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground",
  navItemSimpleActive:
    "block rounded-md bg-primary-muted px-2 py-1.5 text-sm font-medium text-primary",
  sidebar: "flex shrink-0 flex-col border-r border-border bg-surface-muted",
  header: "border-b border-border bg-surface",
  tableWrap: "overflow-hidden rounded-lg border border-border bg-surface",
  tableHead: "border-b border-border bg-surface-muted text-foreground-subtle",
  alertSuccess:
    "rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success",
  alertError:
    "rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger",
  alertWarning:
    "rounded-md border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning",
  badge:
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  unreadRow: "bg-accent-muted/60",
  logoChip:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground",
  logoChipSm:
    "flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground",
  authCard: "w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-sm",
  modal:
    "w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-lg",
  dropdown:
    "absolute z-20 mt-2 rounded-md border border-border bg-surface py-1 shadow-lg",
  label: "text-sm font-medium text-foreground-muted",
  hint: "text-xs text-foreground-subtle",
  pageTitle: "text-2xl font-semibold tracking-tight text-foreground",
  pageSubtitle: "text-sm text-foreground-muted",
} as const;

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
