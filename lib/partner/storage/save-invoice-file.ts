import {
  saveStoredObject,
  type SaveStoredObjectResult,
} from "@/lib/platform/storage/object-storage";

type SaveInvoiceFileInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

export async function saveInvoiceFileLocally(
  input: SaveInvoiceFileInput,
): Promise<SaveStoredObjectResult> {
  return saveStoredObject({
    folder: "invoices",
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });
}
