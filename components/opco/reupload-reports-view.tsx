/**
 * OpCo reupload workflow for the monthly raw multi-partner Excel file.
 */

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SubmissionRequestChangeDialog } from "@/components/opco/submission-request-change-dialog";
import { SubmissionReuploadDialog } from "@/components/opco/submission-reupload-dialog";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import { ReportRawFilePreviewModal } from "@/components/shared/report-raw-file-preview-modal";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { IconButton } from "@/components/ui/icon-button";
import { IconRefresh, IconUpload } from "@/components/ui/icons";
import { ListPagination } from "@/components/ui/list-pagination";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { formatAppError } from "@/lib/errors/format";
import type { OpcoSubmissionListItem } from "@/lib/opco/queries/submissions";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import { opcoSubmissionRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";
import { reportStatusTone } from "@/lib/ui/status-tones";

type ReuploadReportsViewProps = {
  items: OpcoSubmissionListItem[];
  preferredSheetName?: string | null;
};

type RawPreviewState = {
  submissionId: string;
  filename: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  rawRows: string[][];
  sheetName: string | null;
  truncated: boolean;
  totalRows: number | null;
};

type SortField = "period" | "status" | "filename";

function displayStatusLabel(row: OpcoSubmissionListItem): string {
  if (row.hasPendingChangeRequest) {
    return "Request submitted";
  }
  if (row.canReupload) {
    return "Request accepted";
  }
  return row.statusLabel;
}

function compareSubmissions(
  a: OpcoSubmissionListItem,
  b: OpcoSubmissionListItem,
  sortBy: SortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "status":
      return (
        (displayStatusLabel(a).localeCompare(displayStatusLabel(b)) ||
          a.year * 12 +
            a.month -
            (b.year * 12 + b.month) ||
          a.id.localeCompare(b.id)) *
        dir
      );
    case "filename":
      return (
        ((a.filename ?? "").localeCompare(b.filename ?? "") ||
          a.year * 12 +
            a.month -
            (b.year * 12 + b.month) ||
          a.id.localeCompare(b.id)) *
        dir
      );
    case "period":
    default:
      return (
        (a.year * 12 + a.month - (b.year * 12 + b.month) ||
          a.id.localeCompare(b.id)) * dir
      );
  }
}

export function ReuploadReportsView({
  items,
  preferredSheetName = null,
}: ReuploadReportsViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [reuploadSubmission, setReuploadSubmission] =
    useState<OpcoSubmissionListItem | null>(null);
  const [changeRequestSubmission, setChangeRequestSubmission] =
    useState<OpcoSubmissionListItem | null>(null);
  const [rawPreview, setRawPreview] = useState<RawPreviewState | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("period");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => compareSubmissions(a, b, sortBy, sortDir)),
    [items, sortBy, sortDir],
  );

  const paged = useMemo(() => paginateItems(sorted, page), [sorted, page]);

  const applySort = (field: SortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setPage(1);
  };

  function handleReuploadSuccess() {
    setReuploadSubmission(null);
    toast.success("Corrected monthly report uploaded successfully.");
    router.refresh();
  }

  function handleRequestSuccess() {
    setChangeRequestSubmission(null);
    toast.success("Reupload request submitted. Dizlee has been notified.");
    router.refresh();
  }

  async function openRawFilePreview(submission: OpcoSubmissionListItem) {
    if (!submission.filename) {
      return;
    }

    setRawPreview({
      submissionId: submission.id,
      filename: submission.filename,
      subtitle: `Monthly report — ${submission.periodLabel}`,
      loading: true,
      error: null,
      rawRows: [],
      sheetName: null,
      truncated: false,
      totalRows: null,
    });

    try {
      const response = await fetch(
        opcoSubmissionRawFilePreviewUrl(submission.id),
      );
      if (!response.ok) {
        let message = "Failed to load the original uploaded file";
        try {
          const payload = (await response.json()) as {
            error?: string;
            message?: string;
          };
          message = formatAppError(payload, message);
        } catch {
          // keep default
        }
        setRawPreview((current) =>
          current ? { ...current, loading: false, error: message } : current,
        );
        return;
      }

      const buffer = await response.arrayBuffer();
      const preview = await readRawExcelSheetPreview(
        buffer,
        preferredSheetName,
      );
      setRawPreview((current) =>
        current
          ? {
              ...current,
              loading: false,
              error: null,
              rawRows: preview.rows,
              sheetName: preview.sheetName,
              truncated: preview.truncated,
              totalRows: preview.totalRows,
            }
          : current,
      );
    } catch {
      setRawPreview((current) =>
        current
          ? {
              ...current,
              loading: false,
              error: "Could not read the original uploaded Excel file.",
            }
          : current,
      );
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <DataTableFrame>
          <DataTable>
            <DataTableHead>
              <tr>
                <SortableDataTableTh
                  label="Period"
                  active={sortBy === "period"}
                  direction={sortDir}
                  onSort={() => applySort("period")}
                  align="center"
                />
                <SortableDataTableTh
                  label="Status"
                  active={sortBy === "status"}
                  direction={sortDir}
                  onSort={() => applySort("status")}
                  align="center"
                />
                <SortableDataTableTh
                  label="Raw file"
                  active={sortBy === "filename"}
                  direction={sortDir}
                  onSort={() => applySort("filename")}
                />
                <DataTableTh align="center">Actions</DataTableTh>
              </tr>
            </DataTableHead>
            <tbody>
              {paged.items.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableTd
                    className="font-medium text-foreground"
                    align="center"
                  >
                    {row.periodLabel}
                  </DataTableTd>
                  <DataTableTd align="center">
                    {row.hasPendingChangeRequest ? (
                      <StatusPill tone={reportStatusTone("PENDING")}>
                        Request submitted
                      </StatusPill>
                    ) : row.canReupload ? (
                      <StatusPill tone={reportStatusTone("APPROVED")}>
                        Request accepted
                      </StatusPill>
                    ) : (
                      <StatusPill tone={reportStatusTone(row.statusCode)}>
                        {row.statusLabel}
                      </StatusPill>
                    )}
                  </DataTableTd>
                  <DataTableTd className="text-foreground-muted">
                    <ReportFilenameLink
                      filename={row.filename}
                      onClick={
                        row.filename
                          ? () => {
                              void openRawFilePreview(row);
                            }
                          : undefined
                      }
                    />
                  </DataTableTd>
                  <DataTableTd align="center">
                    <div className="flex justify-center gap-2">
                      {row.canRequestReupload ? (
                        <IconButton
                          label="Request reupload"
                          onClick={() => setChangeRequestSubmission(row)}
                        >
                          <IconRefresh />
                        </IconButton>
                      ) : null}
                      {row.canReupload ? (
                        <IconButton
                          label="Reupload corrected monthly file"
                          variant="primary"
                          onClick={() => setReuploadSubmission(row)}
                        >
                          <IconUpload />
                        </IconButton>
                      ) : null}
                      {row.hasPendingChangeRequest && !row.canReupload ? (
                        <IconButton
                          label="Awaiting Dizlee approval"
                          disabled
                        >
                          <IconUpload />
                        </IconButton>
                      ) : null}
                    </div>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableFrame>

        <ListPagination
          total={paged.total}
          page={paged.page}
          totalPages={paged.totalPages}
          noun="submission"
          onPageChange={setPage}
        />
      </div>

      {reuploadSubmission ? (
        <SubmissionReuploadDialog
          submission={reuploadSubmission}
          preferredSheetName={preferredSheetName}
          onClose={() => setReuploadSubmission(null)}
          onSuccess={handleReuploadSuccess}
        />
      ) : null}

      {changeRequestSubmission ? (
        <SubmissionRequestChangeDialog
          submission={changeRequestSubmission}
          onClose={() => setChangeRequestSubmission(null)}
          onSuccess={handleRequestSuccess}
        />
      ) : null}

      {rawPreview ? (
        <ReportRawFilePreviewModal
          filename={rawPreview.filename}
          subtitle={rawPreview.subtitle}
          downloadHref={opcoSubmissionRawFilePreviewUrl(rawPreview.submissionId)}
          loading={rawPreview.loading}
          error={rawPreview.error}
          rawRows={rawPreview.rawRows}
          sheetName={rawPreview.sheetName}
          truncated={rawPreview.truncated}
          totalRows={rawPreview.totalRows}
          onClose={() => setRawPreview(null)}
        />
      ) : null}
    </div>
  );
}
