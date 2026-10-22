/**
 * Client-safe Partner RS retention option types (no Prisma / server-only imports).
 */

export const PARTNER_RS_RETENTION_5_PERCENT = 5;
export const PARTNER_RS_RETENTION_10_PERCENT = 10;

/** Which retention lines to include on the Partner RS PDF (and net calc). */
export type PartnerRsRetentionOptions = {
  includeRetention5: boolean;
  includeRetention10: boolean;
};

export const DEFAULT_PARTNER_RS_RETENTION_OPTIONS: PartnerRsRetentionOptions = {
  includeRetention5: true,
  includeRetention10: true,
};

export function parsePartnerRsRetentionOptions(
  raw: unknown,
): PartnerRsRetentionOptions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PARTNER_RS_RETENTION_OPTIONS };
  }
  const body = raw as Record<string, unknown>;
  return {
    includeRetention5:
      typeof body.includeRetention5 === "boolean"
        ? body.includeRetention5
        : DEFAULT_PARTNER_RS_RETENTION_OPTIONS.includeRetention5,
    includeRetention10:
      typeof body.includeRetention10 === "boolean"
        ? body.includeRetention10
        : DEFAULT_PARTNER_RS_RETENTION_OPTIONS.includeRetention10,
  };
}
