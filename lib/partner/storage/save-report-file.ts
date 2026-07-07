import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type SaveReportFileInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

type SaveReportFileResult = {
  storageKey: string;
  checksum: string;
  sizeBytes: bigint;
};

export async function saveReportFileLocally(
  input: SaveReportFileInput,
): Promise<SaveReportFileResult> {
  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const storageKey = path.posix.join("reports", randomUUID(), input.filename);
  const absolutePath = path.join(process.cwd(), ".uploads", storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);

  return {
    storageKey,
    checksum,
    sizeBytes: BigInt(input.buffer.byteLength),
  };
}
