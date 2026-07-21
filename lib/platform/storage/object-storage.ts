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

export class ObjectStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageError";
  }
}

function blobReadWriteToken(): string | undefined {
  const raw = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!raw) return undefined;
  // Guard against accidental quotes when pasting into Vercel UI
  return raw.replace(/^["']|["']$/g, "").trim() || undefined;
}

/**
 * True only when Blob auth is actually available.
 * Having BLOB_STORE_ID alone is not enough — need read-write token or OIDC.
 */
function isBlobStorageEnabled(): boolean {
  if (blobReadWriteToken()) {
    return true;
  }
  return Boolean(
    process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

/** Safe diagnostics for API error payloads (no secrets). */
export function storageDiagnostics(): {
  hasBlobToken: boolean;
  hasBlobStoreId: boolean;
  onVercel: boolean;
} {
  return {
    hasBlobToken: Boolean(blobReadWriteToken()),
    hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID?.trim()),
    onVercel: Boolean(process.env.VERCEL),
  };
}

function sanitizeFilename(filename: string): string {
  const base = path.posix.basename(filename).replace(/[^\w.\-()+ ]+/g, "_");
  return base.length > 0 ? base : "upload.bin";
}

export async function saveStoredObject(
  input: SaveStoredObjectInput,
): Promise<SaveStoredObjectResult> {
  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const storageKey = path.posix.join(
    input.folder,
    randomUUID(),
    sanitizeFilename(input.filename),
  );
  const token = blobReadWriteToken();

  if (isBlobStorageEnabled()) {
    try {
      // Uint8Array avoids rare Buffer/BodyInit issues in serverless runtimes
      const body = new Uint8Array(input.buffer);
      await put(storageKey, body, {
        access: "private",
        addRandomSuffix: false,
        contentType: input.mimeType || undefined,
        multipart: body.byteLength > 4 * 1024 * 1024,
        ...(token ? { token } : {}),
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown blob upload error";
      console.error("Vercel Blob put failed", {
        storageKey,
        detail,
        diagnostics: storageDiagnostics(),
        error,
      });
      throw new ObjectStorageError(
        `File storage (Blob) failed: ${detail}. Ensure BLOB_READ_WRITE_TOKEN is set for Production/Preview and redeployed.`,
      );
    }
  } else if (process.env.VERCEL) {
    throw new ObjectStorageError(
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN on Vercel (Storage → Blob → read-write token), then redeploy.",
    );
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

  if (isBlobStorageEnabled()) {
    return readBlobObject(storageKey);
  }

  if (process.env.VERCEL) {
    throw new ObjectStorageError(
      "File storage is not configured. Set BLOB_READ_WRITE_TOKEN on Vercel.",
    );
  }

  const absolutePath = path.join(process.cwd(), ".uploads", storageKey);
  return readFile(absolutePath);
}

async function readBlobObject(urlOrPathname: string): Promise<Buffer> {
  const token = blobReadWriteToken();
  try {
    const result = await get(urlOrPathname, {
      access: "private",
      ...(token ? { token } : {}),
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new ObjectStorageError("Stored object not found in blob storage");
    }
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  } catch (error) {
    if (error instanceof ObjectStorageError) {
      throw error;
    }
    const detail =
      error instanceof Error ? error.message : "Unknown blob read error";
    console.error("Vercel Blob get failed", {
      urlOrPathname,
      detail,
      diagnostics: storageDiagnostics(),
      error,
    });
    throw new ObjectStorageError(`File storage (Blob) read failed: ${detail}`);
  }
}
