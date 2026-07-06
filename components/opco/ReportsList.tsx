"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { RequestChangeDialog } from "@/components/opco/RequestChangeDialog";
import { formatPeriodLabel } from "@/lib/opco/period";
import type { OpcoReportListItem } from "@/lib/opco/queries/reports";

const REQUESTABLE_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

function canRequestChange(report: OpcoReportListItem): boolean {
  return (
    REQUESTABLE_STATUSES.has(report.statusCode) && !report.hasPendingChangeRequest
  );
}

export function ReportsList() {
  const [reports, setReports] = useState<OpcoReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<OpcoReportListItem | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/opco/reports");
      const payload = (await response.json()) as {
        error?: string;
        reports?: OpcoReportListItem[];
      };

      if (!response.ok) {
        setError(payload.error ?? "Failed to load reports");
        return;
      }

      setReports(payload.reports ?? []);
    } catch {
      setError("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function handleRequestSuccess() {
    setSuccessMessage("Reupload request submitted. Dizlee has been notified.");
    void loadReports();
  }

  if (isLoading) {
    return <p className="text-sm text-zinc-600">Loading reports...</p>;
  }

  if (error) {
    return (
      <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error}
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        <p>No reports uploaded yet.</p>
        <Link href="/opco/upload" className="mt-2 inline-block text-zinc-900 underline">
          Upload your first report
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Partner</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-3 text-zinc-900">{report.partnerName}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatPeriodLabel(report.year, report.month)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                    {report.statusLabel}
                  </span>
                  {report.hasPendingChangeRequest ? (
                    <p className="mt-1 text-xs text-amber-700">Reupload pending review</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {new Date(report.uploadedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {canRequestChange(report) ? (
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Request reupload
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReport ? (
        <RequestChangeDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSuccess={handleRequestSuccess}
        />
      ) : null}
    </div>
  );
}
