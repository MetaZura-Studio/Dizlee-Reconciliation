import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

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
  const absolutePath = path.join(process.cwd(), ".uploads", file.storageKey);

  try {
    const buffer = await readFile(absolutePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mimeType ?? DEFAULT_REPORT_MIME,
        "Content-Disposition": `inline; filename="${file.filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Report file is not available in local storage." },
      { status: 404 },
    );
  }
}
