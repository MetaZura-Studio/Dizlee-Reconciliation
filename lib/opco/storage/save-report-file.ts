/**
 * Persists OpCo-uploaded report binaries under the shared object-storage layout.
 *
 * Portal: OpCo. Storage keys land in the `reports/` folder; DB `File` rows are created
 * by upload mutations, not this helper.
 */

import {
  saveStoredObject,
  type SaveStoredObjectResult,
} from "@/lib/platform/storage/object-storage";

type SaveReportFileInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

export async function saveReportFileLocally(
  input: SaveReportFileInput,
): Promise<SaveStoredObjectResult> {
  return saveStoredObject({
    folder: "reports",
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });
}
