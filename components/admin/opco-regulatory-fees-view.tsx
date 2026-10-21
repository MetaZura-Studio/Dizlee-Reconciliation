/**
 * Admin per-service regulatory fee % for one OpCo (from Service–Partner maps).
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  SortableDataTableTh,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterActions } from "@/components/ui/filter-actions";
import { IconButton } from "@/components/ui/icon-button";
import { IconPencil } from "@/components/ui/icons";
import { FilterToolbar, PageCard, PageHeader } from "@/components/ui/page";
import { ListPagination } from "@/components/ui/list-pagination";
import { LoadingOverlay } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";
import type {
  OpcoRegulatoryFeeRow,
  OpcoRegulatoryFeesPage,
} from "@/lib/admin/opco-regulatory-fees.shared";
import { formatAppError } from "@/lib/errors/format";
import { paginateItems } from "@/lib/ui/list-pagination";
import { cn, ui } from "@/lib/ui/classes";
import { nextSortState, type SortDirection } from "@/lib/ui/sort";

type SortField = "serviceName" | "partnerName" | "fee";

type OpcoRegulatoryFeesViewProps = {
  initialPage: OpcoRegulatoryFeesPage;
};

/** Digits + optional decimal (max 2 places). */
function sanitizeFeeInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) {
    return cleaned;
  }
  const whole = cleaned.slice(0, firstDot);
  const fraction = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${whole}.${fraction}`;
}

function parseFeeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return null;
  }
  return value;
}

function formatFeeDisplay(raw: string): string {
  const parsed = parseFeeInput(raw);
  if (parsed === null) {
    return raw;
  }
  return parsed.toFixed(2);
}

/** Compact fee control with room for a trailing %. */
const feeFieldClass = cn(
  ui.input.replace(/\bw-full\b/, "w-28"),
  "max-w-28 shrink-0 pr-9 text-left tabular-nums",
);

function compareRows(
  a: OpcoRegulatoryFeeRow,
  b: OpcoRegulatoryFeeRow,
  sortBy: SortField,
  sortDir: SortDirection,
): number {
  const dir = sortDir === "asc" ? 1 : -1;
  if (sortBy === "partnerName") {
    return a.partnerName.localeCompare(b.partnerName) * dir;
  }
  if (sortBy === "fee") {
    return (a.regulatoryFeePercent - b.regulatoryFeePercent) * dir;
  }
  return a.serviceName.localeCompare(b.serviceName) * dir;
}

export function OpcoRegulatoryFeesView({ initialPage }: OpcoRegulatoryFeesViewProps) {
  const [pageData, setPageData] = useState(initialPage);
  const [draftFees, setDraftFees] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialPage.rows.map((row) => [
        row.id,
        formatFeeDisplay(String(row.regulatoryFeePercent)),
      ]),
    ),
  );
  const [search, setSearch] = useState("");
  const [partnerId, setPartnerId] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("serviceName");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [listPage, setListPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feeInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!editingId) {
      return;
    }
    feeInputRef.current?.focus();
    feeInputRef.current?.select();
  }, [editingId]);

  const partnerOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of pageData.rows) {
      byId.set(row.partnerId, row.partnerName);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pageData.rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pageData.rows
      .filter((row) => {
        if (partnerId !== "all" && row.partnerId !== partnerId) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (
          row.serviceName.toLowerCase().includes(query) ||
          row.partnerName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => compareRows(a, b, sortBy, sortDir));
  }, [pageData.rows, search, partnerId, sortBy, sortDir]);

  const paged = useMemo(
    () => paginateItems(filtered, listPage),
    [filtered, listPage],
  );

  const dirtyUpdates = useMemo(() => {
    const updates: Array<{ mapId: string; regulatoryFeePercent: number }> = [];
    for (const row of pageData.rows) {
      const draft = draftFees[row.id] ?? String(row.regulatoryFeePercent);
      const parsed = parseFeeInput(draft);
      if (parsed === null) {
        continue;
      }
      if (parsed !== row.regulatoryFeePercent) {
        updates.push({ mapId: row.id, regulatoryFeePercent: parsed });
      }
    }
    return updates;
  }, [pageData.rows, draftFees]);

  const applySort = (field: SortField) => {
    const next = nextSortState(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    setListPage(1);
  };

  const syncDrafts = (rows: OpcoRegulatoryFeeRow[]) => {
    setDraftFees(
      Object.fromEntries(
        rows.map((row) => [
          row.id,
          formatFeeDisplay(String(row.regulatoryFeePercent)),
        ]),
      ),
    );
  };

  const clearFilters = () => {
    setSearch("");
    setPartnerId("all");
    setListPage(1);
  };

  const saveChanges = async () => {
    for (const row of pageData.rows) {
      const draft = draftFees[row.id] ?? "";
      if (parseFeeInput(draft) === null) {
        setError(
          `Invalid fee % for "${row.serviceName}". Use a number from 0 to 100 (up to 2 decimals).`,
        );
        return;
      }
    }
    if (dirtyUpdates.length === 0) {
      toast.success("No changes to save.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/opcos/${pageData.opcoId}/regulatory-fees`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: dirtyUpdates }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save regulatory fees"));
      }
      const next = body.data as OpcoRegulatoryFeesPage;
      setPageData(next);
      syncDrafts(next.rows);
      setEditingId(null);
      toast.success(`Saved ${dirtyUpdates.length} service fee(s).`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save regulatory fees",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImportBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/admin/opcos/${pageData.opcoId}/regulatory-fees/import`,
        {
          method: "POST",
          body: formData,
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Import failed"));
      }
      const data = body.data as {
        updated: number;
        issues: Array<{ rowNumber: number; message: string }>;
        page: OpcoRegulatoryFeesPage;
      };
      setPageData(data.page);
      syncDrafts(data.page.rows);
      setEditingId(null);
      const issueNote =
        data.issues.length > 0 ? ` ${data.issues.length} row issue(s).` : "";
      toast.success(`Import complete: ${data.updated} updated.${issueNote}`);
      if (data.issues.length > 0) {
        setError(
          data.issues
            .slice(0, 5)
            .map((issue) => `Row ${issue.rowNumber}: ${issue.message}`)
            .join(" · "),
        );
      }
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Import failed",
      );
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <LoadingOverlay
      active={importBusy}
      label="Importing Excel…"
      className="min-h-[12rem]"
    >
      <PageCard>
        <PageHeader
          title={`Regulatory fees — ${pageData.opcoName}`}
          description="Set regulatory fee % per service (from this OpCo’s Service–Partner maps). Used on the Revenue Share report."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/opcos" className={ui.btnSecondary}>
                Back to OpCos
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  window.location.href = `/api/admin/opcos/${pageData.opcoId}/regulatory-fees/template`;
                }}
              >
                Download template
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={importBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {importBusy ? "Importing…" : "Upload Excel"}
              </Button>
              <Button
                type="button"
                disabled={saving || dirtyUpdates.length === 0}
                onClick={() => void saveChanges()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          }
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImport(file);
            }
          }}
        />

        {error ? <p className={`mt-4 ${ui.alertError}`}>{error}</p> : null}

        <FilterToolbar className="mt-6">
          <div className="flex flex-wrap gap-3">
            <label className="block min-w-[14rem] flex-1 text-sm">
              <span className="sr-only">Search</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setListPage(1);
                }}
                placeholder="Service or partner"
                className={ui.input}
              />
            </label>
            <label className="block min-w-[12rem] text-sm">
              <span className="sr-only">Partner</span>
              <select
                value={partnerId}
                onChange={(event) => {
                  setPartnerId(event.target.value);
                  setListPage(1);
                }}
                className={ui.select}
              >
                <option value="all">All partners</option>
                {partnerOptions.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <FilterActions onClear={clearFilters} />
        </FilterToolbar>

        <div className="mt-6 space-y-4">
          {filtered.length === 0 ? (
            <EmptyState
              title={
                pageData.rows.length === 0
                  ? "No services mapped"
                  : "No services found"
              }
              description={
                pageData.rows.length === 0
                  ? "Add Service–Partner maps for this OpCo first, then set regulatory fees here."
                  : "No services match your filters."
              }
            />
          ) : (
            <>
              <DataTableFrame>
                <DataTable className="table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[28%]" />
                    <col className="w-[28%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <DataTableHead>
                    <tr>
                      <SortableDataTableTh
                        label="Service"
                        active={sortBy === "serviceName"}
                        direction={sortDir}
                        onSort={() => applySort("serviceName")}
                      />
                      <SortableDataTableTh
                        label="Partner"
                        active={sortBy === "partnerName"}
                        direction={sortDir}
                        onSort={() => applySort("partnerName")}
                      />
                      <SortableDataTableTh
                        label="Regulatory fee"
                        active={sortBy === "fee"}
                        direction={sortDir}
                        onSort={() => applySort("fee")}
                      />
                      <DataTableTh>Actions</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {paged.items.map((row) => {
                      const feeText = draftFees[row.id] ?? "0.00";
                      const isEditing = editingId === row.id;
                      return (
                      <DataTableRow key={row.id}>
                        <DataTableTd className="font-medium text-foreground">
                          {row.serviceName}
                        </DataTableTd>
                        <DataTableTd className="text-foreground-muted">
                          {row.partnerName}
                        </DataTableTd>
                        <DataTableTd>
                          <div className="relative w-28">
                            {isEditing ? (
                              <input
                                ref={feeInputRef}
                                type="text"
                                inputMode="decimal"
                                value={feeText}
                                onChange={(event) =>
                                  setDraftFees((current) => ({
                                    ...current,
                                    [row.id]: sanitizeFeeInput(
                                      event.target.value,
                                    ),
                                  }))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    setDraftFees((current) => {
                                      const next = current[row.id] ?? "";
                                      const formatted = formatFeeDisplay(next);
                                      return {
                                        ...current,
                                        [row.id]:
                                          parseFeeInput(next) === null
                                            ? next
                                            : formatted,
                                      };
                                    });
                                    setEditingId(null);
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    setDraftFees((current) => ({
                                      ...current,
                                      [row.id]: formatFeeDisplay(
                                        String(row.regulatoryFeePercent),
                                      ),
                                    }));
                                    setEditingId(null);
                                  }
                                }}
                                className={feeFieldClass}
                                aria-label={`Regulatory fee for ${row.serviceName}`}
                              />
                            ) : (
                              <span
                                className={cn(
                                  feeFieldClass,
                                  "inline-flex cursor-default items-center bg-surface-muted text-foreground",
                                )}
                                aria-label={`Regulatory fee for ${row.serviceName}: ${formatFeeDisplay(feeText)}%`}
                              >
                                {formatFeeDisplay(feeText)}
                              </span>
                            )}
                            <span
                              className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-foreground-muted"
                              aria-hidden
                            >
                              %
                            </span>
                          </div>
                        </DataTableTd>
                        <DataTableTd>
                          <IconButton
                            label={
                              isEditing
                                ? `Done editing fee for ${row.serviceName}`
                                : `Edit fee for ${row.serviceName}`
                            }
                            onClick={() => {
                              if (isEditing) {
                                setDraftFees((current) => {
                                  const next = current[row.id] ?? "";
                                  const formatted = formatFeeDisplay(next);
                                  return {
                                    ...current,
                                    [row.id]:
                                      parseFeeInput(next) === null
                                        ? next
                                        : formatted,
                                  };
                                });
                                setEditingId(null);
                                return;
                              }
                              setEditingId(row.id);
                            }}
                          >
                            <IconPencil />
                          </IconButton>
                        </DataTableTd>
                      </DataTableRow>
                      );
                    })}
                  </tbody>
                </DataTable>
              </DataTableFrame>
              <ListPagination
                total={paged.total}
                page={paged.page}
                totalPages={paged.totalPages}
                noun="service"
                nounPlural="services"
                onPageChange={setListPage}
              />
            </>
          )}
        </div>
      </PageCard>
    </LoadingOverlay>
  );
}
