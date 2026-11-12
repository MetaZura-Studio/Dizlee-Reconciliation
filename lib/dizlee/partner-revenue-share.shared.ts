/**
 * Client-safe Partner RS retention option types (no Prisma / server-only imports).
 */

export type PartnerRsRetentionLineOptions = {
  enabled: boolean;
  percent: number;
};

/** Up to two optional retention lines on the Partner RS PDF (and net calc). */
export type PartnerRsRetentionOptions = {
  line1: PartnerRsRetentionLineOptions;
  line2: PartnerRsRetentionLineOptions;
  /**
   * Optional Admin-display conversion rate override for this send only
   * (same convention as Currencies / Partner RS PDF "Conversion rate").
   * When omitted, build uses the system monthly rate.
   */
  conversionRate?: number;
};

/** Defaults: 10% then 5% (cascading order = line1, then line2). */
export const DEFAULT_PARTNER_RS_RETENTION_OPTIONS: PartnerRsRetentionOptions = {
  line1: { enabled: true, percent: 10 },
  line2: { enabled: true, percent: 5 },
};

/** @deprecated Prefer DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line2.percent */
export const PARTNER_RS_RETENTION_5_PERCENT = 5;
/** @deprecated Prefer DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line1.percent */
export const PARTNER_RS_RETENTION_10_PERCENT = 10;

function clampRetentionPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value * 100) / 100;
  return Math.min(100, Math.max(0, rounded));
}

function parseRetentionLine(
  raw: unknown,
  fallback: PartnerRsRetentionLineOptions,
): PartnerRsRetentionLineOptions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...fallback };
  }
  const body = raw as Record<string, unknown>;
  const enabled =
    typeof body.enabled === "boolean" ? body.enabled : fallback.enabled;
  const percentRaw =
    typeof body.percent === "number"
      ? body.percent
      : typeof body.percent === "string"
        ? Number.parseFloat(body.percent)
        : fallback.percent;
  return {
    enabled,
    percent: clampRetentionPercent(
      Number.isFinite(percentRaw) ? percentRaw : fallback.percent,
    ),
  };
}

/** Positive finite conversion rate from request body, or undefined if absent. */
export function parsePartnerRsConversionRate(
  raw: unknown,
): number | undefined {
  if (raw == null || raw === "") {
    return undefined;
  }
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw.trim())
        : NaN;
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function parsePartnerRsRetentionOptions(
  raw: unknown,
): PartnerRsRetentionOptions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      line1: { ...DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line1 },
      line2: { ...DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line2 },
    };
  }
  const body = raw as Record<string, unknown>;
  const conversionRate = parsePartnerRsConversionRate(body.conversionRate);

  // New shape: { line1, line2 }
  if ("line1" in body || "line2" in body) {
    return {
      line1: parseRetentionLine(
        body.line1,
        DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line1,
      ),
      line2: parseRetentionLine(
        body.line2,
        DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line2,
      ),
      ...(conversionRate !== undefined ? { conversionRate } : {}),
    };
  }

  // Legacy shape: { includeRetention5, includeRetention10 } → apply 10% then 5%.
  if ("includeRetention5" in body || "includeRetention10" in body) {
    return {
      line1: {
        enabled:
          typeof body.includeRetention10 === "boolean"
            ? body.includeRetention10
            : DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line1.enabled,
        percent: PARTNER_RS_RETENTION_10_PERCENT,
      },
      line2: {
        enabled:
          typeof body.includeRetention5 === "boolean"
            ? body.includeRetention5
            : DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line2.enabled,
        percent: PARTNER_RS_RETENTION_5_PERCENT,
      },
      ...(conversionRate !== undefined ? { conversionRate } : {}),
    };
  }

  return {
    line1: { ...DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line1 },
    line2: { ...DEFAULT_PARTNER_RS_RETENTION_OPTIONS.line2 },
    ...(conversionRate !== undefined ? { conversionRate } : {}),
  };
}

/** Enabled retention percents in order (for PDF / DB / audit). */
export function enabledPartnerRsRetentionPercents(
  options: PartnerRsRetentionOptions,
): number[] {
  const percents: number[] = [];
  if (options.line1.enabled) {
    percents.push(clampRetentionPercent(options.line1.percent));
  }
  if (options.line2.enabled) {
    percents.push(clampRetentionPercent(options.line2.percent));
  }
  return percents;
}

/** Display label: "none" | "3%" | "5% + 10%". */
export function formatPartnerRsRetentionLabel(
  percents: number[] | PartnerRsRetentionOptions,
): string {
  const list = Array.isArray(percents)
    ? percents
    : enabledPartnerRsRetentionPercents(percents);
  if (list.length === 0) {
    return "none";
  }
  return list
    .map((percent) => {
      const rounded = clampRetentionPercent(percent);
      const text = Number.isInteger(rounded)
        ? String(rounded)
        : String(rounded);
      return `${text}%`;
    })
    .join(" + ");
}

export function serializePartnerRsRetentionPercentsJson(
  options: PartnerRsRetentionOptions,
): string {
  return JSON.stringify(enabledPartnerRsRetentionPercents(options));
}

export function parsePartnerRsRetentionPercentsJson(
  raw: string | null | undefined,
): number[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) =>
        typeof item === "number"
          ? item
          : typeof item === "string"
            ? Number.parseFloat(item)
            : NaN,
      )
      .filter((item) => Number.isFinite(item))
      .map(clampRetentionPercent);
  } catch {
    return [];
  }
}
