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
