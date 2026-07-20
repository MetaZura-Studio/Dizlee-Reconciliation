import type { DashboardPeriod } from "@/lib/dizlee/dashboard";

export type ActivityFilters = {
  month: number;
  year: number;
  opcoId?: string;
  partnerId?: string;
};

export type ActivityEventType =
  | "INTIMATION_SENT"
  | "REPORT_REMINDER_SENT"
  | "REPORT_RECEIVED"
  | "REUPLOAD_REQUESTED"
  | "REUPLOAD_DECIDED"
  | "RECONCILIATION_RUN"
  | "CONSOLIDATION_GENERATED"
  | "INVOICE_SENT"
  | "INVOICE_ACKNOWLEDGED"
  | "INVOICE_PAID";

export type ActivityLane = {
  opcoId: string;
  opcoName: string;
  partnerId: string;
  partnerName: string;
};

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  occurredAt: string;
  title: string;
  summary: string;
  lane?: ActivityLane;
  href?: string;
  meta?: Record<string, string | number | null>;
};

export type ActivityTimelineResult = {
  period: DashboardPeriod;
  scope: {
    opcoId?: string;
    opcoName?: string;
    partnerId?: string;
    partnerName?: string;
  };
  events: ActivityEvent[];
  filters: ActivityFilters;
  requiresEntity: boolean;
};
