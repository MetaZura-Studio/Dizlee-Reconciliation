import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";

export type StorageFolder = "reports" | "invoices" | "notifications";

export type SaveStoredObjectInput = {
  folder: StorageFolder;
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

export type SaveStoredObjectResult = {
  storageKey: string;
  checksum: string;
  sizeBytes: bigint;
};

/**
 * Prefer Vercel Blob when a store is connected; otherwise write under `.uploads/`
 * for local development.
 */
export function useBlobStorage(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return true;
  }
  // Connected Blob store on Vercel (OIDC auth)
  return Boolean(process.env.BLOB_STORE_ID && process.env.VERCEL);
}

export async function saveStoredObject(
  input: SaveStoredObjectInput,
): Promise<SaveStoredObjectResult> {
  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const storageKey = path.posix.join(input.folder, randomUUID(), input.filename);

  if (useBlobStorage()) {
    await put(storageKey, input.buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType: input.mimeType || undefined,
    });
  } else {
    const absolutePath = path.join(process.cwd(), ".uploads", storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.buffer);
  }

  return {
    storageKey,
    checksum,
    sizeBytes: BigInt(input.buffer.byteLength),
  };
}

export async function readStoredObject(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return readBlobObject(storageKey);
  }

  if (useBlobStorage()) {
    return readBlobObject(storageKey);
  }

  const absolutePath = path.join(process.cwd(), ".uploads", storageKey);
  return readFile(absolutePath);
}

async function readBlobObject(urlOrPathname: string): Promise<Buffer> {
  const result = await get(urlOrPathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Stored object not found in blob storage");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
