"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import { PageCard, PageHeader } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import type {
  OpcoPartnerMode,
  OpcoReportMappingView,
} from "@/lib/admin/opco-report-mappings.shared";
import { partnerModeLabel } from "@/lib/admin/opco-report-mappings.shared";
import { formatAppError } from "@/lib/errors/format";
import { ui } from "@/lib/ui/classes";

type OpcoReportMappingFormProps = {
  initialMapping: OpcoReportMappingView;
};

function HeaderOptions({
  prefix,
  headers,
}: {
  prefix: string;
  headers: string[];
}) {
  return headers.map((header, index) => (
    <option key={`${prefix}-${index}`} value={header}>
      {header}
    </option>
  ));
}

export function OpcoReportMappingForm({
  initialMapping,
}: OpcoReportMappingFormProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mapping, setMapping] = useState(initialMapping);
  const [serviceColumn, setServiceColumn] = useState(
    initialMapping.serviceColumn ?? "",
  );
  const [partnerMode, setPartnerMode] = useState<OpcoPartnerMode>(
    initialMapping.partnerMode,
  );
  const [partnerColumn, setPartnerColumn] = useState(
    initialMapping.partnerColumn ?? "",
  );
  const [revenueColumn, setRevenueColumn] = useState(
    initialMapping.revenueColumn ?? "",
  );
  const [revenueShareColumn, setRevenueShareColumn] = useState(
    initialMapping.revenueShareColumn ?? "",
  );
  const [rowFilterColumn, setRowFilterColumn] = useState(
    initialMapping.rowFilterColumn ?? "",
  );
  const [rowFilterValue, setRowFilterValue] = useState(
    initialMapping.rowFilterValue ?? "",
  );
  const [aggregateDailyRows, setAggregateDailyRows] = useState(
    initialMapping.aggregateDailyRows,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectingSheet, setSelectingSheet] = useState(false);

  const headers = mapping.headers;
  const sheetSelected = Boolean(mapping.sampleSheetName);
  const canMapColumns = sheetSelected && headers.length > 0;

  const applyMapping = (next: OpcoReportMappingView) => {
    setMapping(next);
    setServiceColumn(next.serviceColumn ?? "");
    setPartnerMode(next.partnerMode);
    setPartnerColumn(next.partnerColumn ?? "");
    setRevenueColumn(next.revenueColumn ?? "");
    setRevenueShareColumn(next.revenueShareColumn ?? "");
    setRowFilterColumn(next.rowFilterColumn ?? "");
    setRowFilterValue(next.rowFilterValue ?? "");
    setAggregateDailyRows(next.aggregateDailyRows);
  };

  const uploadSample = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/admin/opcos/${mapping.opcoId}/report-mapping/sample`,
        { method: "POST", body: formData },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to upload sample"));
      }
      applyMapping(body.data as OpcoReportMappingView);
      toast.success("Sample uploaded. Confirm the sheet, then map columns.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload sample",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const changeSheet = async (sheetName: string) => {
    if (!sheetName || sheetName === mapping.sampleSheetName) {
      return;
    }
    setError(null);
    setSelectingSheet(true);
    try {
      const response = await fetch(
        `/api/admin/opcos/${mapping.opcoId}/report-mapping`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sampleSheetName: sheetName }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to select sheet"));
      }
      applyMapping(body.data as OpcoReportMappingView);
      toast.success(`Using sheet “${sheetName}”.`);
    } catch (sheetError) {
      setError(
        sheetError instanceof Error
          ? sheetError.message
          : "Failed to select sheet",
      );
    } finally {
      setSelectingSheet(false);
    }
  };

  const saveMapping = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!sheetSelected) {
      setError("Select which Excel sheet to use before saving column mapping.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/opcos/${mapping.opcoId}/report-mapping`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceColumn: serviceColumn || null,
            partnerMode,
            partnerColumn: partnerColumn || null,
            revenueColumn: revenueColumn || null,
            revenueShareColumn: revenueShareColumn || null,
            rowFilterColumn: rowFilterColumn || null,
            rowFilterValue: rowFilterValue || null,
            aggregateDailyRows,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save mapping"));
      }
      applyMapping(body.data as OpcoReportMappingView);
      toast.success("Report column mapping saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save mapping",
      );
    } finally {
      setSaving(false);
    }
  };

  const busy = uploading || saving || selectingSheet;

  return (
    <PageCard>
      <PageHeader
        title={`Report mapping — ${mapping.opcoName}`}
        description="Upload a sample OpCo Excel, choose the sheet tab first, then map Service, Partner, Revenue, and optional Revenue share %."
        actions={
          <Link href="/admin/opcos" className={ui.btnSecondary}>
            Back to OpCos
          </Link>
        }
      />

      {error ? <p className={`mt-4 ${ui.alertError}`}>{error}</p> : null}

      <div className="mt-6 space-y-6">
        <section className={`space-y-3 ${ui.cardPaddingLg}`}>
          <h2 className="text-sm font-semibold text-foreground">Sample Excel</h2>
          <p className="text-sm text-foreground-muted">
            Upload a workbook, then select which sheet supplies the columns.
            {mapping.sampleFileName
              ? ` Current sample: ${mapping.sampleFileName}`
              : " No sample uploaded yet."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadSample(file);
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload sample / template"}
          </Button>

          <label className="block text-sm sm:max-w-lg">
            <FieldLegend required>Sheet</FieldLegend>
            <select
              className={ui.select}
              value={mapping.sampleSheetName ?? ""}
              disabled={busy || mapping.availableSheets.length === 0}
              onChange={(event) => {
                void changeSheet(event.target.value);
              }}
              required
            >
              <option value="">
                {mapping.availableSheets.length === 0
                  ? "Upload a sample first"
                  : "Select sheet tab"}
              </option>
              {mapping.availableSheets.map((sheet) => (
                <option key={sheet.name} value={sheet.name}>
                  {sheet.name}
                  {sheet.headerCount > 0
                    ? ` (${sheet.headerCount} columns)`
                    : " (no headers)"}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-foreground-subtle">
              {selectingSheet
                ? "Loading columns from selected sheet…"
                : "Choose the tab that contains the report line items."}
            </p>
          </label>

          {canMapColumns ? (
            <p className="text-xs text-foreground-subtle">
              Detected {headers.length} column(s)
              {mapping.sampleSheetName
                ? ` from sheet “${mapping.sampleSheetName}”`
                : ""}
              {mapping.sampleHeaderRowNumber
                ? ` (row ${mapping.sampleHeaderRowNumber})`
                : ""}
              : {headers.join(", ")}
            </p>
          ) : (
            <p className="text-xs text-foreground-subtle">
              {mapping.availableSheets.length > 0
                ? "Select a sheet above to load column choices."
                : "Upload a sample to choose a sheet and map columns."}
            </p>
          )}
        </section>

        <form onSubmit={(event) => void saveMapping(event)} className="space-y-6">
          <section className={`space-y-4 ${ui.cardPaddingLg}`}>
            <h2 className="text-sm font-semibold text-foreground">
              Required field mapping
            </h2>

            <label className="block text-sm sm:max-w-lg">
              <FieldLegend required>Service name</FieldLegend>
              <select
                className={ui.select}
                value={serviceColumn}
                onChange={(event) => setServiceColumn(event.target.value)}
                required
                disabled={!canMapColumns || busy}
              >
                <option value="">Select column</option>
                <HeaderOptions prefix="svc" headers={headers} />
                {serviceColumn && !headers.includes(serviceColumn) ? (
                  <option value={serviceColumn}>{serviceColumn} (saved)</option>
                ) : null}
              </select>
            </label>

            <label className="block text-sm sm:max-w-lg">
              <FieldLegend required>Partner</FieldLegend>
              <select
                className={ui.select}
                value={
                  partnerMode === "EXCEL_COLUMN"
                    ? partnerColumn || ""
                    : partnerMode === "SERVICE_PARTNER_MAP"
                      ? "__MODE__:SERVICE_PARTNER_MAP"
                      : ""
                }
                disabled={!canMapColumns || busy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__MODE__:SERVICE_PARTNER_MAP") {
                    setPartnerMode("SERVICE_PARTNER_MAP");
                    setPartnerColumn("");
                    return;
                  }
                  setPartnerMode("EXCEL_COLUMN");
                  setPartnerColumn(value);
                }}
                required
              >
                <option value="">Select column or partner source</option>
                {headers.length > 0 ? (
                  <optgroup label="Excel columns from selected sheet">
                    <HeaderOptions prefix="partner" headers={headers} />
                  </optgroup>
                ) : null}
                {partnerMode === "EXCEL_COLUMN" &&
                partnerColumn &&
                !headers.includes(partnerColumn) ? (
                  <option value={partnerColumn}>
                    {partnerColumn} (saved)
                  </option>
                ) : null}
                <option value="__MODE__:SERVICE_PARTNER_MAP">
                  {partnerModeLabel("SERVICE_PARTNER_MAP")}
                </option>
              </select>
              <p className="mt-1 text-xs text-foreground-subtle">
                {partnerMode === "EXCEL_COLUMN"
                  ? "Partner name is read from the selected Excel column."
                  : partnerMode === "SERVICE_PARTNER_MAP"
                    ? "Partner is resolved from Admin Service–Partner maps using the Service column."
                    : "Select an Excel Partner column, or resolve Partner from the Service–Partner map."}
              </p>
            </label>

            <label className="block text-sm sm:max-w-lg">
              <FieldLegend required>Revenue (gross amount)</FieldLegend>
              <select
                className={ui.select}
                value={revenueColumn}
                onChange={(event) => setRevenueColumn(event.target.value)}
                required
                disabled={!canMapColumns || busy}
              >
                <option value="">Select column</option>
                <HeaderOptions prefix="rev" headers={headers} />
                {revenueColumn && !headers.includes(revenueColumn) ? (
                  <option value={revenueColumn}>
                    {revenueColumn} (saved)
                  </option>
                ) : null}
              </select>
            </label>

            <label className="block text-sm sm:max-w-lg">
              <FieldLegend>Revenue share % (optional)</FieldLegend>
              <select
                className={ui.select}
                value={revenueShareColumn}
                onChange={(event) => setRevenueShareColumn(event.target.value)}
                disabled={!canMapColumns || busy}
              >
                <option value="">Not mapped</option>
                <HeaderOptions prefix="share" headers={headers} />
                {revenueShareColumn && !headers.includes(revenueShareColumn) ? (
                  <option value={revenueShareColumn}>
                    {revenueShareColumn} (saved)
                  </option>
                ) : null}
              </select>
            </label>

            <label className="block text-sm sm:max-w-lg">
              <FieldLegend>Only include rows where (optional)</FieldLegend>
              <select
                className={ui.select}
                value={rowFilterColumn}
                onChange={(event) => setRowFilterColumn(event.target.value)}
                disabled={!canMapColumns || busy}
              >
                <option value="">No row filter</option>
                <HeaderOptions prefix="filter" headers={headers} />
                {rowFilterColumn && !headers.includes(rowFilterColumn) ? (
                  <option value={rowFilterColumn}>
                    {rowFilterColumn} (saved)
                  </option>
                ) : null}
              </select>
            </label>

            {rowFilterColumn ? (
              <label className="block text-sm sm:max-w-lg">
                <FieldLegend required>Equals</FieldLegend>
                <input
                  className={ui.input}
                  value={rowFilterValue}
                  onChange={(event) => setRowFilterValue(event.target.value)}
                  placeholder="Group API"
                  disabled={!canMapColumns || busy}
                />
                <p className="mt-1 text-xs text-foreground-subtle">
                  Other rows are skipped. Match is case-insensitive.
                </p>
              </label>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={aggregateDailyRows}
                onChange={(event) => setAggregateDailyRows(event.target.checked)}
                className="h-4 w-4 accent-primary"
                disabled={busy}
              />
              Aggregate daily rows (sum revenue by service for the period)
            </label>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || !canMapColumns}>
              {saving ? "Saving…" : "Save mapping"}
            </Button>
            <p className="self-center text-xs text-foreground-subtle">
              {mapping.isConfigured
                ? "Mapping looks complete for uploads."
                : "Mapping incomplete — pick a sheet, then Service, Revenue, and Partner."}
            </p>
          </div>
        </form>
      </div>
    </PageCard>
  );
}
