import { AuditLogsView } from "@/components/admin/audit-logs-view";
import {
  getAuditLogFilterOptions,
  listAuditLogs,
  parseAuditLogListFilters,
} from "@/lib/admin/audit-logs";

type AdminAuditLogsPageProps = {
  searchParams: Promise<{
    search?: string;
    entityType?: string;
    actorRole?: string;
    action?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AdminAuditLogsPage({
  searchParams,
}: AdminAuditLogsPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const initialResult = await listAuditLogs(parseAuditLogListFilters(query));
  const filterOptions = await getAuditLogFilterOptions();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="text-sm text-foreground-muted">
          View and export platform audit events. Filter by category, actor role,
          action, and date range.
        </p>
      </div>

      <AuditLogsView
        initialResult={initialResult}
        filterOptions={filterOptions}
      />
    </div>
  );
}
