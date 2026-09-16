/**
 * Line-level reconciliation outcome for one run, including variances and confirm step.
 * Used to validate matches before finalizing a reconciliation.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import { DeliveryChannelPicker } from "@/components/shared/delivery-channel-picker";
import {
  attachmentFileIds,
  NotificationAttachmentPicker,
  type PendingAttachment,
} from "@/components/shared/notification-attachment-picker";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { FieldLegend } from "@/components/ui/field";
import { ListPagination } from "@/components/ui/list-pagination";
import { FullPageLoading } from "@/components/ui/loading";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { StatCard } from "@/components/ui/stat-card";
import { SuccessDialog } from "@/components/ui/success-dialog";
import {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  type NotificationDeliveryChannel,
} from "@/lib/dizlee/notifications/broadcast.shared";
import type { ReconciliationAlertTemplates } from "@/lib/dizlee/notifications/reconciliation-alerts";
import type {
  ReconciliationDetail,
  ReconciliationItemView,
} from "@/lib/dizlee/reconciliation";
import { reportRawFilePreviewUrl } from "@/lib/platform/reports/preview-url";
import { formatUsd } from "@/lib/platform/format-money";
import { formatAppDateTime, formatAppMonthYear } from "@/lib/platform/format-datetime";
import { formatAppError } from "@/lib/errors/format";
import { paginateItems } from "@/lib/ui/list-pagination";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type ItemSortField =
  | "service"
  | "opcoAmount"
  | "partnerAmount"
  | "variance"
  | "confirmed"
  | "status";

function isMatchedStatus(status: string): boolean {
  return status.replaceAll(" ", "_").toUpperCase() === "MATCHED";
}

function rowToneClass(status: string): string {
  return isMatchedStatus(status)
    ? "bg-success-muted text-success"
    : "bg-danger-muted text-danger";
}

function statusBadgeClass(status: string): string {
  return isMatchedStatus(status)
    ? "rounded-full bg-success-muted px-2 py-0.5 text-xs font-medium text-success"
    : "rounded-full bg-danger-muted px-2 py-0.5 text-xs font-medium text-danger";
}

function itemServiceLabel(item: ReconciliationItemView): string {
  return item.description ?? item.serviceCode;
}

function compareItems(
  a: ReconciliationItemView,
  b: ReconciliationItemView,
  sortBy: ItemSortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "opcoAmount":
      return ((a.opcoAmount ?? 0) - (b.opcoAmount ?? 0)) * dir;
    case "partnerAmount":
      return ((a.partnerAmount ?? 0) - (b.partnerAmount ?? 0)) * dir;
    case "variance":
      return ((a.varianceAmount ?? 0) - (b.varianceAmount ?? 0)) * dir;
    case "confirmed":
      return ((a.confirmedValue ?? 0) - (b.confirmedValue ?? 0)) * dir;
    case "status":
      return a.matchStatus.localeCompare(b.matchStatus) * dir;
    case "service":
    default:
      return itemServiceLabel(a).localeCompare(itemServiceLabel(b)) * dir;
  }
}

type ReconciliationResultViewProps = {
  initialDetail: ReconciliationDetail;
  initialAlertTemplates: ReconciliationAlertTemplates;
};

export function ReconciliationResultView({
  initialDetail,
  initialAlertTemplates,
}: ReconciliationResultViewProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [confirming, setConfirming] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSuccessOpen, setConfirmSuccessOpen] = useState(false);
  const [confirmSuccessMessage, setConfirmSuccessMessage] = useState(
    "Reconciliation confirmed.",
  );
  const [alertOpen, setAlertOpen] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alertSuccessOpen, setAlertSuccessOpen] = useState(false);
  const [alertSuccessMessage, setAlertSuccessMessage] = useState(
    "Alert sent successfully.",
  );
  const [opcoSubject, setOpcoSubject] = useState(
    initialAlertTemplates.opco.subject,
  );
  const [opcoBody, setOpcoBody] = useState(initialAlertTemplates.opco.body);
  const [partnerSubject, setPartnerSubject] = useState(
    initialAlertTemplates.partner.subject,
  );
  const [partnerBody, setPartnerBody] = useState(
    initialAlertTemplates.partner.body,
  );
  const [alertAttachments, setAlertAttachments] = useState<PendingAttachment[]>(
    [],
  );
  const [deliveryChannel, setDeliveryChannel] =
    useState<NotificationDeliveryChannel>(DEFAULT_NOTIFICATION_DELIVERY_CHANNEL);
  const [alertTarget, setAlertTarget] = useState<"opco" | "partner" | "both">(
    "both",
  );
  const [sortBy, setSortBy] = useState<ItemSortField>("service");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [itemPage, setItemPage] = useState(1);

  const sortedItems = useMemo(
    () =>
      [...detail.items].sort((a, b) => compareItems(a, b, sortBy, sortDir)),
    [detail.items, sortBy, sortDir],
  );
  const pagedItems = useMemo(
    () => paginateItems(sortedItems, itemPage),
    [itemPage, sortedItems],
  );

  function applySort(field: ItemSortField) {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setItemPage(1);
  }

  async function confirmReconciliation() {
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/${detail.id}/confirm`,
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to confirm reconciliation"));
      }
      setDetail((current) => ({
        ...current,
        status: "COMPLETED",
        statusCode: "COMPLETED",
        canConfirm: false,
        canAlert: false,
        canRerun: false,
      }));
      setConfirmSuccessMessage(
        (payload.data?.message as string | undefined) ??
          "Reconciliation confirmed.",
      );
      setConfirmSuccessOpen(true);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Failed to confirm reconciliation",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function rerunReconciliation() {
    setRerunning(true);
    setError(null);
    try {
      const response = await fetch("/api/dizlee/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: detail.period.month,
          year: detail.period.year,
          opcoId: detail.opcoId,
          partnerId: detail.partnerId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to re-run reconciliation"));
      }
      const nextId = payload.data?.id as number | undefined;
      if (nextId != null && nextId !== detail.id) {
        router.push(`/dizlee/reconciliation/${nextId}`);
        return;
      }
      router.refresh();
    } catch (rerunError) {
      setError(
        rerunError instanceof Error
          ? rerunError.message
          : "Failed to re-run reconciliation",
      );
    } finally {
      setRerunning(false);
    }
  }

  function goToHistory() {
    setConfirmSuccessOpen(false);
    router.push("/dizlee/reconciliation?tab=history");
  }

  function openAlertModal() {
    setOpcoSubject(initialAlertTemplates.opco.subject);
    setOpcoBody(initialAlertTemplates.opco.body);
    setPartnerSubject(initialAlertTemplates.partner.subject);
    setPartnerBody(initialAlertTemplates.partner.body);
    setAlertAttachments([]);
    setDeliveryChannel(DEFAULT_NOTIFICATION_DELIVERY_CHANNEL);
    setAlertTarget("both");
    setAlertOpen(true);
  }

  async function sendAlert(audience: "opco" | "partner" | "both") {
    setAlerting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dizlee/reconciliation/${detail.id}/alert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience,
            opcoSubject,
            opcoBody,
            partnerSubject,
            partnerBody,
            deliveryChannel,
            attachmentFileIds: attachmentFileIds(alertAttachments),
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(payload, "Failed to send alert"));
      }
      if (payload.data?.detail) {
        setDetail(payload.data.detail as ReconciliationDetail);
      } else {
        // Fallback if detail missing: at least clear alert gate after success.
        setDetail((current) => ({
          ...current,
          alertedAt: current.alertedAt ?? new Date().toISOString(),
          canAlert: current.unmatchedCount > 0,
          canRerun: false,
        }));
      }
      setAlertSuccessMessage(
        (payload.data?.message as string | undefined) ??
          "Alert sent successfully.",
      );
      setAlertOpen(false);
      setAlertAttachments([]);
      setAlertSuccessOpen(true);
    } catch (alertError) {
      setError(
        alertError instanceof Error ? alertError.message : "Failed to send alert",
      );
    } finally {
      setAlerting(false);
    }
  }

  return (
    <div className="space-y-6">
      {alerting ? (
        <FullPageLoading
          label="Sending…"
          description="Please wait while we deliver this message."
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-muted">
            <Link
              href="/dizlee/reconciliation?tab=history"
              className="underline hover:text-foreground"
            >
              ← Back to reconciliation history
            </Link>
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {detail.opcoName} / {detail.partnerName}
          </h1>
          <p className="mt-1 text-sm text-foreground-subtle">
            {formatAppMonthYear(detail.period.month, detail.period.year)} ·{" "}
            {detail.status}
          </p>
          <p className="mt-1 text-xs text-foreground-subtle">
            OpCo file:{" "}
            <ReportFilenameLink
              filename={detail.opcoReportFilename}
              href={reportRawFilePreviewUrl("dizlee", detail.opcoReportId)}
            />{" "}
            · Partner file:{" "}
            <ReportFilenameLink
              filename={detail.partnerReportFilename}
              href={reportRawFilePreviewUrl("dizlee", detail.partnerReportId)}
            />
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-muted p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Matched"
          value={
            <span className="text-success">{detail.matchedCount}</span>
          }
          tone="teal"
        />
        <StatCard
          label="Unmatched"
          value={
            <span className="text-danger">{detail.unmatchedCount}</span>
          }
          tone="amber"
        />
        <StatCard
          label="Total variance"
          value={formatUsd(detail.totalVariance)}
          tone="purple"
        />
        <StatCard
          label="Tolerance"
          value={`${detail.tolerancePercent}%`}
          tone="blue"
        />
      </div>

      {detail.statusCode === "IN_PROGRESS" ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="primary"
            disabled={!detail.canConfirm || confirming || rerunning || alerting}
            title={
              detail.canConfirm
                ? undefined
                : "Resolve all mismatches before confirming"
            }
            onClick={() => void confirmReconciliation()}
          >
            {confirming ? "Confirming…" : "Confirm reconciliation"}
          </Button>
          <Button
            variant="secondary"
            disabled={!detail.canRerun || confirming || rerunning || alerting}
            title={
              detail.canRerun
                ? undefined
                : detail.alertedAt
                  ? "Wait for OpCo or Partner to resubmit a newer report"
                  : "Alert first, then wait for OpCo or Partner to resubmit"
            }
            onClick={() => void rerunReconciliation()}
          >
            {rerunning ? "Re-running…" : "Re-run"}
          </Button>
          <Button
            variant="danger"
            disabled={!detail.canAlert || confirming || rerunning || alerting}
            title={
              detail.canAlert
                ? undefined
                : "Only available when there are mismatches"
            }
            onClick={openAlertModal}
          >
            Alert OpCo / Partner
          </Button>
        </div>
      ) : null}

      <div className="space-y-4">
        <DataTableFrame>
          <DataTable>
            <DataTableHead>
              <tr>
                <SortableDataTableTh
                  label="Service"
                  active={sortBy === "service"}
                  direction={sortDir}
                  onSort={() => applySort("service")}
                />
                <SortableDataTableTh
                  label="OpCo (USD)"
                  active={sortBy === "opcoAmount"}
                  direction={sortDir}
                  onSort={() => applySort("opcoAmount")}
                  align="right"
                />
                <SortableDataTableTh
                  label="Partner (USD)"
                  active={sortBy === "partnerAmount"}
                  direction={sortDir}
                  onSort={() => applySort("partnerAmount")}
                  align="right"
                />
                <SortableDataTableTh
                  label="Variance"
                  active={sortBy === "variance"}
                  direction={sortDir}
                  onSort={() => applySort("variance")}
                  align="right"
                />
                <SortableDataTableTh
                  label="Confirmed"
                  active={sortBy === "confirmed"}
                  direction={sortDir}
                  onSort={() => applySort("confirmed")}
                  align="right"
                />
                <SortableDataTableTh
                  label="Status"
                  active={sortBy === "status"}
                  direction={sortDir}
                  onSort={() => applySort("status")}
                  align="center"
                />
              </tr>
            </DataTableHead>
            <tbody>
              {pagedItems.items.map((item) => (
                <DataTableRow
                  key={item.serviceCode}
                  className={rowToneClass(item.matchStatus)}
                >
                  <DataTableTd className="font-medium">
                    {itemServiceLabel(item)}
                  </DataTableTd>
                  <DataTableTd align="right">
                    {formatUsd(item.opcoAmount)}
                  </DataTableTd>
                  <DataTableTd align="right">
                    {formatUsd(item.partnerAmount)}
                  </DataTableTd>
                  <DataTableTd align="right">
                    {formatUsd(item.varianceAmount)}
                  </DataTableTd>
                  <DataTableTd align="right">
                    {formatUsd(item.confirmedValue)}
                  </DataTableTd>
                  <DataTableTd align="center">
                    <span className={statusBadgeClass(item.matchStatus)}>
                      {item.matchStatus}
                    </span>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        </DataTableFrame>

        <ListPagination
          total={pagedItems.total}
          page={pagedItems.page}
          totalPages={pagedItems.totalPages}
          noun="line"
          nounPlural="lines"
          onPageChange={setItemPage}
        />
      </div>

      <p className="text-xs text-foreground-subtle">
        Run at {formatAppDateTime(detail.runAt)}
      </p>

      {alertOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-border bg-surface p-6 shadow-[var(--shadow-md)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recon-alert-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="recon-alert-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Alert OpCo / Partner
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Messages load from Admin Email Templates (Alert). Choose delivery
                  method, then who to send to (OpCo, Partner, or Both).
                </p>
              </div>
              <ModalCloseButton onClick={() => setAlertOpen(false)} />
            </div>

            <div className="mt-4 space-y-5">
              <DeliveryChannelPicker
                name="reconAlertDeliveryChannel"
                value={deliveryChannel}
                onChange={setDeliveryChannel}
                disabled={alerting}
              />

              <section className="space-y-3 rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  OpCo — {detail.opcoName}
                </h3>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Subject</span>
                  <input
                    type="text"
                    value={opcoSubject}
                    onChange={(event) => setOpcoSubject(event.target.value)}
                    maxLength={255}
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Message</span>
                  <textarea
                    value={opcoBody}
                    onChange={(event) => setOpcoBody(event.target.value)}
                    rows={7}
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  />
                </label>
              </section>

              <section className="space-y-3 rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Partner — {detail.partnerName}
                </h3>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Subject</span>
                  <input
                    type="text"
                    value={partnerSubject}
                    onChange={(event) => setPartnerSubject(event.target.value)}
                    maxLength={255}
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-foreground-muted">Message</span>
                  <textarea
                    value={partnerBody}
                    onChange={(event) => setPartnerBody(event.target.value)}
                    rows={7}
                    className="mt-1 w-full rounded border border-border-strong px-3 py-2"
                  />
                </label>
              </section>

              <NotificationAttachmentPicker
                attachments={alertAttachments}
                onChange={setAlertAttachments}
                disabled={alerting}
              />

              <fieldset className="space-y-2">
                <FieldLegend required>Send to</FieldLegend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { value: "opco" as const, label: "OpCo" },
                      { value: "partner" as const, label: "Partner" },
                      { value: "both" as const, label: "Both" },
                    ] as const
                  ).map((option) => {
                    const selected = alertTarget === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border bg-surface px-3 py-2.5 text-sm font-medium shadow-[var(--shadow-sm)] transition-colors ${
                          selected
                            ? "border-primary text-foreground ring-2 ring-[var(--ring)]"
                            : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="reconAlertTarget"
                          value={option.value}
                          checked={selected}
                          onChange={() => setAlertTarget(option.value)}
                          disabled={alerting}
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  variant="secondary"
                  disabled={alerting}
                  onClick={() => setAlertOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="dangerSolid"
                  disabled={alerting}
                  onClick={() => void sendAlert(alertTarget)}
                >
                  {alerting ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SuccessDialog
        open={confirmSuccessOpen}
        title="Reconciliation confirmed"
        message={confirmSuccessMessage}
        actionLabel="Back to history"
        onAction={goToHistory}
      />

      <SuccessDialog
        open={alertSuccessOpen}
        title="Alert sent"
        message={alertSuccessMessage}
        actionLabel="Back to history"
        onAction={goToHistory}
      />
    </div>
  );
}
