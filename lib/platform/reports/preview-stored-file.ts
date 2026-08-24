/**
 * Streams a stored report/invoice file inline from object storage for preview routes.
 */
import "server-only";

import { NextResponse } from "next/server";

import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

export type StoredFileRecord = {
  filename: string;
  storageKey: string;
  mimeType: string | null;
};

const DEFAULT_REPORT_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function buildStoredFilePreviewResponse(
  file: StoredFileRecord,
): Promise<NextResponse> {
  try {
    const buffer = await readStoredObject(file.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: buildFileResponseHeaders({
        filename: file.filename,
        mimeType: file.mimeType ?? DEFAULT_REPORT_MIME,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Report file is not available in storage." },
      { status: 404 },
    );
  }
}
