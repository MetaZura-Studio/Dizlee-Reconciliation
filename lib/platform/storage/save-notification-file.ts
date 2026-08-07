/**
 * Persists notification broadcast attachments via the shared object-storage layer.
 */
import {
  saveStoredObject,
  type SaveStoredObjectResult,
} from "@/lib/platform/storage/object-storage";

type SaveNotificationFileInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

export async function saveNotificationFileLocally(
  input: SaveNotificationFileInput,
): Promise<SaveStoredObjectResult> {
  return saveStoredObject({
    folder: "notifications",
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });
}
