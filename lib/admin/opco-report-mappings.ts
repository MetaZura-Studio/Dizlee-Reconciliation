/**
 * Admin CRUD for per-OpCo report column mappings (sample headers + field map).
 */
import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  extractDistinctColumnValues,
  extractExcelHeaderCatalog,
  parseStoredSampleHeaders,
  selectStoredSheet,
  serializeSampleHeaders,
  type StoredSampleHeaders,
} from "@/lib/admin/opco-report-mapping-excel";
import type {
  OpcoPartnerMode,
  OpcoReportMappingView,
} from "@/lib/admin/opco-report-mappings.shared";
import {
  selectOpcoReportMappingSheetSchema,
  updateOpcoReportMappingSchema,
  type SelectOpcoReportMappingSheetInput,
  type UpdateOpcoReportMappingInput,
} from "@/lib/admin/validation/opco-report-mappings";
import { DomainError } from "@/lib/errors/app-error";
import {
  readStoredObject,
  saveStoredObject,
} from "@/lib/platform/storage/object-storage";
import { prisma } from "@/lib/prisma";

export type { OpcoReportMappingView } from "@/lib/admin/opco-report-mappings.shared";

export class OpcoReportMappingError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("OpcoReportMappingError", keyOrMessage, status);
  }
}

function isPartnerMode(value: string): value is OpcoPartnerMode {
  return (
    value === "EXCEL_COLUMN" ||
    value === "SERVICE_PARTNER_MAP" ||
    value === "UPLOAD_PICKER"
  );
}

function keepIfPresent(
  value: string | null | undefined,
  headers: string[],
): string | null {
  if (!value?.trim()) {
    return null;
  }
  return headers.includes(value) ? value : null;
}

function mapView(row: {
  opcoId: bigint;
  serviceColumn: string | null;
  partnerMode: string;
  partnerColumn: string | null;
  revenueColumn: string | null;
  revenueShareColumn: string | null;
  rowFilterColumn: string | null;
  rowFilterValue: string | null;
  aggregateDailyRows: boolean;
  headersJson: string | null;
  sampleFile: { filename: string } | null;
  opco: { name: string };
}): OpcoReportMappingView {
  const partnerMode = isPartnerMode(row.partnerMode)
    ? row.partnerMode
    : "EXCEL_COLUMN";
  const stored = parseStoredSampleHeaders(row.headersJson);
  const isConfigured = Boolean(
    stored.sheetName &&
      row.serviceColumn &&
      row.revenueColumn &&
      row.revenueShareColumn &&
      (partnerMode !== "EXCEL_COLUMN" || row.partnerColumn),
  );

  return {
    opcoId: row.opcoId.toString(),
    opcoName: row.opco.name,
    sampleFileName: row.sampleFile?.filename ?? null,
    sampleSheetName: stored.sheetName,
    sampleHeaderRowNumber: stored.headerRowNumber,
    availableSheets: stored.sheets.map((sheet) => ({
      name: sheet.sheetName,
      headerCount: sheet.headers.length,
    })),
    headers: stored.headers,
    serviceColumn: row.serviceColumn,
    partnerMode,
    partnerColumn: row.partnerColumn,
    revenueColumn: row.revenueColumn,
    revenueShareColumn: row.revenueShareColumn,
    rowFilterColumn: row.rowFilterColumn,
    rowFilterValue: row.rowFilterValue,
    aggregateDailyRows: row.aggregateDailyRows,
    isConfigured,
  };
}

const mappingInclude = {
  opco: { select: { name: true } },
  sampleFile: {
    select: { id: true, filename: true, storageKey: true },
  },
} as const;

async function ensureMappingRow(opcoId: bigint, actorUserId?: bigint) {
  const existing = await prisma.opcoReportMapping.findFirst({
    where: { opcoId },
    include: mappingInclude,
  });
  if (existing) {
    return existing;
  }

  return prisma.opcoReportMapping.create({
    data: {
      opcoId,
      partnerMode: "EXCEL_COLUMN",
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    },
    include: mappingInclude,
  });
}

async function reloadCatalogFromSample(
  storageKey: string,
): Promise<StoredSampleHeaders | null> {
  const buffer = await readStoredObject(storageKey);
  const catalog = await extractExcelHeaderCatalog(buffer);
  if (!catalog) {
    return null;
  }
  return parseStoredSampleHeaders(
    serializeSampleHeaders(catalog.selected, catalog.sheets),
  );
}

export async function getOpcoReportMapping(
  opcoIdRaw: string,
): Promise<OpcoReportMappingView> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoReportMappingError("Invalid OpCo id", 400);
  }
  const opcoId = BigInt(opcoIdRaw);
  const opco = await prisma.opco.findFirst({
    where: { id: opcoId },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new OpcoReportMappingError("OpCo not found", 404);
  }

  const row = await ensureMappingRow(opcoId);
  return mapView(row);
}

export async function uploadOpcoReportMappingSample(params: {
  opcoIdRaw: string;
  actorUserId: bigint;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<OpcoReportMappingView> {
  if (!/^\d+$/.test(params.opcoIdRaw)) {
    throw new OpcoReportMappingError("Invalid OpCo id", 400);
  }
  const opcoId = BigInt(params.opcoIdRaw);
  const opco = await prisma.opco.findFirst({
    where: { id: opcoId },
    select: { id: true },
  });
  if (!opco) {
    throw new OpcoReportMappingError("OpCo not found", 404);
  }

  const catalog = await extractExcelHeaderCatalog(params.buffer);
  if (!catalog) {
    throw new OpcoReportMappingError(
      "Could not read column headers from the Excel file",
      400,
    );
  }

  const saved = await saveStoredObject({
    folder: "opco-report-samples",
    buffer: params.buffer,
    filename: params.filename,
    mimeType: params.mimeType,
  });

  const file = await prisma.file.create({
    data: {
      filename: params.filename,
      storageKey: saved.storageKey,
      mimeType: params.mimeType,
      sizeBytes: saved.sizeBytes,
      checksum: saved.checksum,
      uploadedByUserId: params.actorUserId,
    },
  });

  await ensureMappingRow(opcoId, params.actorUserId);
  const existing = await prisma.opcoReportMapping.findFirst({
    where: { opcoId },
    select: {
      serviceColumn: true,
      partnerColumn: true,
      revenueColumn: true,
      revenueShareColumn: true,
      rowFilterColumn: true,
    },
  });

  const updated = await prisma.opcoReportMapping.update({
    where: { opcoId },
    data: {
      sampleFileId: file.id,
      headersJson: serializeSampleHeaders(catalog.selected, catalog.sheets),
      serviceColumn: keepIfPresent(
        existing?.serviceColumn,
        catalog.selected.headers,
      ),
      partnerColumn: keepIfPresent(
        existing?.partnerColumn,
        catalog.selected.headers,
      ),
      revenueColumn: keepIfPresent(
        existing?.revenueColumn,
        catalog.selected.headers,
      ),
      revenueShareColumn: keepIfPresent(
        existing?.revenueShareColumn,
        catalog.selected.headers,
      ),
      rowFilterColumn: keepIfPresent(
        existing?.rowFilterColumn,
        catalog.selected.headers,
      ),
      updatedByUserId: params.actorUserId,
    },
    include: mappingInclude,
  });

  await writeSettingsAuditLog({
    actorUserId: params.actorUserId,
    action: "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    message: `OpCo report sample uploaded for ${updated.opco.name}`,
    metadata: {
      opcoId: opcoId.toString(),
      headerCount: catalog.selected.headers.length,
      sheetName: catalog.selected.sheetName,
      sheetCount: catalog.sheets.length,
      headerRowNumber: catalog.selected.headerRowNumber,
      filename: params.filename,
    },
  });

  return mapView(updated);
}

export async function selectOpcoReportMappingSheet(
  opcoIdRaw: string,
  rawInput: SelectOpcoReportMappingSheetInput,
  actorUserId: bigint,
): Promise<OpcoReportMappingView> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoReportMappingError("Invalid OpCo id", 400);
  }

  const parsed = selectOpcoReportMappingSheetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OpcoReportMappingError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const opcoId = BigInt(opcoIdRaw);
  const existing = await ensureMappingRow(opcoId, actorUserId);
  let stored = parseStoredSampleHeaders(existing.headersJson);

  if (stored.sheets.length === 0 && existing.sampleFile?.storageKey) {
    const reloaded = await reloadCatalogFromSample(
      existing.sampleFile.storageKey,
    );
    if (reloaded) {
      stored = reloaded;
    }
  }

  const nextStored = selectStoredSheet(stored, parsed.data.sampleSheetName);
  if (!nextStored) {
    throw new OpcoReportMappingError(
      `Sheet "${parsed.data.sampleSheetName}" was not found in the uploaded sample`,
      400,
    );
  }
  if (nextStored.headers.length === 0) {
    throw new OpcoReportMappingError(
      `Sheet "${parsed.data.sampleSheetName}" has no readable column headers`,
      400,
    );
  }

  const updated = await prisma.opcoReportMapping.update({
    where: { opcoId },
    data: {
      headersJson: JSON.stringify(nextStored),
      serviceColumn: keepIfPresent(existing.serviceColumn, nextStored.headers),
      partnerColumn: keepIfPresent(existing.partnerColumn, nextStored.headers),
      revenueColumn: keepIfPresent(existing.revenueColumn, nextStored.headers),
      revenueShareColumn: keepIfPresent(
        existing.revenueShareColumn,
        nextStored.headers,
      ),
      rowFilterColumn: keepIfPresent(existing.rowFilterColumn, nextStored.headers),
      updatedByUserId: actorUserId,
    },
    include: mappingInclude,
  });

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    message: `OpCo report sample sheet selected for ${updated.opco.name}`,
    metadata: {
      opcoId: opcoId.toString(),
      sheetName: nextStored.sheetName,
      headerCount: nextStored.headers.length,
    },
  });

  return mapView(updated);
}

export async function updateOpcoReportMapping(
  opcoIdRaw: string,
  rawInput: UpdateOpcoReportMappingInput,
  actorUserId: bigint,
): Promise<OpcoReportMappingView> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoReportMappingError("Invalid OpCo id", 400);
  }

  const parsed = updateOpcoReportMappingSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new OpcoReportMappingError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const opcoId = BigInt(opcoIdRaw);
  const existing = await ensureMappingRow(opcoId, actorUserId);
  const stored = parseStoredSampleHeaders(existing.headersJson);
  if (!stored.sheetName) {
    throw new OpcoReportMappingError(
      "Select which Excel sheet to use before saving column mapping",
      400,
    );
  }

  const partnerColumn =
    parsed.data.partnerMode === "EXCEL_COLUMN"
      ? parsed.data.partnerColumn
      : null;

  const updated = await prisma.opcoReportMapping.update({
    where: { opcoId },
    data: {
      serviceColumn: parsed.data.serviceColumn,
      partnerMode: parsed.data.partnerMode,
      partnerColumn,
      revenueColumn: parsed.data.revenueColumn,
      revenueShareColumn: parsed.data.revenueShareColumn,
      rowFilterColumn: parsed.data.rowFilterColumn,
      rowFilterValue: parsed.data.rowFilterValue,
      aggregateDailyRows: parsed.data.aggregateDailyRows,
      updatedByUserId: actorUserId,
    },
    include: mappingInclude,
  });

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_OPCO_PARTNER_LINK_UPDATED",
    message: `OpCo report column mapping updated for ${updated.opco.name}`,
    metadata: {
      opcoId: opcoId.toString(),
      partnerMode: parsed.data.partnerMode,
      serviceColumn: parsed.data.serviceColumn,
      revenueColumn: parsed.data.revenueColumn,
      sheetName: stored.sheetName,
    },
  });

  return mapView(updated);
}

export async function getOpcoReportMappingColumnValues(
  opcoIdRaw: string,
  columnHeaderRaw: string,
): Promise<{ values: string[] }> {
  if (!/^\d+$/.test(opcoIdRaw)) {
    throw new OpcoReportMappingError("Invalid OpCo id", 400);
  }

  const columnHeader = columnHeaderRaw.trim();
  if (!columnHeader) {
    throw new OpcoReportMappingError("Select a column to list values from", 400);
  }

  const opcoId = BigInt(opcoIdRaw);
  const row = await prisma.opcoReportMapping.findFirst({
    where: { opcoId },
    select: {
      headersJson: true,
      sampleFileId: true,
      sampleFile: {
        select: { storageKey: true },
      },
    },
  });
  if (!row) {
    throw new OpcoReportMappingError("OpCo report mapping not found", 404);
  }

  const stored = parseStoredSampleHeaders(row.headersJson);
  if (!stored.sheetName) {
    throw new OpcoReportMappingError(
      "Select which Excel sheet to use before choosing filter values",
      400,
    );
  }

  const sheetEntry =
    stored.sheets.find((sheet) => sheet.sheetName === stored.sheetName) ?? null;
  const sheetHeaders = sheetEntry?.headers ?? stored.headers;
  const headerRowNumber =
    sheetEntry?.headerRowNumber ?? stored.headerRowNumber ?? 1;

  if (!sheetHeaders.includes(columnHeader)) {
    throw new OpcoReportMappingError(
      "That column is not available on the selected sample sheet",
      400,
    );
  }

  const storageKey = row.sampleFile?.storageKey;
  if (!storageKey) {
    throw new OpcoReportMappingError(
      row.sampleFileId
        ? "Sample file is no longer available — upload the Excel sample again"
        : "Upload a sample Excel before choosing filter values",
      400,
    );
  }

  const buffer = await readStoredObject(storageKey);
  const values = await extractDistinctColumnValues(buffer, {
    sheetName: stored.sheetName,
    headerRowNumber,
    columnHeader,
  });

  return { values };
}

export async function getOpcoReportMappingByOpcoId(opcoId: bigint) {
  return prisma.opcoReportMapping.findFirst({
    where: { opcoId },
  });
}
