/**
 * OpCo reupload workflow for the monthly raw multi-partner Excel file.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
} from "@/components/ui/data-table";
import { IconButton } from "@/components/ui/icon-button";
import { IconRefresh, IconUpload } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import type { OpcoSubmissionListItem } from "@/lib/opco/queries/submissions";
import { readRawExcelSheetPreview } from "@/lib/platform/excel/read-raw-sheet";
import { opcoSubmissionRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
import { reportStatusTone } from "@/lib/ui/status-tones";
import { formatAppError } from "@/lib/errors/format";

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
      <DataTableFrame>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableTh align="center">Period</DataTableTh>
                <DataTableTh align="center">Status</DataTableTh>
                <DataTableTh>Raw file</DataTableTh>
                <DataTableTh align="center">Actions</DataTableTh>
              </tr>
            </DataTableHead>
            <tbody>
              {items.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableTd className="font-medium text-foreground" align="center">
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
